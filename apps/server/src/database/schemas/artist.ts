import { Schema } from "mongoose";

import { SpotifyImage } from "./types";

export interface Artist {
  external_urls: any;
  genres: string[];
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  type: string;
  uri: string;
  // Genres come from MusicBrainz, see tools/genres
  genresFetchedAt?: Date | null;
}
export type SpotifyArtist = Artist;

export const ArtistSchema = new Schema<Artist>(
  {
    external_urls: Object,
    genres: [String],
    href: String,
    id: { type: String, unique: true },
    images: [Object],
    name: String,
    type: String,
    uri: String,
    genresFetchedAt: { type: Date, required: false },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);
