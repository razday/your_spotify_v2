import { Interval } from "../../../intervals";

export type DarkModeType = "light" | "dark" | "follow";

export type SpotifyAccountStatus = "active" | "expired" | "untracked";

export interface SpotifyAccount {
  id: string;
  spotifyId: string;
  displayName: string | null;
  email: string | null;
  product: string | null;
  image: string | null;
  status: SpotifyAccountStatus;
  primary: boolean;
  lastSyncAt: string | null;
  lastPlayAt: string | null;
  linkedAt: string;
  plays: number;
  missingScopes: string[];
}

export type Language = "en" | "fr";

export interface User {
  username: string;
  admin: boolean;
  hasPassword: boolean;
  spotifyAccounts: SpotifyAccount[];
  _id: string;
  id: string;
  tracks: string[];
  settings: {
    historyLine: boolean;
    preferredStatsPeriod: string;
    nbElements: number;
    metricUsed: "number" | "duration";
    darkMode: DarkModeType;
    timezone: string | null | undefined;
    dateFormat: string;
    blacklistedArtists: string[] | undefined;
    language: Language | undefined;
  };
  publicToken: string | null;
  firstListenedAt: string;
  isGuest: boolean;
}

export interface ReduxPresetIntervalDetail {
  type: "preset";
  index: number;
}

export interface ReduxCustomIntervalDetail {
  type: "custom";
  interval: Interval;
}

export interface ReduxUserBasedIntervalDetails {
  type: "userbased";
  index: number;
}

export type ReduxIntervalDetail =
  | ReduxPresetIntervalDetail
  | ReduxCustomIntervalDetail
  | ReduxUserBasedIntervalDetails;
