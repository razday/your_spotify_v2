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
      // Player: now playing, controls, queue
      "user-read-playback-state",
      "user-read-currently-playing",
      // Asked now so a single relink unlocks the next features: official
      // tops, library, followed artists, playlist covers
      "user-top-read",
      "user-library-read",
      "user-library-modify",
      "user-follow-read",
      "user-follow-modify",
      "ugc-image-upload",
    ].join(" "),
    redirectUri: `${get("API_ENDPOINT")}/oauth/spotify/callback`,
  },
};
