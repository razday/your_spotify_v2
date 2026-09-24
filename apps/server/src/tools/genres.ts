import { ArtistModel } from "../database/Models";
import { logger } from "./logger";
import { wait } from "./misc";
import { Version } from "./version";

// Spotify does not give genres to apps in development mode anymore, they
// are taken from MusicBrainz, which finds artists by their Spotify link.
// MusicBrainz asks for at most one request per second and a user agent.
const API = "https://musicbrainz.org/ws/2";
const REQUEST_INTERVAL_MS = 1100;
const BATCH = 30;
const IDLE_MS = 10 * 60 * 1000;
const RETRY_EMPTY_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_GENRES = 6;
// Tags are free text, some of them are not genres
const NOT_GENRES = new Set([
  "seen live",
  "favorites",
  "favourite",
  "male vocalists",
  "female vocalists",
  "under 2000 listeners",
  "spotify",
]);

const userAgent = () =>
  `YourSpotifyV2/${Version.thisOne().toString()} ( https://github.com/razday/your_spotify_v2 )`;

class MusicBrainzUnavailable extends Error {}

async function request<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
  });
  await wait(REQUEST_INTERVAL_MS);
  if (response.status === 404) {
    return null;
  }
  if (response.status === 503 || response.status === 429) {
    throw new MusicBrainzUnavailable(`MusicBrainz answered ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`MusicBrainz answered ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchGenresOfSpotifyArtist(spotifyId: string) {
  const resource = encodeURIComponent(
    `https://open.spotify.com/artist/${spotifyId}`,
  );
  const url = await request<{ relations?: { artist?: { id: string } }[] }>(
    `/url?resource=${resource}&inc=artist-rels&fmt=json`,
  );
  const mbid = url?.relations?.find((r) => r.artist)?.artist?.id;
  if (!mbid) {
    return [];
  }
  type Tag = { name: string; count: number };
  const artist = await request<{ genres?: Tag[]; tags?: Tag[] }>(
    `/artist/${mbid}?inc=genres+tags&fmt=json`,
  );
  // Curated genres first, the community tags when there is none
  const genres =
    artist?.genres && artist.genres.length > 0
      ? artist.genres
      : (artist?.tags ?? []).filter(
          (tag) => !NOT_GENRES.has(tag.name.toLowerCase()),
        );
  return genres
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_GENRES)
    .map((g) => g.name.toLowerCase());
}

async function enrichBatch() {
  const artists = await ArtistModel.find(
    {
      $or: [
        { genresFetchedAt: { $exists: false } },
        { genresFetchedAt: null },
        {
          genres: { $size: 0 },
          genresFetchedAt: { $lt: new Date(Date.now() - RETRY_EMPTY_AFTER_MS) },
        },
      ],
    },
    { id: 1, name: 1 },
  )
    .limit(BATCH)
    .lean();

  for (const artist of artists) {
    const genres = await fetchGenresOfSpotifyArtist(artist.id);
    await ArtistModel.updateOne(
      { id: artist.id },
      { genres, genresFetchedAt: new Date() },
    );
    if (genres.length > 0) {
      logger.debug(`[genres] ${artist.name}: ${genres.join(", ")}`);
    }
  }
  return artists.length;
}

export async function genresLoop() {
  while (true) {
    try {
      const done = await enrichBatch();
      if (done > 0) {
        logger.info(`[genres] looked up ${done} artists on MusicBrainz`);
        continue;
      }
    } catch (error) {
      logger.warn(
        `[genres] MusicBrainz lookup paused: ${error instanceof Error ? error.message : error}`,
      );
    }
    await wait(IDLE_MS);
  }
}
