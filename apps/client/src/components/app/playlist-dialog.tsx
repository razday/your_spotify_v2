import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListMusic, Loader2, Plus, TriangleAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Cover } from "@/components/stats/cover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n";
import { api } from "@/services/apis/api";
import { getRequestErrorMessage } from "@/services/authErrors";
import { clearPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import { selectPlaylistContext } from "@/services/redux/modules/playlist/selector";
import { useAppDispatch } from "@/services/redux/tools";
import { getSpotifyLogUrl } from "@/services/tools";

const isScopeMissing = (error: unknown) =>
  (error as { response?: { data?: { code?: string } } })?.response?.data
    ?.code === "SPOTIFY_SCOPE_MISSING";

export function PlaylistDialog() {
  const t = useT();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const context = useSelector(selectPlaylistContext);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const playlists = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.getPlaylists().then((r) => r.data),
    enabled: context !== null,
    retry: false,
  });

  const close = () => {
    dispatch(clearPlaylistContext());
    setName("");
    setBusy(null);
  };

  const add = async (id: string | undefined, playlistName?: string) => {
    if (!context) {
      return;
    }
    setBusy(id ?? "new");
    try {
      await api.addToPlaylist(id, playlistName, context);
      toast.success(id ? t("playlist.added") : t("playlist.created"));
      queryClient
        .invalidateQueries({ queryKey: ["playlists"] })
        .catch(() => {});
      close();
    } catch (e) {
      toast.error(
        isScopeMissing(e)
          ? t("playlist.scopeMissing")
          : getRequestErrorMessage(e),
      );
      setBusy(null);
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      add(undefined, name.trim()).catch(() => {});
    }
  };

  const scopeMissing = isScopeMissing(playlists.error);

  return (
    <Dialog open={context !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("playlist.title")}</DialogTitle>
          <DialogDescription>{t("playlist.description")}</DialogDescription>
        </DialogHeader>
        {scopeMissing ? (
          <Alert>
            <TriangleAlert />
            <AlertDescription className="flex flex-col gap-3">
              {t("playlist.scopeMissing")}
              <Button asChild size="sm" className="w-fit">
                <a href={getSpotifyLogUrl()}>{t("playlist.relink")}</a>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <form onSubmit={create} className="flex gap-2">
              <Input
                placeholder={t("playlist.newName")}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Button type="submit" disabled={!name.trim() || busy !== null}>
                {busy === "new" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus />
                )}
                {t("playlist.create")}
              </Button>
            </form>
            <ScrollArea className="h-72 rounded-md border">
              <div className="flex flex-col p-1">
                {playlists.isLoading && (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("playlist.loading")}
                  </div>
                )}
                {playlists.isError && (
                  <div className="p-6 text-center text-sm text-destructive">
                    {getRequestErrorMessage(playlists.error) ||
                      t("playlist.loadError")}
                  </div>
                )}
                {playlists.data?.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {t("playlist.none")}
                  </div>
                )}
                {playlists.data?.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => add(playlist.id).catch(() => {})}
                    className="flex items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50">
                    {playlist.images && playlist.images.length > 0 ? (
                      <Cover images={playlist.images} className="size-9" />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                        <ListMusic className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="flex-1 truncate">{playlist.name}</span>
                    {busy === playlist.id && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
