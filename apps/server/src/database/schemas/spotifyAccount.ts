import { Schema, Types } from "mongoose";

// active: synced · expired: Spotify revoked the access, has to be linked
// again · untracked: kept for its history and profile link, never synced
export type SpotifyAccountStatus = "active" | "expired" | "untracked";

export interface SpotifyAccount {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  spotifyId: string;
  displayName: string | null;
  email: string | null;
  product: string | null;
  image: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  // Scopes granted by the user, some features need recent ones
  scopes: string[];
  status: SpotifyAccountStatus;
  // Used to play tracks and manage playlists
  primary: boolean;
  // Cursor of the recently played sync
  lastTimestamp: number;
  lastSyncAt: Date | null;
  lastPlayAt: Date | null;
  linkedAt: Date;
}

export const SpotifyAccountSchema = new Schema<SpotifyAccount>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  spotifyId: { type: String, required: true, unique: true },
  displayName: { type: String, default: null },
  email: { type: String, default: null },
  product: { type: String, default: null },
  image: { type: String, default: null },
  accessToken: { type: String, default: null, select: false },
  refreshToken: { type: String, default: null, select: false },
  expiresIn: { type: Number, default: 0 },
  scopes: { type: [String], default: [] },
  status: {
    type: String,
    enum: ["active", "expired", "untracked"],
    default: "active",
  },
  primary: { type: Boolean, default: false },
  lastTimestamp: { type: Number, default: 0 },
  lastSyncAt: { type: Date, default: null },
  lastPlayAt: { type: Date, default: null },
  linkedAt: { type: Date, default: () => new Date() },
});
