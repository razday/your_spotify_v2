import { hrtime } from "process";

import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { Types } from "mongoose";
import { z } from "zod";

import { getUserFromField, getGlobalPreferences } from "../database";
import { getUserImporterState } from "../database/queries/importer";
import { getPrivateData } from "../database/queries/privateData";
import { hasUsableAccount } from "../database/queries/spotifyAccount";
import { spotifyHttpClientFactory } from "./apis/queuedHttpClient.providers";
import { USER_FACING_MAX_RETRY_AFTER_MS } from "./apis/queueHttpClient";
import { SpotifyAPI } from "./apis/spotifyApi";
import { AttemptLimiter } from "./attemptLimiter";
import { get } from "./env";
import { YourSpotifyError } from "./errors/error";
import { logger } from "./logger";
import { Metrics } from "./metrics";
import {
  GlobalPreferencesRequest,
  LoggedRequest,
  OptionalLoggedRequest,
  SpotifyRequest,
} from "./types";

export class ValidationError extends YourSpotifyError {
  type = "MALFORMED" as const;

  constructor(validationError: Error) {
    super("Validation error", { cause: validationError });
  }
}

class NotLoggedError extends YourSpotifyError {
  type = "UNAUTHORIZED" as const;
  code = "NOT_LOGGED";
}

class NotAdminError extends YourSpotifyError {
  type = "FORBIDDEN" as const;
  code = "NOT_ADMIN";
}

export const validate = <
  Z extends z.ZodObject | z.ZodDiscriminatedUnion<any, any>,
>(
  payload: any,
  schema: Z,
): z.infer<Z> => {
  try {
    let value;
    if ("extend" in schema) {
      value = schema.extend({ token: z.string().optional() }).parse(payload);
    } else {
      value = schema
        .and(z.object({ token: z.string().optional() }))
        .parse(payload);
    }
    return value;
  } catch (e) {
    logger.error(e);
    throw new ValidationError(e);
  }
};

const baselogged = async (req: Request, useQueryToken = false) => {
  const { token: queryToken } = req.query;

  if (useQueryToken && queryToken && typeof queryToken === "string") {
    const user = await getUserFromField("publicToken", queryToken, false);
    if (user) {
      return user;
    }
  }

  const auth = req.cookies.token;
  if (!auth) {
    return null;
  }

  try {
    const privateData = await getPrivateData();
    if (!privateData?.jwtPrivateKey) {
      throw new Error("No private data found, cannot sign JWT");
    }
    const jwtUser = verify(auth, privateData.jwtPrivateKey) as {
      userId: string;
    };

    if (typeof jwtUser.userId !== "string") {
      return null;
    }

    const user = await getUserFromField(
      "_id",
      new Types.ObjectId(jwtUser.userId),
      false,
    );

    if (!user) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

export const logged = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await baselogged(req, false);
  if (!user) {
    throw new NotLoggedError();
  }
  (req as LoggedRequest).user = user;
  next();
};

export const isLoggedOrGuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await baselogged(req, true);
  if (!user) {
    throw new NotLoggedError();
  }
  (req as LoggedRequest).user = user;
  next();
};

export const optionalLoggedOrGuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await baselogged(req, true);
  (req as OptionalLoggedRequest).user = user;
  next();
};

export const optionalLogged = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await baselogged(req, false);
  (req as OptionalLoggedRequest).user = user;
  next();
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req as LoggedRequest;

  if (!user) {
    throw new NotLoggedError();
  }

  if (!user.admin) {
    throw new NotAdminError();
  }
  next();
};

let spotifyAuthorizations: AttemptLimiter | undefined;

// Optional limit of Spotify authorizations (GET /oauth/spotify) per client
// IP, so a misbehaving client or someone spamming the button can't burn the
// Spotify app quota.
export const loginRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const maxAttempts = get("LOGIN_RATE_LIMIT_PER_MINUTE");
  if (!maxAttempts || maxAttempts <= 0) {
    next();
    return;
  }
  spotifyAuthorizations ??= new AttemptLimiter(maxAttempts, 60_000);

  const key = req.ip ?? "unknown";
  const retryAfter = spotifyAuthorizations.retryAfterSeconds(key);
  if (retryAfter > 0) {
    logger.warn(`Too many Spotify authorizations from ${key}`);
    const url = new URL(`${get("CLIENT_ENDPOINT")}/login`);
    url.searchParams.set("error", "too_many_attempts");
    url.searchParams.set("retry_after", retryAfter.toString());
    res.redirect(url.toString());
    return;
  }
  spotifyAuthorizations.record(key);
  next();
};

export const withHttpClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { user } = req as LoggedRequest;

  if (!(await hasUsableAccount(user._id))) {
    res.status(409).send({ code: "SPOTIFY_NOT_LINKED" });
    return;
  }

  // Answer right away instead of letting the request hang until Spotify's
  // Retry-After is over (which can be hours when the app quota is exceeded).
  const rateLimitRemainingMs =
    spotifyHttpClientFactory.getRateLimitRemainingMs();
  if (rateLimitRemainingMs > USER_FACING_MAX_RETRY_AFTER_MS) {
    res
      .status(429)
      .send({
        code: "SPOTIFY_RATE_LIMITED",
        retryAfter: Math.ceil(rateLimitRemainingMs / 1000),
      });
    return;
  }

  const client = new SpotifyAPI(user._id.toString());
  (req as SpotifyRequest & LoggedRequest).client = client;
  next();
};

export const withGlobalPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pref = await getGlobalPreferences();
    if (!pref) {
      logger.error(
        "No global preferences, this is critical, try restarting the app",
      );
      return;
    }
    (req as GlobalPreferencesRequest).globalPreferences = pref;
    next();
  } catch {
    res.status(500).end();
  }
};

class AlreadyImportingError extends YourSpotifyError {
  type = "CONFLICT" as const;
  code = "ALREADY_IMPORTING";
}

export const notAlreadyImporting = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { user } = req as LoggedRequest;
  const imports = await getUserImporterState(user._id.toString());
  if (imports.some((imp) => imp.status === "progress")) {
    throw new AlreadyImportingError();
  }
  next();
};

const MEASURE_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

export const measureRequestDuration = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!MEASURE_METHODS.includes(req.method)) {
    return next();
  }
  const endpoint = req.path;
  const start = hrtime.bigint();
  res.on("finish", () => {
    const duration = Number(hrtime.bigint() - start);
    Metrics.httpRequestDurationNanoseconds
      .labels(req.method, endpoint, res.statusCode.toString())
      .set(duration);
    Metrics.httpRequestsTotal
      .labels(req.method, endpoint, res.statusCode.toString())
      .inc();
  });
  next();
};

class AffinityNotAllowedError extends YourSpotifyError {
  type = "UNAUTHORIZED" as const;
  code = "AFFINITY_NOT_ALLOWED";

  constructor() {
    super("Affinity is not allowed");
  }
}

export const affinityAllowed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const globalPreferences = await getGlobalPreferences();
  if (!globalPreferences?.allowAffinity) {
    throw new AffinityNotAllowedError();
  }
  next();
};
