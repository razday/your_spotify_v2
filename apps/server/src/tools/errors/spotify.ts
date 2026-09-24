import { YourSpotifyError } from "./error";

// The user has no usable Spotify authorization: never linked, unlinked, or
// revoked/expired on Spotify's side. They have to link Spotify again.
export class SpotifyNotLinkedError extends YourSpotifyError {
  type = "CONFLICT" as const;
  code = "SPOTIFY_NOT_LINKED";

  constructor(message = "Spotify account is not linked") {
    super(message);
  }
}
