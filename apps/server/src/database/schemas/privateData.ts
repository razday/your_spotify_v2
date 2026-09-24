import { Schema } from "mongoose";

export interface PrivateData {
  jwtPrivateKey: string;
  // Spotify app set by an admin, overrides SPOTIFY_PUBLIC / SPOTIFY_SECRET
  spotifyClientId?: string | null;
  spotifyClientSecret?: string | null;
}

export const PrivateDataSchema = new Schema<PrivateData>({
  jwtPrivateKey: String,
  spotifyClientId: { type: String, default: null },
  spotifyClientSecret: { type: String, default: null },
});
