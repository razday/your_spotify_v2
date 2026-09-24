import { SpotifyImage } from "../types";

export type LibraryType = "track" | "album";

export interface LikedIds {
  tracks: string[];
  albums: string[];
}

export interface LibraryEntry {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string } | null;
  image: string | null;
  durationMs: number | null;
  addedAt: string;
  account: string;
  plays: number;
}

export interface LibrarySummary {
  accounts: {
    id: string;
    spotifyId: string;
    displayName: string | null;
    canRead: boolean;
    canModify: boolean;
    syncedAt: string | null;
  }[];
  likedTracks: number;
  savedAlbums: number;
  likedShare: number;
  likesPerMonth: { month: string; count: number }[];
  recent: LibraryEntry[];
  oldest: LibraryEntry[];
  neverPlayed: { total: number; items: LibraryEntry[] };
  notLiked: {
    total: number;
    minPlays: number;
    items: {
      track: { id: string; name: string; duration_ms: number };
      album: { id: string; name: string; images: SpotifyImage[] } | null;
      artist: { id: string; name: string; images: SpotifyImage[] } | null;
      plays: number;
    }[];
  };
  albums: LibraryEntry[];
}

export type SmartPlaylistKind =
  | "top-month"
  | "top-year"
  | "top-all"
  | "discoveries"
  | "forgotten"
  | "night"
  | "year"
  | "liked-unplayed";

export type SmartRefresh = "daily" | "weekly" | "never";

export interface SmartPlaylistInfo {
  id: string;
  accountId: string;
  playlistId: string;
  kind: SmartPlaylistKind;
  year: number | null;
  size: number;
  refresh: SmartRefresh;
  lastRefreshAt: string | null;
  name: string;
}

export interface PlaylistSummary {
  accountId: string;
  accountName: string;
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[] | null;
  public: boolean | null;
  collaborative: boolean;
  total: number;
  smart: SmartPlaylistInfo | null;
}

export interface PlaylistItem {
  position: number;
  uri: string;
  id: string | null;
  type: "track" | "episode";
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; releaseDate: string | null } | null;
  image: string | null;
  durationMs: number;
  addedAt: string | null;
  isLocal: boolean;
  plays: number;
  lastPlayedAt: string | null;
  known: boolean;
}

export interface PlaylistDetails {
  playlist: {
    id: string;
    accountId: string;
    accountName: string;
    name: string;
    description: string | null;
    public: boolean | null;
    collaborative: boolean;
    images: SpotifyImage[] | null;
    snapshotId: string;
    owner: string;
    editable: boolean;
  };
  smart: SmartPlaylistInfo | null;
  items: PlaylistItem[];
  stats: {
    tracks: number;
    durationMs: number;
    neverPlayed: number;
    totalPlays: number;
    decades: { decade: number; count: number }[];
    topArtists: { id: string; name: string; count: number }[];
    duplicates: { uri: string; name: string; count: number }[];
  };
}
