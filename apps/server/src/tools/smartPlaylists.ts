import { PipelineStage, Types } from "mongoose";

import {
  AlbumModel,
  InfosModel,
  LibraryItemModel,
  SmartPlaylistModel,
  SpotifyAccountModel,
  UserModel,
} from "../database/Models";
import { timezoneOf } from "../database/queries/insights";
import { getForgotten } from "../database/queries/social";
import { getBest, ItemType } from "../database/queries/stats";
import {
  SmartPlaylist,
  SmartPlaylistKind,
  SmartPlaylistRefresh,
} from "../database/schemas/smartPlaylist";
import { SpotifyAccount } from "../database/schemas/spotifyAccount";
import { User } from "../database/schemas/user";
import { HttpError } from "./apis/queueHttpClient";
import { SpotifyAPI } from "./apis/spotifyApi";
import { logger } from "./logger";
import { wait } from "./misc";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOP_MS = 30 * 60 * 1000;

const NAMES: Record<SmartPlaylistKind, { en: string; fr: string }> = {
  "top-month": { en: "Top of the month", fr: "Top du mois" },
  "top-year": { en: "Top of the year", fr: "Top de l'année" },
  "top-all": { en: "All-time top", fr: "Top de tous les temps" },
  discoveries: { en: "Recent discoveries", fr: "Découvertes récentes" },
  forgotten: { en: "Forgotten favorites", fr: "Favoris oubliés" },
  night: { en: "Night listening", fr: "Écoute de nuit" },
  year: { en: "Soundtrack of {year}", fr: "Bande-son de {year}" },
  "liked-unplayed": { en: "Liked, never played", fr: "Likés jamais écoutés" },
};

const EXPLAIN: Record<SmartPlaylistKind, { en: string; fr: string }> = {
  "top-month": {
    en: "Your most played tracks of the last 30 days.",
    fr: "Tes titres les plus écoutés des 30 derniers jours.",
  },
  "top-year": {
    en: "Your most played tracks of the last 12 months.",
    fr: "Tes titres les plus écoutés des 12 derniers mois.",
  },
  "top-all": {
    en: "Your most played tracks ever.",
    fr: "Tes titres les plus écoutés depuis toujours.",
  },
  discoveries: {
    en: "Tracks you discovered in the last 30 days.",
    fr: "Les titres découverts ces 30 derniers jours.",
  },
  forgotten: {
    en: "Tracks you loved and have not played for 3 months.",
    fr: "Des titres adorés, pas écoutés depuis 3 mois.",
  },
  night: {
    en: "What you play between 10 PM and 4 AM.",
    fr: "Ce que tu écoutes entre 22 h et 4 h.",
  },
  year: {
    en: "Your most played tracks released in {year}.",
    fr: "Tes titres les plus écoutés sortis en {year}.",
  },
  "liked-unplayed": {
    en: "Liked tracks you never played.",
    fr: "Les titres likés jamais écoutés.",
  },
};

const languageOf = (user: User) =>
  user.settings.language === "fr" ? "fr" : "en";

export function smartPlaylistName(
  user: User,
  kind: SmartPlaylistKind,
  year: number | null,
) {
  const name = NAMES[kind][languageOf(user)].replace("{year}", String(year));
  return `${name} · Your Spotify`;
}

function description(user: User, kind: SmartPlaylistKind, year: number | null) {
  const language = languageOf(user);
  const date = new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeZone: timezoneOf(user),
  }).format(new Date());
  const updated =
    language === "fr"
      ? `Mis à jour par Your Spotify le ${date}.`
      : `Updated by Your Spotify on ${date}.`;
  return `${EXPLAIN[kind][language].replace("{year}", String(year))} ${updated}`;
}

const mostPlayed = (
  match: Record<string, unknown>,
  size: number,
  extra: PipelineStage[] = [],
) =>
  InfosModel.aggregate<{ _id: string }>([
    { $match: { blacklistedBy: { $exists: false }, ...match } },
    ...extra,
    {
      $group: { _id: "$id", plays: { $sum: 1 }, last: { $max: "$played_at" } },
    },
    { $sort: { plays: -1, last: -1 } },
    { $limit: size },
  ]).then((rows) => rows.map((row) => row._id));

// The Spotify track ids a smart playlist is filled with
export async function smartTrackIds(
  user: User,
  kind: SmartPlaylistKind,
  size: number,
  year: number | null,
): Promise<string[]> {
  const now = new Date();
  const best = async (since: Date) => {
    const items = await getBest(ItemType.track, user, since, now, size, 0);
    return items.map((item: any) => item.track.id as string);
  };
  switch (kind) {
    case "top-month":
      return best(new Date(now.getTime() - 30 * DAY_MS));
    case "top-year":
      return best(new Date(now.getTime() - 365 * DAY_MS));
    case "top-all":
      return best(new Date(0));
    case "discoveries": {
      const rows = await InfosModel.aggregate<{ _id: string }>([
        { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
        {
          $group: {
            _id: "$id",
            first: { $min: "$played_at" },
            plays: { $sum: 1 },
          },
        },
        { $match: { first: { $gte: new Date(now.getTime() - 30 * DAY_MS) } } },
        { $sort: { plays: -1, first: -1 } },
        { $limit: size },
      ]);
      return rows.map((row) => row._id);
    }
    case "forgotten": {
      const { tracks } = await getForgotten(user, 90, size);
      return tracks.flatMap((item: any) =>
        item.track?.id ? [item.track.id as string] : [],
      );
    }
    case "night":
      return mostPlayed(
        {
          owner: user._id,
          played_at: { $gte: new Date(now.getTime() - 180 * DAY_MS) },
        },
        size,
        [
          {
            $addFields: {
              hour: {
                $hour: { date: "$played_at", timezone: timezoneOf(user) },
              },
            },
          },
          { $match: { hour: { $in: [22, 23, 0, 1, 2, 3] } } },
        ],
      );
    case "year": {
      const albums = await AlbumModel.distinct("id", {
        release_date: { $regex: `^${year}` },
      });
      return mostPlayed({ owner: user._id, albumId: { $in: albums } }, size);
    }
    case "liked-unplayed": {
      const played = new Set(
        await InfosModel.distinct("id", { owner: user._id }),
      );
      const liked = await LibraryItemModel.find(
        { owner: user._id, type: "track" },
        { id: 1 },
      )
        .sort({ addedAt: -1 })
        .lean();
      return [...new Set(liked.map((item) => item.id))]
        .filter((id) => !played.has(id))
        .slice(0, size);
    }
  }
}

async function fill(
  user: User,
  account: SpotifyAccount,
  smart: Pick<SmartPlaylist, "kind" | "size" | "year" | "playlistId">,
) {
  const ids = await smartTrackIds(user, smart.kind, smart.size, smart.year);
  const api = SpotifyAPI.forAccount(account._id.toString());
  await api.replacePlaylist(
    smart.playlistId,
    ids.map((id) => `spotify:track:${id}`),
  );
  await api.updatePlaylist(smart.playlistId, {
    description: description(user, smart.kind, smart.year),
  });
  return ids.length;
}

export async function createSmartPlaylist(
  user: User,
  account: SpotifyAccount,
  options: {
    kind: SmartPlaylistKind;
    size: number;
    refresh: SmartPlaylistRefresh;
    year: number | null;
  },
) {
  const api = SpotifyAPI.forAccount(account._id.toString());
  const created = await api.createEmptyPlaylist(
    smartPlaylistName(user, options.kind, options.year),
    description(user, options.kind, options.year),
    false,
  );
  const smart = await SmartPlaylistModel.create({
    owner: user._id,
    account: account._id,
    playlistId: created.id,
    kind: options.kind,
    size: options.size,
    refresh: options.refresh,
    year: options.year,
    lastRefreshAt: new Date(),
  });
  const count = await fill(user, account, smart);
  return { smart: smart.toObject(), count };
}

export class SmartPlaylistGoneError extends Error {}

export async function refreshSmartPlaylist(smart: SmartPlaylist) {
  const [user, account] = await Promise.all([
    UserModel.findById(smart.owner).lean(),
    SpotifyAccountModel.findById(smart.account).lean(),
  ]);
  if (!user || !account || account.status !== "active") {
    return 0;
  }
  try {
    const count = await fill(user as User, account, smart);
    await SmartPlaylistModel.updateOne(
      { _id: smart._id },
      { lastRefreshAt: new Date() },
    );
    return count;
  } catch (e) {
    // Deleted from Spotify: stop updating it
    if (e instanceof HttpError && e.status === 404) {
      await SmartPlaylistModel.deleteOne({ _id: smart._id });
      throw new SmartPlaylistGoneError();
    }
    throw e;
  }
}

export async function smartPlaylistsLoop() {
  while (true) {
    try {
      const now = Date.now();
      const due = await SmartPlaylistModel.find({
        $or: [
          { refresh: "daily", lastRefreshAt: { $lt: new Date(now - DAY_MS) } },
          {
            refresh: "weekly",
            lastRefreshAt: { $lt: new Date(now - 7 * DAY_MS) },
          },
          { refresh: { $ne: "never" }, lastRefreshAt: null },
        ],
      }).lean();
      for (const smart of due) {
        try {
          const count = await refreshSmartPlaylist(smart);
          logger.info(`[smart playlists] ${smart.kind}: ${count} tracks`);
        } catch (e) {
          logger.warn(
            `[smart playlists] could not refresh ${smart.playlistId}: ${e instanceof Error ? e.message : e}`,
          );
        }
      }
    } catch (e) {
      logger.warn("[smart playlists] loop error", e);
    }
    await wait(LOOP_MS);
  }
}

export const smartPlaylistsOf = (owner: Types.ObjectId) =>
  SmartPlaylistModel.find({ owner }).sort({ createdAt: -1 }).lean();
