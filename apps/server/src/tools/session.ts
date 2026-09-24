import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";

import { getPrivateData } from "../database/queries/privateData";
import { getWithDefault } from "./env";

export const SESSION_COOKIE_NAME = "token";
const REMEMBER_ME_DAYS = 30;

async function getJwtPrivateKey() {
  const privateData = await getPrivateData();
  if (!privateData?.jwtPrivateKey) {
    throw new Error("No private data found, cannot sign JWT");
  }
  return privateData.jwtPrivateKey;
}

// Logs the user in. "remember" keeps the session for 30 days, otherwise it
// lasts COOKIE_VALIDITY_MS and ends when the browser is closed.
export async function createSession(
  req: Request,
  res: Response,
  userId: string,
  remember: boolean,
) {
  const expiresIn = remember
    ? `${REMEMBER_ME_DAYS}d`
    : getWithDefault("COOKIE_VALIDITY_MS", "1h");
  const token = sign({ userId }, await getJwtPrivateKey(), {
    expiresIn: expiresIn as `${number}`,
  });
  res.cookie(SESSION_COOKIE_NAME, token, {
    sameSite: "strict",
    httpOnly: true,
    secure: req.secure,
    ...(remember ? { maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 } : {}),
  });
}

// Short-lived signed token carried through the Spotify OAuth redirect, the
// session cookie is not sent back by the browser on the callback (SameSite)
export async function signSpotifyLinkToken(userId: string, state: string) {
  return sign(
    { userId, state, purpose: "spotify-link" },
    await getJwtPrivateKey(),
    { expiresIn: "15m" },
  );
}

export async function verifySpotifyLinkToken(token: string, state: string) {
  const payload = verify(token, await getJwtPrivateKey()) as {
    userId?: unknown;
    state?: unknown;
    purpose?: unknown;
  };
  if (
    payload.purpose !== "spotify-link" ||
    payload.state !== state ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid Spotify link token");
  }
  return payload.userId;
}
