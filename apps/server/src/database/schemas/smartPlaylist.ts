import { Schema, Types } from "mongoose";

export const SMART_PLAYLIST_KINDS = [
  "top-month",
  "top-year",
  "top-all",
  "discoveries",
  "forgotten",
  "night",
  "year",
  "liked-unplayed",
] as const;

export type SmartPlaylistKind = (typeof SMART_PLAYLIST_KINDS)[number];

export type SmartPlaylistRefresh = "daily" | "weekly" | "never";

// A Spotify playlist filled and kept up to date by the app
export interface SmartPlaylist {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  account: Types.ObjectId;
  playlistId: string;
  kind: SmartPlaylistKind;
  // Release year, for the "year" kind
  year: number | null;
  size: number;
  refresh: SmartPlaylistRefresh;
  lastRefreshAt: Date | null;
  createdAt: Date;
}

export const SmartPlaylistSchema = new Schema<SmartPlaylist>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  account: {
    type: Schema.Types.ObjectId,
    ref: "SpotifyAccount",
    required: true,
  },
  playlistId: { type: String, required: true, unique: true },
  kind: { type: String, enum: SMART_PLAYLIST_KINDS, required: true },
  year: { type: Number, default: null },
  size: { type: Number, default: 50 },
  refresh: {
    type: String,
    enum: ["daily", "weekly", "never"],
    default: "weekly",
  },
  lastRefreshAt: { type: Date, default: null },
  createdAt: { type: Date, default: () => new Date() },
});
