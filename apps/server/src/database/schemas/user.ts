import { Schema, Types } from "mongoose";

export type DarkModeType = "follow" | "dark" | "light";

export type Language = "en" | "fr";

export interface User {
  _id: Types.ObjectId;
  username: string;
  admin: boolean;
  passwordHash?: string | null;
  // Spotify accounts are stored in their own collection (several per user)
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
    language: Language;
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
      language: { type: String, enum: ["en", "fr"], default: "en" },
    },
    lastImport: { type: String, default: null },
    publicToken: { type: String, default: null, index: true },
    firstListenedAt: { type: Date },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Usernames are used to log in, they are unique regardless of the case
export const USERNAME_COLLATION = { locale: "en", strength: 2 } as const;
UserSchema.index(
  { username: 1 },
  { unique: true, collation: USERNAME_COLLATION },
);
