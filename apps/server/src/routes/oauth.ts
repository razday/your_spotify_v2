import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import {
  getUserFromField,
  linkSpotifyAccount,
  userHasPassword,
} from "../database";
import { spotifyHttpClientFactory } from "../tools/apis/queuedHttpClient.providers";
import {
  HttpError,
  RateLimitedError,
  USER_FACING_MAX_RETRY_AFTER_MS,
} from "../tools/apis/queueHttpClient";
import { SpotifyMe } from "../tools/apis/spotifyApi";
import { get } from "../tools/env";
import { logger } from "../tools/logger";
import {
  logged,
  loginRateLimit,
  optionalLogged,
  validate,
  withHttpClient,
} from "../tools/middleware";
import { spotifyProvider } from "../tools/oauth/Provider";
import {
  createSession,
  signSpotifyLinkToken,
  verifySpotifyLinkToken,
} from "../tools/session";
import { OptionalLoggedRequest, SpotifyRequest } from "../tools/types";

export const router = Router();

const OAUTH_COOKIE_NAME = "oauth";
const spotifyCallbackOAuthCookie = z.object({
  state: z.string(),
  // Set when a logged user links their Spotify account
  link: z.string().optional(),
});
type OAuthCookie = z.infer<typeof spotifyCallbackOAuthCookie>;

// Starts the Spotify authorization. Logged users link their Spotify account.
// Users that are not logged can only use it to log into an account created
// before local accounts existed (no password yet).
router.get("/spotify", loginRateLimit, optionalLogged, async (req, res) => {
  const { user } = req as OptionalLoggedRequest;

  const isOffline = get("OFFLINE_DEV_ID");
  if (isOffline) {
    await createSession(req, res, isOffline, false);
    res.status(204).end();
    return;
  }

  const { url, state } = await spotifyProvider.getRedirect();
  const oauthCookie: OAuthCookie = {
    state,
    link: user
      ? await signSpotifyLinkToken(user._id.toString(), state)
      : undefined,
  };

  res.cookie(OAUTH_COOKIE_NAME, oauthCookie, {
    sameSite: "lax",
    httpOnly: true,
    secure: req.secure,
  });

  res.redirect(url);
});

const spotifyCallback = z.object({ code: z.string(), state: z.string() });

// Reason of a failed Spotify authorization, shown by the client
function failureReason(error: unknown) {
  if (error instanceof RateLimitedError) {
    return {
      reason: "rate_limited",
      retryAfter: Math.max(1, Math.ceil(error.retryAfterMs / 1000)),
    };
  }
  if (error instanceof HttpError && error.status === 403) {
    // Spotify apps in development mode only accept allowlisted users
    return { reason: "not_registered" };
  }
  return { reason: "unknown" };
}

function clientUrl(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(`${get("CLIENT_ENDPOINT")}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value.toString());
    }
  });
  return url.toString();
}

class LinkRefusedError extends Error {
  constructor(public readonly reason: string) {
    super(`Spotify link refused: ${reason}`);
  }
}

router.get("/spotify/callback", async (req, res) => {
  const { code, state } = validate(req.query, spotifyCallback);

  let linkingUserId: string | undefined;
  let redirectTo: string;
  try {
    const cookie = spotifyCallbackOAuthCookie.parse(
      req.cookies[OAUTH_COOKIE_NAME],
    );
    if (state !== cookie.state) {
      throw new Error("State does not match");
    }
    if (cookie.link) {
      linkingUserId = await verifySpotifyLinkToken(cookie.link, state);
    }

    // Exchanging the code goes through the same queue as every Spotify call,
    // don't make the user wait behind a long Retry-After.
    const rateLimitRemainingMs =
      spotifyHttpClientFactory.getRateLimitRemainingMs();
    if (rateLimitRemainingMs > USER_FACING_MAX_RETRY_AFTER_MS) {
      throw new RateLimitedError(rateLimitRemainingMs);
    }

    const infos = await spotifyProvider.exchangeCode(code, cookie.state);
    const client = spotifyProvider.getHttpClient(infos.accessToken);
    const { data: spotifyMe } = await client.get<SpotifyMe>("/me", {
      priority: "high",
      maxRetryAfterMs: USER_FACING_MAX_RETRY_AFTER_MS,
    });
    const linkInfos = {
      ...infos,
      spotifyId: spotifyMe.id,
      spotifyAccount: {
        displayName: spotifyMe.display_name ?? null,
        email: spotifyMe.email ?? null,
        product: spotifyMe.product ?? null,
      },
    };
    const owner = await getUserFromField("spotifyId", spotifyMe.id, false);

    if (linkingUserId) {
      if (owner && owner._id.toString() !== linkingUserId) {
        throw new LinkRefusedError("already_linked");
      }
      await linkSpotifyAccount(new Types.ObjectId(linkingUserId), linkInfos);
      logger.info(`Spotify account ${spotifyMe.id} linked`);
      redirectTo = clientUrl("/", { spotify: "linked" });
    } else {
      // Login with Spotify, only for accounts that have no password yet
      if (!owner) {
        throw new LinkRefusedError("no_account");
      }
      if (await userHasPassword(owner._id)) {
        throw new LinkRefusedError("use_password");
      }
      await linkSpotifyAccount(owner._id, linkInfos);
      await createSession(req, res, owner._id.toString(), false);
      redirectTo = clientUrl("/settings/account", { set_password: 1 });
    }
  } catch (e) {
    logger.error(e);
    const { reason, retryAfter } =
      e instanceof LinkRefusedError
        ? { reason: e.reason, retryAfter: undefined }
        : failureReason(e);
    // Never send the user back to something that starts a new authorization
    // by itself: a failing authorization would loop forever
    redirectTo = linkingUserId
      ? clientUrl("/", { link_error: reason, retry_after: retryAfter })
      : clientUrl("/login", { error: reason, retry_after: retryAfter });
  } finally {
    res.clearCookie(OAUTH_COOKIE_NAME);
  }
  return res.redirect(redirectTo);
});

router.get("/spotify/me", logged, withHttpClient, async (req, res) => {
  const { client } = req as SpotifyRequest;

  try {
    const me = await client.me();
    res.status(200).send(me);
  } catch (e) {
    logger.error(e);
    res.status(500).send({ code: "SPOTIFY_ERROR" });
  }
});
