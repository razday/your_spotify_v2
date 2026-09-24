import { Types } from "mongoose";

import {
  getAccountById,
  getUsableAccount,
  markAccountExpired,
  storeAccountTokens,
} from "../../database/queries/spotifyAccount";
import { SpotifyAlbum } from "../../database/schemas/album";
import { SpotifyArtist } from "../../database/schemas/artist";
import { SpotifyTrack } from "../../database/schemas/track";
import { SpotifyNotLinkedError } from "../errors/spotify";
import { logger } from "../logger";
import { chunk } from "../misc";
import { spotifyProvider } from "../oauth/Provider";
import { HttpError } from "./queueHttpClient";

export interface SpotifyMe {
  id: string;
  display_name: string;
  email?: string;
  product?: string;
  images?: { url: string; width: number | null; height: number | null }[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: { id: string };
  // Changes on every edit of the playlist
  snapshot_id: string;
}

// Track ids of the playlists, valid as long as their snapshot is the same
const playlistTracks = new Map<
  string,
  { snapshot: string; ids: Set<string> }
>();

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
}

interface SpotifyImage {
  url: string;
}

export type SpotifyPlayerItem =
  | {
      type: "track";
      id: string;
      uri: string;
      name: string;
      duration_ms: number;
      artists: { id: string; name: string }[];
      album: { id: string; name: string; images: SpotifyImage[] };
    }
  | {
      type: "episode";
      id: string;
      uri: string;
      name: string;
      duration_ms: number;
      images: SpotifyImage[];
      show: { id: string; name: string; images: SpotifyImage[] };
    };

export interface SpotifyPlayerState {
  device: SpotifyDevice | null;
  shuffle_state: boolean;
  repeat_state: "off" | "context" | "track";
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  item: SpotifyPlayerItem | null;
  actions?: { disallows?: Record<string, boolean> };
}

export type PlayerCommand =
  | { type: "play"; deviceId?: string }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "seek"; positionMs: number }
  | { type: "volume"; volume: number }
  | { type: "shuffle"; state: boolean }
  | { type: "repeat"; state: "off" | "context" | "track" }
  | { type: "transfer"; deviceId: string; play: boolean }
  | { type: "queue"; uri: string };

// A user is waiting on these requests: fail fast on a long rate limit
const INTERACTIVE = { priority: "high", maxRetryAfterMs: 5000 } as const;

const deviceQuery = (deviceId?: string) =>
  deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

type Target = { userId: string } | { accountId: string };

export class SpotifyAPI {
  private readonly target: Target;

  // A user id targets their usable account (primary first)
  constructor(target: string | Target) {
    this.target = typeof target === "string" ? { userId: target } : target;
  }

  static forAccount(accountId: string) {
    return new SpotifyAPI({ accountId });
  }

  public async resolveAccount() {
    const account =
      "accountId" in this.target
        ? await getAccountById(new Types.ObjectId(this.target.accountId), true)
        : await getUsableAccount(new Types.ObjectId(this.target.userId));
    if (!account || account.status !== "active") {
      throw new SpotifyNotLinkedError();
    }
    return account;
  }

  private async checkToken() {
    const account = await this.resolveAccount();
    let access = account.accessToken;
    // Refresh the token if it expires in less than two minutes (1000ms * 120)
    if (Date.now() > account.expiresIn - 1000 * 120) {
      if (!account.refreshToken) {
        await markAccountExpired(account._id);
        throw new SpotifyNotLinkedError("Spotify account has no refresh token");
      }
      let infos;
      try {
        infos = await spotifyProvider.refresh(account.refreshToken);
      } catch (e) {
        // Spotify answers invalid_grant when the refresh token was revoked
        // (access removed, password changed...): it has to be linked again
        if (
          e instanceof HttpError &&
          e.status === 400 &&
          e.body.includes("invalid_grant")
        ) {
          await markAccountExpired(account._id);
          logger.warn(
            `[${account.displayName ?? account.spotifyId}]: Spotify authorization revoked, the account has to be linked again`,
          );
          throw new SpotifyNotLinkedError("Spotify authorization revoked");
        }
        throw e;
      }

      await storeAccountTokens(account._id, infos);
      logger.info(
        `Refreshed token of ${account.displayName ?? account.spotifyId}`,
      );
      access = infos.accessToken;
    }
    if (access) {
      return spotifyProvider.getHttpClient(access);
    }
    throw new Error("Could not get any access token");
  }

  public async raw(url: string) {
    const client = await this.checkToken();
    return client.get(url);
  }

  // Plays a track on a device. From its album when known, like the Spotify
  // apps do, so the playback goes on with the next tracks of the album
  public async playTrack(
    trackUri: string,
    options: { albumUri?: string; deviceId?: string } = {},
  ) {
    const client = await this.checkToken();
    const url = `/me/player/play${deviceQuery(options.deviceId)}`;
    if (options.albumUri) {
      try {
        await client.put(url, {
          ...INTERACTIVE,
          data: { context_uri: options.albumUri, offset: { uri: trackUri } },
        });
        return;
      } catch (e) {
        // The track may not be part of this album anymore (relinked)
        if (!(e instanceof HttpError) || e.status !== 400) {
          throw e;
        }
      }
    }
    await client.put(url, { ...INTERACTIVE, data: { uris: [trackUri] } });
  }

  // The player state, null when nothing is playing
  public async player() {
    const client = await this.checkToken();
    const res = await client.get<SpotifyPlayerState | null>(
      "/me/player?additional_types=episode",
      INTERACTIVE,
    );
    return res.data;
  }

  public async devices() {
    const client = await this.checkToken();
    const res = await client.get<{ devices: SpotifyDevice[] }>(
      "/me/player/devices",
      INTERACTIVE,
    );
    return res.data?.devices ?? [];
  }

  public async queue() {
    const client = await this.checkToken();
    const res = await client.get<{
      currently_playing: SpotifyPlayerItem | null;
      queue: SpotifyPlayerItem[];
    }>("/me/player/queue", INTERACTIVE);
    return res.data?.queue ?? [];
  }

  public async playerCommand(command: PlayerCommand) {
    const client = await this.checkToken();
    switch (command.type) {
      case "play":
        return client.put(
          `/me/player/play${deviceQuery(command.deviceId)}`,
          INTERACTIVE,
        );
      case "pause":
        return client.put("/me/player/pause", INTERACTIVE);
      case "next":
        return client.post("/me/player/next", INTERACTIVE);
      case "previous":
        return client.post("/me/player/previous", INTERACTIVE);
      case "seek":
        return client.put(
          `/me/player/seek?position_ms=${Math.max(0, Math.round(command.positionMs))}`,
          INTERACTIVE,
        );
      case "volume":
        return client.put(
          `/me/player/volume?volume_percent=${Math.round(command.volume)}`,
          INTERACTIVE,
        );
      case "shuffle":
        return client.put(
          `/me/player/shuffle?state=${command.state}`,
          INTERACTIVE,
        );
      case "repeat":
        return client.put(
          `/me/player/repeat?state=${command.state}`,
          INTERACTIVE,
        );
      case "transfer":
        return client.put("/me/player", {
          ...INTERACTIVE,
          data: { device_ids: [command.deviceId], play: command.play },
        });
      case "queue":
        return client.post(
          `/me/player/queue?uri=${encodeURIComponent(command.uri)}`,
          INTERACTIVE,
        );
    }
  }

  public async me() {
    const client = await this.checkToken();
    const res = await client.get("/me", { priority: "high" });
    return res.data as SpotifyMe;
  }

  public async playlists() {
    const items: SpotifyPlaylist[] = [];

    let nextUrl = "/me/playlists?limit=50";
    while (nextUrl) {
      const thisUrl = nextUrl;

      const client = await this.checkToken();
      const res = await client.get(thisUrl);
      nextUrl = res.data.next;
      items.push(...res.data.items);
    }
    return items;
  }

  // Only the playlists of the account, the others cannot be modified
  public async ownPlaylists() {
    const account = await this.resolveAccount();
    const playlists = await this.playlists();
    return playlists.filter(
      (playlist) => playlist.owner.id === account.spotifyId,
    );
  }

  public async playlistTrackIds(playlist: SpotifyPlaylist) {
    const cached = playlistTracks.get(playlist.id);
    if (cached && cached.snapshot === playlist.snapshot_id) {
      return cached.ids;
    }
    const ids = new Set<string>();
    // "item" since February 2026, "track" before
    let next: string | null = `/playlists/${playlist.id}/items?limit=100`;
    while (next) {
      const client = await this.checkToken();
      const res: {
        data: {
          next: string | null;
          items: {
            item?: { id: string } | null;
            track?: { id: string } | null;
          }[];
        } | null;
      } = await client.get<{
        next: string | null;
        items: {
          item?: { id: string } | null;
          track?: { id: string } | null;
        }[];
      }>(next, INTERACTIVE);
      for (const entry of res.data?.items ?? []) {
        const id = entry.item?.id ?? entry.track?.id;
        if (id) {
          ids.add(id);
        }
      }
      next = res.data?.next ?? null;
    }
    playlistTracks.set(playlist.id, { snapshot: playlist.snapshot_id, ids });
    return ids;
  }

  private async handleAddIdsToPlaylist(id: string, ids: string[]) {
    const chunks = chunk(ids, 100);
    for (let i = 0; i < chunks.length; i += 1) {
      const chk = chunks[i]!;

      const client = await this.checkToken();
      // /tracks was removed by Spotify in February 2026
      await client.post(`/playlists/${id}/items`, {
        data: { uris: chk.map((trackId) => `spotify:track:${trackId}`) },
      });
    }
  }

  public async addToPlaylist(id: string, ids: string[]) {
    await this.checkToken();
    return this.handleAddIdsToPlaylist(id, ids);
  }

  public async createPlaylist(name: string, ids: string[]) {
    const client = await this.checkToken();
    const { data } = await client.post(`/me/playlists`, {
      data: { name, public: true, collaborative: false, description: "" },
    });
    return this.handleAddIdsToPlaylist(data.id, ids);
  }

  async getTrack(id: string) {
    try {
      const client = await this.checkToken();
      const res = await client.get(`/tracks/${id}`);
      return res.data as SpotifyTrack;
    } catch {
      return undefined;
    }
  }

  async getTracks(spotifyIds: string[]) {
    const tracks: (SpotifyTrack | undefined)[] = [];
    for (const id of spotifyIds) {
      const track = await this.getTrack(id);
      tracks.push(track);
    }
    return tracks;
  }

  async getAlbum(id: string) {
    try {
      const client = await this.checkToken();
      const res = await client.get(`/albums/${id}`);
      return res.data as SpotifyAlbum;
    } catch {
      return undefined;
    }
  }

  async getAlbums(spotifyIds: string[]) {
    const albums: (SpotifyAlbum | undefined)[] = [];
    for (const id of spotifyIds) {
      const album = await this.getAlbum(id);
      albums.push(album);
    }
    return albums;
  }

  async getArtist(id: string) {
    try {
      const client = await this.checkToken();
      const res = await client.get(`/artists/${id}`);
      return res.data as SpotifyArtist;
    } catch {
      return undefined;
    }
  }

  async getArtists(spotifyIds: string[]) {
    const artists: (SpotifyArtist | undefined)[] = [];
    for (const id of spotifyIds) {
      const artist = await this.getArtist(id);
      artists.push(artist);
    }
    return artists;
  }

  public async search(track: string, artist: string) {
    try {
      const client = await this.checkToken();
      const limitedTrack = track.slice(0, 100);
      const limitedArtist = artist.slice(0, 100);
      const res = await client.get(
        `/search?q=track:${encodeURIComponent(
          limitedTrack,
        )}+artist:${encodeURIComponent(limitedArtist)}&type=track&limit=10`,
      );
      return res.data.tracks.items[0] as SpotifyTrack;
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.status === 404) {
          return undefined;
        }
      }
      throw e;
    }
  }
}
