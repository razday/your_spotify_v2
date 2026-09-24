import { SpotifyImage } from "../types";

export interface LightTrack {
  id: string;
  name: string;
  album: string;
  artists: string[];
  duration_ms: number;
  explicit: boolean;
}

export interface LightAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  album_type: string;
}

export interface LightArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export interface TrackWithContext {
  track: LightTrack;
  album: LightAlbum | undefined;
  artist: LightArtist | undefined;
}

export interface Overview {
  plays: number;
  durationMs: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  activeDays: number;
  busiestDay: { date: string; plays: number; durationMs: number } | null;
  favoriteHour: number | null;
  newArtists: number;
  newTracks: number;
  longestStreak: { days: number; start: string | null; end: string | null };
  currentStreak: number;
}

export interface HeatmapCell {
  // 1 = Monday ... 7 = Sunday
  weekday: number;
  hour: number;
  plays: number;
  durationMs: number;
}

export interface CalendarDay {
  date: string;
  plays: number;
  durationMs: number;
}

export interface ReleaseYear {
  year: number;
  plays: number;
  durationMs: number;
  top: (TrackWithContext & { plays: number }) | null;
}

export interface Composition {
  albumTypes: { type: string; plays: number }[];
  explicit: { explicit: number; clean: number };
  trackLengths: { bucket: string; plays: number }[];
}

export interface Discoveries {
  totalArtists: number;
  totalTracks: number;
  artists: { artist: LightArtist; firstListenedAt: string; plays: number }[];
  tracks: (TrackWithContext & { firstListenedAt: string; plays: number })[];
}

export type Repeat = TrackWithContext & { day: string; plays: number };

export type TimelineItemType = "artist" | "album" | "track";

export interface ItemTimeline {
  plays: number;
  durationMs: number;
  daysListened: number;
  first: string | null;
  last: string | null;
  months: { month: string; plays: number; durationMs: number }[];
  hours: { hour: number; plays: number }[];
  weekdays: { weekday: number; plays: number }[];
}

export interface SpotifyAppInfo {
  clientId: string | null;
  configured: boolean;
  source: "settings" | "environment";
  environmentClientId: string | null;
  redirectUri: string;
}

export interface Forgotten {
  artists: {
    artist: LightArtist;
    plays: number;
    durationMs: number;
    lastListenedAt: string;
  }[];
  tracks: (TrackWithContext & {
    plays: number;
    durationMs: number;
    lastListenedAt: string;
  })[];
}

export interface AchievementMetrics {
  plays: number;
  durationMs: number;
  artists: number;
  tracks: number;
  albums: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  maxArtistPlaysInDay: number;
  maxTrackPlaysInDay: number;
  maxDayDurationMs: number;
  nightPlays: number;
  morningPlays: number;
  decades: number;
}

export interface LeaderboardEntry {
  userId: string;
  plays: number;
  durationMs: number;
  artists: number;
  topArtist: LightArtist | null;
  // 0..1, null for yourself
  compatibility: number | null;
}

export interface Genres {
  totalPlays: number;
  coveredPlays: number;
  genres: {
    genre: string;
    plays: number;
    durationMs: number;
    topArtists: LightArtist[];
  }[];
}
