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
