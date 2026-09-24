import { useMutation, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { api } from "@/services/apis/api";
import { LibraryType, LikedIds } from "@/services/apis/library";
import {
  selectIsPublic,
  selectPublicToken,
  selectUser,
} from "@/services/redux/modules/user/selector";

import { translate as t } from "./i18n";
import { queryClient } from "./queries";

const LIBRARY_SCOPES = ["user-library-read", "user-library-modify"];

const idsKey = (scope: string) => ["library-ids", scope];

// Liking needs an account linked with the library scopes
export function useCanLike() {
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  return (
    !isPublic &&
    (user?.spotifyAccounts ?? []).some(
      (account) =>
        account.status === "active" &&
        LIBRARY_SCOPES.every((scope) => !account.missingScopes.includes(scope)),
    )
  );
}

export function useLikedIds() {
  const scope = useSelector(selectPublicToken) ?? "me";
  const query = useQuery({
    queryKey: idsKey(scope),
    queryFn: () => api.likedIds().then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const data = query.data;
  return {
    tracks: new Set(data?.tracks ?? []),
    albums: new Set(data?.albums ?? []),
    loaded: Boolean(data),
  };
}

export function useIsLiked(type: LibraryType, id: string) {
  const liked = useLikedIds();
  return (type === "track" ? liked.tracks : liked.albums).has(id);
}

const errorCode = (error: unknown) =>
  (error as { response?: { data?: { code?: string } } })?.response?.data?.code;

export function useToggleLike() {
  return useMutation({
    mutationFn: ({
      type,
      ids,
      saved,
    }: {
      type: LibraryType;
      ids: string[];
      saved: boolean;
    }) => api.changeLibrary(type, ids, saved).then((r) => r.data),
    onMutate: async ({ type, ids, saved }) => {
      const key = idsKey("me");
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<LikedIds>(key, (current) => {
        const field = type === "track" ? "tracks" : "albums";
        const list = new Set(current?.[field] ?? []);
        for (const id of ids) {
          if (saved) {
            list.add(id);
          } else {
            list.delete(id);
          }
        }
        return {
          tracks: current?.tracks ?? [],
          albums: current?.albums ?? [],
          [field]: [...list],
        };
      });
    },
    onSuccess: (data, { saved, type }) => {
      queryClient.setQueryData(idsKey("me"), data);
      toast.success(
        saved
          ? t(type === "track" ? "library.liked" : "library.albumSaved")
          : t(type === "track" ? "library.unliked" : "library.albumRemoved"),
      );
    },
    onError: (error) => {
      toast.error(
        errorCode(error) === "SPOTIFY_SCOPE_MISSING"
          ? t("library.scope")
          : t("library.error"),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: idsKey("me") }).catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["library-summary"] })
        .catch(() => {});
    },
  });
}
