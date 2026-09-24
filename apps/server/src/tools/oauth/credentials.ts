import { get } from "../env";

export const credentials = {
  spotify: {
    public: get("SPOTIFY_PUBLIC"),
    secret: get("SPOTIFY_SECRET"),
    scopes: [
      "user-read-private",
      "user-read-email",
      "user-read-recently-played",
      "user-modify-playback-state",
      "playlist-modify-private",
      "playlist-modify-public",
      // Listing the user's playlists (add to an existing playlist)
      "playlist-read-private",
      "playlist-read-collaborative",
    ].join(" "),
    redirectUri: `${get("API_ENDPOINT")}/oauth/spotify/callback`,
  },
};
