import { MongoServerSelectionError } from "mongodb";
import { Types } from "mongoose";

import { getCloseTrackId, getUserFromField } from "../database";
import {
  getActiveAccounts,
  storeAccountSync,
} from "../database/queries/spotifyAccount";
import { Infos } from "../database/schemas/info";
import { SpotifyAccount } from "../database/schemas/spotifyAccount";
import { RecentlyPlayedTrack } from "../database/schemas/track";
import { User } from "../database/schemas/user";
import { HttpError } from "../tools/apis/queueHttpClient";
import { SpotifyAPI } from "../tools/apis/spotifyApi";
import { SpotifyNotLinkedError } from "../tools/errors/spotify";
import { logger } from "../tools/logger";
import { retryPromise, wait } from "../tools/misc";
import { getTracksAlbumsArtists, storeIterationOfLoop } from "./dbTools";

const RETRY = 10;

// Syncs one Spotify account, its plays go to the history of its owner
const loop = async (account: SpotifyAccount, user: User) => {
  const name = `${user.username}/${account.displayName ?? account.spotifyId}`;
  logger.info(`[${name}]: refreshing...`);

  const url = `/me/player/recently-played?after=${
    account.lastTimestamp - 1000 * 60 * 60 * 2
  }`;
  const spotifyApi = SpotifyAPI.forAccount(account._id.toString());

  const items: RecentlyPlayedTrack[] = [];
  let nextUrl = url;

  do {
    const response = await retryPromise(
      () => spotifyApi.raw(nextUrl),
      RETRY,
      30,
    );
    const { data } = response;
    items.push(...data.items);
    nextUrl = data.next;
  } while (nextUrl);

  const lastTimestamp = Date.now();

  const lastPlayAt = items.reduce<Date | null>((latest, item) => {
    const date = new Date(item.played_at);
    return !latest || date > latest ? date : latest;
  }, null);

  if (items.length === 0) {
    await storeAccountSync(account._id, lastTimestamp, null);
    logger.info(`[${name}]: no new music`);
    return;
  }

  const spotifyTracks = items.map((e) => e.track);
  const { tracks, albums, artists } = await getTracksAlbumsArtists(
    user._id.toString(),
    spotifyTracks,
  );
  const infos: Omit<Infos, "owner">[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const date = new Date(item.played_at);
    const duplicate = await getCloseTrackId(
      user._id.toString(),
      item.track.id,
      date,
      30,
    );
    if (duplicate.length === 0) {
      const isBlacklisted = user.settings.blacklistedArtists.find(
        (a) => a === item.track.artists[0]?.id,
      );
      const [primaryArtist] = item.track.artists;
      if (!primaryArtist) {
        continue;
      }
      infos.push({
        played_at: new Date(item.played_at),
        durationMs: item.track.duration_ms,
        albumId: item.track.album.id,
        primaryArtistId: primaryArtist.id,
        artistIds: item.track.artists.map((e) => e.id),
        id: item.track.id,
        account: account.spotifyId,
        ...(isBlacklisted ? { blacklistedBy: "artist" } : {}),
      });
    }
  }
  await storeIterationOfLoop(
    user._id.toString(),
    tracks,
    albums,
    artists,
    infos,
  );
  await storeAccountSync(account._id, lastTimestamp, lastPlayAt);
  logger.info(
    `[${name}]: ${infos.length} new plays, ${tracks.length} tracks, ${albums.length} albums, ${artists.length} artists`,
  );
};

const WAIT_MS = 120 * 1000;

export const dbLoop = async () => {
  while (true) {
    try {
      const accounts = await getActiveAccounts();
      logger.info(`[DbLoop] starting for ${accounts.length} Spotify accounts`);
      for (const account of accounts) {
        const user = await getUserFromField(
          "_id",
          new Types.ObjectId(account.owner),
          false,
        );
        if (!user) {
          continue;
        }
        try {
          await loop(account, user);
        } catch (error) {
          const name = `${user.username}/${account.displayName ?? account.spotifyId}`;
          if (error instanceof SpotifyNotLinkedError) {
            logger.info(`[${name}]: ${error.message}`);
            continue;
          }
          logger.error(`[${name}]: Error during refresh`, error);
          if (error instanceof HttpError) {
            logger.info("Response of failed request", error.message);
            continue;
          }
          logger.info(
            "There appears to be issues with either your internet connection or Spotify",
          );
        }
      }
    } catch (error) {
      logger.error(error);
      if (error instanceof MongoServerSelectionError) {
        logger.error("Exiting because mongo is unreachable");
        process.exit(1);
      }
    }
    await wait(WAIT_MS);
  }
};
