import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import {
  InfosModel,
  SmartPlaylistModel,
  SpotifyAccountModel,
  TrackModel,
} from "../database/Models";
import {
  SMART_PLAYLIST_KINDS,
  SmartPlaylist,
} from "../database/schemas/smartPlaylist";
import { SpotifyAccount } from "../database/schemas/spotifyAccount";
import { User } from "../database/schemas/user";
import { PlaylistEntry, SpotifyAPI } from "../tools/apis/spotifyApi";
import { logger } from "../tools/logger";
import { logged, validate } from "../tools/middleware";
import {
  createSmartPlaylist,
  refreshSmartPlaylist,
  SmartPlaylistGoneError,
  smartPlaylistName,
  smartPlaylistsOf,
} from "../tools/smartPlaylists";
import { LoggedRequest } from "../tools/types";

export const router = Router();

const READ_SCOPE = "playlist-read-private";

// The active account, only when it belongs to the user
async function ownedAccount(user: User, accountId: string) {
  if (!Types.ObjectId.isValid(accountId)) {
    return null;
  }
  const account = await SpotifyAccountModel.findById(accountId).lean();
  if (
    !account ||
    account.status !== "active" ||
    account.owner.toString() !== user._id.toString()
  ) {
    return null;
  }
  return account;
}

const editable = (
  account: SpotifyAccount,
  playlist: { owner: { id: string }; collaborative?: boolean },
) => playlist.owner.id === account.spotifyId || Boolean(playlist.collaborative);

const smartInfo = (user: User, smart: SmartPlaylist) => ({
  id: smart._id.toString(),
  accountId: smart.account.toString(),
  playlistId: smart.playlistId,
  kind: smart.kind,
  year: smart.year,
  size: smart.size,
  refresh: smart.refresh,
  lastRefreshAt: smart.lastRefreshAt,
  name: smartPlaylistName(user, smart.kind, smart.year),
});

// The playlists the user can edit, on every account
router.get("/", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const accounts = await SpotifyAccountModel.find({
    owner: user._id,
    status: "active",
  })
    .sort({ primary: -1, linkedAt: 1 })
    .lean();
  const smarts = new Map(
    (await smartPlaylistsOf(user._id)).map((smart) => [
      smart.playlistId,
      smart,
    ]),
  );

  const result = [];
  let scopeMissing = false;
  for (const account of accounts) {
    if (!account.scopes.includes(READ_SCOPE)) {
      scopeMissing = true;
      continue;
    }
    try {
      const playlists = await SpotifyAPI.forAccount(
        account._id.toString(),
      ).playlists();
      for (const playlist of playlists) {
        if (!editable(account, playlist)) {
          continue;
        }
        const smart = smarts.get(playlist.id);
        result.push({
          accountId: account._id.toString(),
          accountName: account.displayName ?? account.spotifyId,
          id: playlist.id,
          name: playlist.name,
          description: playlist.description ?? null,
          images: playlist.images ?? null,
          public: playlist.public ?? null,
          collaborative: Boolean(playlist.collaborative),
          total: playlist.items?.total ?? playlist.tracks?.total ?? 0,
          smart: smart ? smartInfo(user, smart) : null,
        });
      }
    } catch (e) {
      logger.warn(
        `Could not list the playlists of ${account.spotifyId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
  res.status(200).send({ playlists: result, scopeMissing });
});

router.get("/smart", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const smarts = await smartPlaylistsOf(user._id);
  res.status(200).send(smarts.map((smart) => smartInfo(user, smart)));
});

const smartSchema = z.object({
  accountId: z.string(),
  kind: z.enum(SMART_PLAYLIST_KINDS),
  size: z.number().int().min(10).max(200).default(50),
  refresh: z.enum(["daily", "weekly", "never"]).default("weekly"),
  year: z.number().int().min(1900).max(2100).nullable().default(null),
});

router.post("/smart", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const body = validate(req.body, smartSchema);
  const account = await ownedAccount(user, body.accountId);
  if (!account) {
    res.status(404).end();
    return;
  }
  if (body.kind === "year" && body.year === null) {
    res.status(400).send({ code: "YEAR_REQUIRED" });
    return;
  }
  const { smart, count } = await createSmartPlaylist(user, account, {
    kind: body.kind,
    size: body.size,
    refresh: body.refresh,
    year: body.kind === "year" ? body.year : null,
  });
  res.status(200).send({ ...smartInfo(user, smart), count });
});

const smartParams = z.object({ id: z.string() });

async function ownedSmart(req: LoggedRequest) {
  const { id } = validate(req.params, smartParams);
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  return SmartPlaylistModel.findOne({ _id: id, owner: req.user._id }).lean();
}

router.post("/smart/:id/refresh", logged, async (req, res) => {
  const smart = await ownedSmart(req as LoggedRequest);
  if (!smart) {
    res.status(404).end();
    return;
  }
  try {
    const count = await refreshSmartPlaylist(smart);
    res.status(200).send({ count });
  } catch (e) {
    if (e instanceof SmartPlaylistGoneError) {
      res.status(410).send({ code: "PLAYLIST_GONE" });
      return;
    }
    throw e;
  }
});

const smartUpdateSchema = z.object({
  refresh: z.enum(["daily", "weekly", "never"]).optional(),
  size: z.number().int().min(10).max(200).optional(),
});

router.patch("/smart/:id", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const smart = await ownedSmart(req as LoggedRequest);
  if (!smart) {
    res.status(404).end();
    return;
  }
  const update = validate(req.body, smartUpdateSchema);
  const updated = await SmartPlaylistModel.findByIdAndUpdate(
    smart._id,
    update,
    { new: true },
  ).lean();
  res.status(200).send(updated ? smartInfo(user, updated) : null);
});

// Stops updating it, the playlist stays on Spotify
router.delete("/smart/:id", logged, async (req, res) => {
  const smart = await ownedSmart(req as LoggedRequest);
  if (!smart) {
    res.status(404).end();
    return;
  }
  await SmartPlaylistModel.deleteOne({ _id: smart._id });
  res.status(204).end();
});

const playlistParams = z.object({
  accountId: z.string(),
  playlistId: z.string().regex(/^[A-Za-z0-9]+$/),
});

async function target(req: LoggedRequest) {
  const { accountId, playlistId } = validate(req.params, playlistParams);
  const account = await ownedAccount(req.user, accountId);
  if (!account) {
    return null;
  }
  const api = SpotifyAPI.forAccount(account._id.toString());
  const playlist = await api.playlist(playlistId);
  return { account, api, playlist, playlistId };
}

const decadeOf = (releaseDate: string | null) => {
  const year = Number(releaseDate?.slice(0, 4));
  return Number.isFinite(year) && year > 1900
    ? Math.floor(year / 10) * 10
    : null;
};

function duplicatesOf(items: PlaylistEntry[]) {
  const byUri = new Map<string, PlaylistEntry[]>();
  for (const item of items) {
    byUri.set(item.uri, [...(byUri.get(item.uri) ?? []), item]);
  }
  return [...byUri.values()].filter((group) => group.length > 1);
}

router.get("/:accountId/:playlistId", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const found = await target(req as LoggedRequest);
  if (!found) {
    res.status(404).end();
    return;
  }
  const { account, api, playlist } = found;
  const items = await api.playlistItems(playlist);
  const trackIds = [
    ...new Set(items.flatMap((item) => (item.id ? [item.id] : []))),
  ];
  const [playRows, known, smart] = await Promise.all([
    InfosModel.aggregate<{ _id: string; plays: number; last: Date }>([
      {
        $match: {
          owner: user._id,
          id: { $in: trackIds },
          blacklistedBy: { $exists: false },
        },
      },
      {
        $group: {
          _id: "$id",
          plays: { $sum: 1 },
          last: { $max: "$played_at" },
        },
      },
    ]),
    TrackModel.distinct("id", { id: { $in: trackIds } }),
    SmartPlaylistModel.findOne({
      owner: user._id,
      playlistId: playlist.id,
    }).lean(),
  ]);
  const plays = new Map(playRows.map((row) => [row._id, row]));
  const knownIds = new Set(known);

  const decades = new Map<number, number>();
  const artists = new Map<
    string,
    { id: string; name: string; count: number }
  >();
  for (const item of items) {
    const decade = decadeOf(item.album?.releaseDate ?? null);
    if (decade !== null) {
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
    const artist = item.artists[0];
    if (artist?.id) {
      const current = artists.get(artist.id);
      artists.set(artist.id, {
        id: artist.id,
        name: artist.name,
        count: (current?.count ?? 0) + 1,
      });
    }
  }
  const duplicates = duplicatesOf(items);

  res
    .status(200)
    .send({
      playlist: {
        id: playlist.id,
        accountId: account._id.toString(),
        accountName: account.displayName ?? account.spotifyId,
        name: playlist.name,
        description: playlist.description,
        public: playlist.public,
        collaborative: playlist.collaborative,
        images: playlist.images,
        snapshotId: playlist.snapshot_id,
        owner: playlist.owner.display_name ?? playlist.owner.id,
        editable: editable(account, playlist),
      },
      smart: smart ? smartInfo(user, smart) : null,
      items: items.map((item) => ({
        ...item,
        plays: item.id ? (plays.get(item.id)?.plays ?? 0) : 0,
        lastPlayedAt: item.id ? (plays.get(item.id)?.last ?? null) : null,
        known: item.id ? knownIds.has(item.id) : false,
      })),
      stats: {
        tracks: items.length,
        durationMs: items.reduce((sum, item) => sum + item.durationMs, 0),
        neverPlayed: items.filter((item) => !item.id || !plays.has(item.id))
          .length,
        totalPlays: playRows.reduce((sum, row) => sum + row.plays, 0),
        decades: [...decades.entries()]
          .sort(([a], [b]) => a - b)
          .map(([decade, count]) => ({ decade, count })),
        topArtists: [...artists.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        duplicates: duplicates.map((group) => ({
          uri: group[0]!.uri,
          name: group[0]!.name,
          count: group.length,
        })),
      },
    });
});

const detailsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  public: z.boolean().optional(),
});

router.patch("/:accountId/:playlistId", logged, async (req, res) => {
  const found = await target(req as LoggedRequest);
  if (!found || !editable(found.account, found.playlist)) {
    res.status(404).end();
    return;
  }
  const details = validate(req.body, detailsSchema);
  // Line breaks are refused by Spotify
  if (details.description !== undefined) {
    details.description = details.description.replace(/\s*\n\s*/g, " ");
  }
  await found.api.updatePlaylist(found.playlistId, details);
  res.status(204).end();
});

const removeSchema = z.object({
  uris: z.array(z.string().startsWith("spotify:")).min(1).max(500),
});

router.post("/:accountId/:playlistId/remove", logged, async (req, res) => {
  const found = await target(req as LoggedRequest);
  if (!found || !editable(found.account, found.playlist)) {
    res.status(404).end();
    return;
  }
  const { uris } = validate(req.body, removeSchema);
  await found.api.removeFromPlaylist(found.playlistId, uris);
  res.status(204).end();
});

const moveSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  snapshotId: z.string().optional(),
});

router.post("/:accountId/:playlistId/move", logged, async (req, res) => {
  const found = await target(req as LoggedRequest);
  if (!found || !editable(found.account, found.playlist)) {
    res.status(404).end();
    return;
  }
  const { from, to, snapshotId } = validate(req.body, moveSchema);
  await found.api.moveInPlaylist(found.playlistId, from, to, snapshotId);
  res.status(204).end();
});

// Keeps each track once, at its first position
router.post("/:accountId/:playlistId/dedupe", logged, async (req, res) => {
  const found = await target(req as LoggedRequest);
  if (!found || !editable(found.account, found.playlist)) {
    res.status(404).end();
    return;
  }
  const { api, playlist, playlistId } = found;
  const items = await api.playlistItems(playlist);
  const duplicates = duplicatesOf(items).sort(
    (a, b) => a[0]!.position - b[0]!.position,
  );
  if (duplicates.length === 0) {
    res.status(200).send({ removed: 0 });
    return;
  }
  const duplicated = new Set(duplicates.map((group) => group[0]!.uri));
  await api.removeFromPlaylist(playlistId, [...duplicated]);
  // Removing a uri removes all its occurrences: add each back once
  for (const [index, group] of duplicates.entries()) {
    const first = group[0]!.position;
    const kept = items.filter(
      (item) => item.position < first && !duplicated.has(item.uri),
    ).length;
    await api.insertInPlaylist(playlistId, [group[0]!.uri], kept + index);
  }
  res
    .status(200)
    .send({
      removed: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
    });
});

const coverSchema = z.object({
  image: z
    .string()
    .max(360_000)
    .regex(/^[A-Za-z0-9+/]+=*$/),
});

router.put("/:accountId/:playlistId/cover", logged, async (req, res) => {
  const found = await target(req as LoggedRequest);
  if (!found || !editable(found.account, found.playlist)) {
    res.status(404).end();
    return;
  }
  if (!found.account.scopes.includes("ugc-image-upload")) {
    res.status(409).send({ code: "SPOTIFY_SCOPE_MISSING" });
    return;
  }
  const { image } = validate(req.body, coverSchema);
  await found.api.uploadPlaylistCover(found.playlistId, image);
  res.status(204).end();
});
