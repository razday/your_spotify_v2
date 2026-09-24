import { Types } from "mongoose";

import { ArtistModel, TrackModel } from "../database/Models";
import {
  getAccountsOfUser,
  getUsableAccount,
} from "../database/queries/spotifyAccount";
import { SpotifyAccount } from "../database/schemas/spotifyAccount";
import { HttpError, RateLimitedError } from "./apis/queueHttpClient";
import {
  SpotifyAPI,
  SpotifyPlayerItem,
  SpotifyPlayerState,
} from "./apis/spotifyApi";
import { SpotifyNotLinkedError } from "./errors/spotify";
import { logger } from "./logger";

export const PLAYER_SCOPE = "user-read-playback-state";

// Several tabs and users share one Spotify request per account
const CACHE_MS = 3000;

export type PlayerError =
  | "SCOPE_MISSING"
  | "RATE_LIMITED"
  | "NOT_LINKED"
  | "ERROR";

export interface PlayerItem {
  type: "track" | "episode";
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  image: string | null;
  // Our pages exist only for the tracks and artists of the history
  known: boolean;
  artists: { id: string; name: string; known: boolean }[];
  album: { id: string; name: string } | null;
  show: string | null;
}

export interface PlayerDevice {
  id: string | null;
  name: string;
  type: string;
  volume: number | null;
  supportsVolume: boolean;
  isActive: boolean;
  isRestricted: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  progressMs: number;
  // When progressMs was read, so the client can move the progress bar
  fetchedAt: number;
  changedAt: number;
  shuffle: boolean;
  repeat: "off" | "context" | "track";
  device: PlayerDevice | null;
  item: PlayerItem | null;
  disallows: string[];
}

export interface AccountPlayer {
  accountId: string;
  spotifyId: string;
  displayName: string | null;
  image: string | null;
  primary: boolean;
  // Controls need Premium, null when Spotify did not say
  premium: boolean | null;
  state: PlayerState | null;
  error: PlayerError | null;
}

interface CacheEntry {
  at: number;
  state: PlayerState | null;
  error: PlayerError | null;
}

const cache = new Map<string, CacheEntry>();
const rateLimitedUntil = new Map<string, number>();

export function invalidatePlayer(accountId: string) {
  cache.delete(accountId);
}

export const toDevice = (device: {
  id: string | null;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
  is_active: boolean;
  is_restricted: boolean;
}): PlayerDevice => ({
  id: device.id,
  name: device.name,
  type: device.type,
  volume: device.volume_percent,
  supportsVolume: device.supports_volume,
  isActive: device.is_active,
  isRestricted: device.is_restricted,
});

// Light items, flagged with what our history knows
export async function toItems(items: SpotifyPlayerItem[]) {
  const trackIds = items.filter((i) => i.type === "track").map((i) => i.id);
  const artistIds = items.flatMap((i) =>
    i.type === "track" ? i.artists.map((a) => a.id) : [],
  );
  const [tracks, artists] = await Promise.all([
    trackIds.length
      ? TrackModel.find({ id: { $in: trackIds } }, { id: 1 }).lean()
      : [],
    artistIds.length
      ? ArtistModel.find({ id: { $in: artistIds } }, { id: 1 }).lean()
      : [],
  ]);
  const knownTracks = new Set(tracks.map((t) => t.id));
  const knownArtists = new Set(artists.map((a) => a.id));

  return items.map((item): PlayerItem => {
    if (item.type === "episode") {
      return {
        type: "episode",
        id: item.id,
        uri: item.uri,
        name: item.name,
        durationMs: item.duration_ms,
        image: item.images[0]?.url ?? item.show.images[0]?.url ?? null,
        known: false,
        artists: [],
        album: null,
        show: item.show.name,
      };
    }
    return {
      type: "track",
      id: item.id,
      uri: item.uri,
      name: item.name,
      durationMs: item.duration_ms,
      image: item.album.images[0]?.url ?? null,
      known: knownTracks.has(item.id),
      artists: item.artists.map((a) => ({
        id: a.id,
        name: a.name,
        known: knownArtists.has(a.id),
      })),
      album: { id: item.album.id, name: item.album.name },
      show: null,
    };
  });
}

async function toState(raw: SpotifyPlayerState): Promise<PlayerState> {
  const [item] = raw.item ? await toItems([raw.item]) : [null];
  return {
    isPlaying: raw.is_playing,
    progressMs: raw.progress_ms ?? 0,
    fetchedAt: Date.now(),
    changedAt: raw.timestamp,
    shuffle: raw.shuffle_state,
    repeat: raw.repeat_state,
    device: raw.device ? toDevice(raw.device) : null,
    item: item ?? null,
    disallows: Object.entries(raw.actions?.disallows ?? {})
      .filter(([, value]) => value)
      .map(([key]) => key),
  };
}

async function loadState(
  account: SpotifyAccount,
): Promise<Omit<CacheEntry, "at">> {
  if (!account.scopes.includes(PLAYER_SCOPE)) {
    return { state: null, error: "SCOPE_MISSING" };
  }
  const id = account._id.toString();
  const cached = cache.get(id);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached;
  }
  if ((rateLimitedUntil.get(id) ?? 0) > Date.now()) {
    return { state: cached?.state ?? null, error: "RATE_LIMITED" };
  }

  let entry: CacheEntry;
  try {
    const raw = await SpotifyAPI.forAccount(id).player();
    entry = {
      at: Date.now(),
      state: raw ? await toState(raw) : null,
      error: null,
    };
  } catch (e) {
    let error: PlayerError = "ERROR";
    if (e instanceof RateLimitedError) {
      rateLimitedUntil.set(id, Date.now() + e.retryAfterMs);
      error = "RATE_LIMITED";
    } else if (e instanceof SpotifyNotLinkedError) {
      error = "NOT_LINKED";
    } else if (e instanceof HttpError && e.status === 403) {
      error = "SCOPE_MISSING";
    } else {
      logger.warn(`Could not read the player of ${account.spotifyId}`, e);
    }
    entry = { at: Date.now(), state: null, error };
  }
  cache.set(id, entry);
  return entry;
}

// The player of every active account, the ones playing first (the one that
// changed last on top), then the primary account
export async function getPlayers(owner: Types.ObjectId) {
  const accounts = (await getAccountsOfUser(owner)).filter(
    (account) => account.status === "active",
  );
  const players = await Promise.all(
    accounts.map(async (account): Promise<AccountPlayer> => {
      const { state, error } = await loadState(account);
      return {
        accountId: account._id.toString(),
        spotifyId: account.spotifyId,
        displayName: account.displayName,
        image: account.image,
        primary: account.primary,
        premium: account.product ? account.product === "premium" : null,
        state,
        error,
      };
    }),
  );
  const rank = (player: AccountPlayer) =>
    player.state?.isPlaying ? 2 : player.state?.item ? 1 : 0;
  return players.sort(
    (a, b) =>
      rank(b) - rank(a) ||
      (b.state?.changedAt ?? 0) - (a.state?.changedAt ?? 0) ||
      Number(b.primary) - Number(a.primary),
  );
}

// Where "Play on Spotify" goes: the account playing right now, then one with
// a device, then the primary account
export async function playbackTarget(owner: Types.ObjectId) {
  const players = await getPlayers(owner);
  const current =
    players.find((p) => p.state?.isPlaying) ??
    players.find((p) => p.state?.device);
  if (current) {
    return {
      accountId: current.accountId,
      deviceId: current.state?.device?.id ?? undefined,
    };
  }
  const usable = await getUsableAccount(owner);
  if (!usable) {
    return null;
  }
  // No device in the player state: take the first available one
  let deviceId: string | undefined;
  if (usable.scopes.includes(PLAYER_SCOPE)) {
    try {
      const devices = await SpotifyAPI.forAccount(
        usable._id.toString(),
      ).devices();
      deviceId =
        (
          devices.find((d) => d.is_active) ??
          devices.find((d) => !d.is_restricted)
        )?.id ?? undefined;
    } catch {
      // Spotify answers without a device_id with a clear NO_ACTIVE_DEVICE
    }
  }
  return { accountId: usable._id.toString(), deviceId };
}
