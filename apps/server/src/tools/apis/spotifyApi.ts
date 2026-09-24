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

interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: { id: string };
}

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

  private async resolveAccount() {
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

  public async playTrack(trackUri: string) {
    const client = await this.checkToken();
    return client.put("/me/player/play", { data: { uris: [trackUri] } });
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

  private async handleAddIdsToPlaylist(id: string, ids: string[]) {
    const chunks = chunk(ids, 100);
    for (let i = 0; i < chunks.length; i += 1) {
      const chk = chunks[i]!;

      const client = await this.checkToken();
      await client.post(`/playlists/${id}/tracks`, {
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
