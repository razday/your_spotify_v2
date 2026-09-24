import { Types } from "mongoose";

import {
  InfosModel,
  LibraryItemModel,
  SpotifyAccountModel,
} from "../database/Models";
import {
  timezoneOf,
  tracksWithAlbumAndArtist,
} from "../database/queries/insights";
import { LibraryItem, LibraryItemType } from "../database/schemas/libraryItem";
import { SpotifyAccount } from "../database/schemas/spotifyAccount";
import { User } from "../database/schemas/user";
import { SpotifyAPI } from "./apis/spotifyApi";
import { logger } from "./logger";
import { wait } from "./misc";

export const LIBRARY_READ = "user-library-read";
export const LIBRARY_MODIFY = "user-library-modify";

const SYNC_EVERY_MS = 6 * 60 * 60 * 1000;
const LOOP_MS = 15 * 60 * 1000;

const TYPES: LibraryItemType[] = ["track", "album"];

function toLibraryItem(
  owner: Types.ObjectId,
  account: string,
  type: LibraryItemType,
  entry: { added_at: string; item: any },
): LibraryItem {
  const { item } = entry;
  const album = type === "track" ? item.album : item;
  return {
    owner,
    account,
    type,
    id: item.id,
    addedAt: new Date(entry.added_at),
    name: item.name ?? "",
    artists: (item.artists ?? []).map((a: any) => ({ id: a.id, name: a.name })),
    album:
      type === "track" && album ? { id: album.id, name: album.name } : null,
    image: album?.images?.[0]?.url ?? null,
    durationMs: type === "track" ? (item.duration_ms ?? null) : null,
    releaseDate: album?.release_date ?? null,
  };
}

async function storeItems(items: LibraryItem[]) {
  if (items.length === 0) {
    return;
  }
  await LibraryItemModel.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { account: item.account, type: item.type, id: item.id },
        update: { $set: item },
        upsert: true,
      },
    })),
  );
}

// Mirrors the liked tracks and saved albums of an account. Only reads the
// whole library when it changed since the last sync
export async function syncLibrary(account: SpotifyAccount) {
  if (!account.scopes.includes(LIBRARY_READ)) {
    return;
  }
  const api = SpotifyAPI.forAccount(account._id.toString());
  for (const type of TYPES) {
    const first = await api.savedItems(type, 1);
    const [newest] = await LibraryItemModel.find(
      { account: account.spotifyId, type },
      { id: 1 },
    )
      .sort({ addedAt: -1 })
      .limit(1)
      .lean();
    const count = await LibraryItemModel.countDocuments({
      account: account.spotifyId,
      type,
    });
    if (count === first.total && newest?.id === first.items[0]?.item.id) {
      continue;
    }
    const all = await api.savedItems(type);
    const items = all.items.map((entry) =>
      toLibraryItem(account.owner, account.spotifyId, type, entry),
    );
    await storeItems(items);
    await LibraryItemModel.deleteMany({
      account: account.spotifyId,
      type,
      id: { $nin: items.map((item) => item.id) },
    });
    logger.info(
      `[library] ${account.displayName ?? account.spotifyId}: ${items.length} ${type}s`,
    );
  }
  await SpotifyAccountModel.updateOne(
    { _id: account._id },
    { librarySyncAt: new Date() },
  );
}

// Only the newest items, after a change made from the app
async function syncNewest(account: SpotifyAccount, type: LibraryItemType) {
  const api = SpotifyAPI.forAccount(account._id.toString());
  const { items } = await api.savedItems(type, 1);
  await storeItems(
    items.map((entry) =>
      toLibraryItem(account.owner, account.spotifyId, type, entry),
    ),
  );
}

export async function libraryLoop() {
  while (true) {
    try {
      const due = await SpotifyAccountModel.find({
        status: "active",
        scopes: LIBRARY_READ,
        $or: [
          { librarySyncAt: null },
          { librarySyncAt: { $lt: new Date(Date.now() - SYNC_EVERY_MS) } },
        ],
      }).lean();
      for (const account of due) {
        try {
          await syncLibrary(account);
        } catch (e) {
          logger.warn(
            `[library] could not sync ${account.spotifyId}: ${e instanceof Error ? e.message : e}`,
          );
        }
      }
    } catch (e) {
      logger.warn("[library] loop error", e);
    }
    await wait(LOOP_MS);
  }
}

export async function syncLibraryOfUser(owner: Types.ObjectId) {
  const accounts = await SpotifyAccountModel.find({
    owner,
    status: "active",
    scopes: LIBRARY_READ,
  }).lean();
  for (const account of accounts) {
    await syncLibrary(account);
  }
}

export async function likedIds(owner: Types.ObjectId) {
  const [tracks, albums] = await Promise.all(
    TYPES.map((type) => LibraryItemModel.distinct("id", { owner, type })),
  );
  return { tracks: tracks ?? [], albums: albums ?? [] };
}

// The account a like goes to: the primary one when it can, else any
async function modifiableAccount(owner: Types.ObjectId) {
  const accounts = await SpotifyAccountModel.find({
    owner,
    status: "active",
    scopes: LIBRARY_MODIFY,
  })
    .sort({ primary: -1, linkedAt: 1 })
    .lean();
  return accounts[0] ?? null;
}

export class LibraryScopeMissingError extends Error {}

export async function saveToLibrary(
  owner: Types.ObjectId,
  type: LibraryItemType,
  ids: string[],
) {
  const account = await modifiableAccount(owner);
  if (!account) {
    throw new LibraryScopeMissingError();
  }
  await SpotifyAPI.forAccount(account._id.toString()).setInLibrary(
    ids.map((id) => `spotify:${type}:${id}`),
    true,
  );
  // A bulk like goes past the first page: read everything again
  await (ids.length > 50 ? syncLibrary(account) : syncNewest(account, type));
}

// Removed from every account that has it
export async function removeFromLibrary(
  owner: Types.ObjectId,
  type: LibraryItemType,
  ids: string[],
) {
  const accounts = await SpotifyAccountModel.find({
    owner,
    status: "active",
    scopes: LIBRARY_MODIFY,
  }).lean();
  if (accounts.length === 0) {
    throw new LibraryScopeMissingError();
  }
  for (const account of accounts) {
    const saved = await LibraryItemModel.distinct("id", {
      account: account.spotifyId,
      type,
      id: { $in: ids },
    });
    if (saved.length === 0) {
      continue;
    }
    await SpotifyAPI.forAccount(account._id.toString()).setInLibrary(
      saved.map((id) => `spotify:${type}:${id}`),
      false,
    );
    await LibraryItemModel.deleteMany({
      account: account.spotifyId,
      type,
      id: { $in: saved },
    });
  }
}

const lightItem = (item: LibraryItem, plays?: number) => ({
  id: item.id,
  name: item.name,
  artists: item.artists,
  album: item.album,
  image: item.image,
  durationMs: item.durationMs,
  addedAt: item.addedAt,
  account: item.account,
  plays: plays ?? 0,
});

// Liked tracks once, the oldest like kept when several accounts have it
function uniqueById(items: LibraryItem[]) {
  const byId = new Map<string, LibraryItem>();
  for (const item of items) {
    const known = byId.get(item.id);
    if (!known || known.addedAt > item.addedAt) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

const PLAYED_A_LOT = 5;

export async function librarySummary(user: User) {
  const owner = user._id;
  const [tracks, albums, playRows, accounts] = await Promise.all([
    LibraryItemModel.find({ owner, type: "track" }).lean(),
    LibraryItemModel.find({ owner, type: "album" }).lean(),
    InfosModel.aggregate<{ _id: string; plays: number }>([
      { $match: { owner, blacklistedBy: { $exists: false } } },
      { $group: { _id: "$id", plays: { $sum: 1 } } },
    ]),
    SpotifyAccountModel.find({ owner }).lean(),
  ]);
  const liked = uniqueById(tracks);
  const saved = uniqueById(albums);
  const plays = new Map(playRows.map((row) => [row._id, row.plays]));
  const likedSet = new Set(liked.map((item) => item.id));
  const totalPlays = playRows.reduce((sum, row) => sum + row.plays, 0);
  const likedPlays = liked.reduce(
    (sum, item) => sum + (plays.get(item.id) ?? 0),
    0,
  );

  const byNewest = [...liked].sort(
    (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
  );
  const neverPlayed = byNewest.filter((item) => !plays.has(item.id));

  const notLikedRows = playRows
    .filter((row) => row.plays >= PLAYED_A_LOT && !likedSet.has(row._id))
    .sort((a, b) => b.plays - a.plays);
  const notLikedTracks = await tracksWithAlbumAndArtist(
    notLikedRows.slice(0, 30).map((row) => row._id),
  );

  const timezone = timezoneOf(user);
  const perMonth = new Map<string, number>();
  for (const item of liked) {
    const month = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).format(item.addedAt);
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }

  return {
    accounts: accounts.map((account) => ({
      id: account._id.toString(),
      spotifyId: account.spotifyId,
      displayName: account.displayName,
      canRead: account.scopes.includes(LIBRARY_READ),
      canModify: account.scopes.includes(LIBRARY_MODIFY),
      syncedAt: account.librarySyncAt,
    })),
    likedTracks: liked.length,
    savedAlbums: saved.length,
    likedShare: totalPlays > 0 ? likedPlays / totalPlays : 0,
    likesPerMonth: [...perMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
    recent: byNewest
      .slice(0, 12)
      .map((item) => lightItem(item, plays.get(item.id))),
    oldest: [...byNewest]
      .reverse()
      .slice(0, 12)
      .map((item) => lightItem(item, plays.get(item.id))),
    neverPlayed: {
      total: neverPlayed.length,
      items: neverPlayed.slice(0, 30).map((item) => lightItem(item)),
    },
    notLiked: {
      total: notLikedRows.length,
      minPlays: PLAYED_A_LOT,
      items: notLikedRows.slice(0, 30).flatMap((row) => {
        const track = notLikedTracks.get(row._id);
        return track ? [{ ...track, plays: row.plays }] : [];
      }),
    },
    albums: [...saved]
      .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      .slice(0, 24)
      .map((item) => lightItem(item)),
  };
}

// Likes the tracks played at least minPlays times that are not liked yet
export async function likePlayedTracks(user: User, minPlays: number) {
  const liked = new Set(
    await LibraryItemModel.distinct("id", { owner: user._id, type: "track" }),
  );
  const rows = await InfosModel.aggregate<{ _id: string; plays: number }>([
    { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
    { $group: { _id: "$id", plays: { $sum: 1 } } },
    { $match: { plays: { $gte: minPlays } } },
    { $sort: { plays: -1 } },
    { $limit: 400 },
  ]);
  const ids = rows.map((row) => row._id).filter((id) => !liked.has(id));
  if (ids.length > 0) {
    await saveToLibrary(user._id, "track", ids.slice(0, 200));
  }
  return Math.min(ids.length, 200);
}

export async function removeLibraryOfAccount(spotifyId: string) {
  await LibraryItemModel.deleteMany({ account: spotifyId });
}
