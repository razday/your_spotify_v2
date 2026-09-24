import { Schema, Types } from "mongoose";

export type DarkModeType = "follow" | "dark" | "light";

// Cached when the Spotify account is linked, so showing it needs no API call
export interface SpotifyAccount {
  displayName: string | null;
  email: string | null;
  product: string | null;
}

export interface User {
  _id: Types.ObjectId;
  username: string;
  admin: boolean;
  passwordHash?: string | null;
  spotifyId: string | null;
  spotifyAccount: SpotifyAccount | null;
  // The Spotify authorization was revoked or expired, the user has to link
  // their Spotify account again
  spotifyLinkExpired: boolean;
  expiresIn: number;
  accessToken: string | null;
  refreshToken: string | null;
  lastTimestamp: number;
  tracks: Schema.Types.ObjectId[];
  settings: {
    historyLine: boolean;
    preferredStatsPeriod: string;
    nbElements: number;
    metricUsed: "number" | "duration";
    darkMode: DarkModeType;
    timezone: string | undefined;
    dateFormat: string;
    blacklistedArtists: string[];
  };
  lastImport: string | null;
  publicToken: string | null;
  firstListenedAt?: Date;
}

export const UserSchema = new Schema<User>(
  {
    username: { type: String, required: true },
    admin: { type: Boolean, default: false },
    passwordHash: { type: String, default: null, select: false },
    spotifyId: { type: String, default: null },
    spotifyAccount: {
      type: {
        displayName: { type: String, default: null },
        email: { type: String, default: null },
        product: { type: String, default: null },
      },
      default: null,
    },
    spotifyLinkExpired: { type: Boolean, default: false },
    expiresIn: { type: Number, default: 0 },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    lastTimestamp: { type: Number, default: 0 },
    tracks: {
      type: [Schema.Types.ObjectId],
      ref: "Infos",
      select: false,
      default: [],
    },
    settings: {
      historyLine: { type: Boolean, default: true },
      preferredStatsPeriod: { type: String, default: "day" },
      nbElements: { type: Number, default: 10 },
      metricUsed: {
        type: String,
        enum: ["number", "duration"],
        default: "number",
      },
      darkMode: {
        type: String,
        enum: ["follow", "dark", "light"],
        default: "follow",
      },
      blacklistedArtists: [{ type: String }],
      timezone: { type: String, default: undefined, required: false },
      dateFormat: { type: String, required: true },
    },
    lastImport: { type: String, default: null },
    publicToken: { type: String, default: null, index: true },
    firstListenedAt: { type: Date },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// A Spotify account can only be linked to one user, users without a linked
// Spotify account are not indexed
UserSchema.index(
  { spotifyId: 1 },
  { unique: true, partialFilterExpression: { spotifyId: { $type: "string" } } },
);

// Usernames are used to log in, they are unique regardless of the case
export const USERNAME_COLLATION = { locale: "en", strength: 2 } as const;
UserSchema.index(
  { username: 1 },
  { unique: true, collation: USERNAME_COLLATION },
);
