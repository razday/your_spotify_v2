import { Schema, Types } from "mongoose";

export type LibraryItemType = "track" | "album";

// A track liked or an album saved on one Spotify account
export interface LibraryItem {
  owner: Types.ObjectId;
  // Spotify id of the account
  account: string;
  type: LibraryItemType;
  id: string;
  addedAt: Date;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string } | null;
  image: string | null;
  durationMs: number | null;
  releaseDate: string | null;
}

export const LibraryItemSchema = new Schema<LibraryItem>({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  account: { type: String, required: true },
  type: { type: String, enum: ["track", "album"], required: true },
  id: { type: String, required: true },
  addedAt: { type: Date, required: true },
  name: { type: String, default: "" },
  artists: { type: [{ _id: false, id: String, name: String }], default: [] },
  album: {
    type: new Schema({ id: String, name: String }, { _id: false }),
    default: null,
  },
  image: { type: String, default: null },
  durationMs: { type: Number, default: null },
  releaseDate: { type: String, default: null },
});

LibraryItemSchema.index({ account: 1, type: 1, id: 1 }, { unique: true });
LibraryItemSchema.index({ owner: 1, type: 1, addedAt: -1 });
