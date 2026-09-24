import { SpotifyAccount, User } from "@/services/redux/modules/user/types";

export const spotifyProfileUrl = (spotifyId: string) =>
  `https://open.spotify.com/user/${spotifyId}`;

const accountsOf = (user: User | null | undefined) =>
  user?.spotifyAccounts ?? [];

// The account used to play and manage playlists (primary first)
export function usableAccount(
  user: User | null | undefined,
): SpotifyAccount | undefined {
  const active = accountsOf(user).filter((a) => a.status === "active");
  return active.find((a) => a.primary) ?? active[0];
}

export function canUseSpotify(
  user: User | null | undefined,
  isPublic: boolean,
) {
  return !isPublic && usableAccount(user) !== undefined;
}

export const hasAnyAccount = (user: User | null | undefined) =>
  accountsOf(user).length > 0;

export const hasActiveAccount = (user: User | null | undefined) =>
  accountsOf(user).some((a) => a.status === "active");

export const expiredAccounts = (user: User | null | undefined) =>
  accountsOf(user).filter((a) => a.status === "expired");

export const missesPlaylistScopes = (account: SpotifyAccount | undefined) =>
  Boolean(account?.missingScopes.some((s) => s.startsWith("playlist-")));

export const accountName = (account: SpotifyAccount) =>
  account.displayName ?? account.spotifyId;
