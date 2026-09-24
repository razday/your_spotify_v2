import { PrivateDataModel, SpotifyAccountModel } from "../../database/Models";
import { logger } from "../logger";
import { credentials } from "./credentials";
import { spotifyProvider } from "./Provider";

async function storedApp() {
  const data = await PrivateDataModel.findOne(
    {},
    { spotifyClientId: 1, spotifyClientSecret: 1 },
  ).lean();
  return data?.spotifyClientId && data.spotifyClientSecret
    ? { clientId: data.spotifyClientId, clientSecret: data.spotifyClientSecret }
    : null;
}

// At start: the app saved by an admin wins over the environment
export async function loadSpotifyApp() {
  const stored = await storedApp();
  if (stored) {
    spotifyProvider.setCredentials(stored.clientId, stored.clientSecret);
    logger.info("Using the Spotify app configured in the settings");
  } else if (!spotifyProvider.isConfigured()) {
    logger.warn(
      "No Spotify app configured, set SPOTIFY_PUBLIC and SPOTIFY_SECRET or configure it in the admin settings",
    );
  }
}

export async function getSpotifyAppInfo() {
  const stored = await storedApp();
  return {
    clientId: spotifyProvider.getClientId() ?? null,
    configured: spotifyProvider.isConfigured(),
    source: stored ? ("settings" as const) : ("environment" as const),
    environmentClientId: credentials.spotify.public ?? null,
    redirectUri: spotifyProvider.getRedirectUri(),
  };
}

// Asks Spotify for an app token: only valid credentials get one
export async function verifySpotifyApp(clientId: string, clientSecret: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  return response.ok;
}

// Tokens belong to the app that issued them: after a change of app every
// account has to be linked again
async function applyApp(clientId: string, clientSecret: string) {
  const previous = spotifyProvider.getClientId();
  spotifyProvider.setCredentials(clientId, clientSecret);
  if (previous && previous !== clientId) {
    const { modifiedCount } = await SpotifyAccountModel.updateMany(
      { status: "active" },
      {
        status: "expired",
        accessToken: null,
        refreshToken: null,
        expiresIn: 0,
      },
    );
    logger.warn(
      `Spotify app changed, ${modifiedCount} account(s) have to be linked again`,
    );
  }
}

export async function saveSpotifyApp(clientId: string, clientSecret?: string) {
  const secret =
    clientSecret ??
    ((await storedApp())?.clientId === clientId
      ? (await storedApp())?.clientSecret
      : clientId === credentials.spotify.public
        ? credentials.spotify.secret
        : undefined);
  if (!secret) {
    return { ok: false as const, code: "SECRET_REQUIRED" };
  }
  if (!(await verifySpotifyApp(clientId, secret))) {
    return { ok: false as const, code: "INVALID_SPOTIFY_APP" };
  }
  await PrivateDataModel.updateOne(
    {},
    { spotifyClientId: clientId, spotifyClientSecret: secret },
  );
  await applyApp(clientId, secret);
  return { ok: true as const };
}

// Back to SPOTIFY_PUBLIC / SPOTIFY_SECRET
export async function resetSpotifyApp() {
  await PrivateDataModel.updateOne(
    {},
    { spotifyClientId: null, spotifyClientSecret: null },
  );
  if (credentials.spotify.public && credentials.spotify.secret) {
    await applyApp(credentials.spotify.public, credentials.spotify.secret);
  }
}
