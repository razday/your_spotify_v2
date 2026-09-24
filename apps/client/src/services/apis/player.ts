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

export type RepeatState = "off" | "context" | "track";

export interface PlayerState {
  isPlaying: boolean;
  progressMs: number;
  fetchedAt: number;
  changedAt: number;
  shuffle: boolean;
  repeat: RepeatState;
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
  premium: boolean | null;
  state: PlayerState | null;
  error: PlayerError | null;
}

export type PlayerCommand =
  | { type: "play"; deviceId?: string }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "seek"; positionMs: number }
  | { type: "volume"; volume: number }
  | { type: "shuffle"; state: boolean }
  | { type: "repeat"; state: RepeatState }
  | { type: "transfer"; deviceId: string; play: boolean }
  | { type: "queue"; uri: string };
