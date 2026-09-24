import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListMusic, Loader2, Plus, TriangleAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Cover } from "@/components/stats/cover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { translatePlural, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import { getRequestErrorMessage } from "@/services/authErrors";
import { clearPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import { selectPlaylistContext } from "@/services/redux/modules/playlist/selector";
import { Playlist } from "@/services/redux/modules/playlist/types";
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
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Known tracks can be checked against the playlists
  const trackIds = context?.type === "specific" ? context.songIds : [];

  const playlists = useQuery({
    queryKey: ["playlists", trackIds],
    queryFn: () => api.getPlaylists(trackIds).then((r) => r.data),
    enabled: context !== null,
    retry: false,
  });

  const close = () => {
    dispatch(clearPlaylistContext());
    setName("");
    setSelected([]);
    setBusy(false);
  };

  // Every asked track is already there
  const complete = (playlist: Playlist) =>
    trackIds.length > 0 && playlist.contains === trackIds.length;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id],
    );

  const done = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ["playlists"] }).catch(() => {});
    close();
  };

  const fail = (e: unknown) => {
    toast.error(
      isScopeMissing(e)
        ? t("playlist.scopeMissing")
        : getRequestErrorMessage(e),
    );
    setBusy(false);
  };

  const addToSelected = async () => {
    if (!context || selected.length === 0) {
      return;
    }
    setBusy(true);
    let added = 0;
    let skipped = 0;
    try {
      for (const id of selected) {
        const { data } = await api.addToPlaylist(id, undefined, context);
        if (data && typeof data === "object") {
          added += data.added;
          skipped += data.skipped;
        }
      }
    } catch (e) {
      fail(e);
      return;
    }
    done(
      added === 0 && skipped > 0
        ? t("playlist.alreadyAll")
        : translatePlural("playlist.addedTo", selected.length),
    );
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || !name.trim()) {
      return;
    }
    setBusy(true);
    try {
      await api.addToPlaylist(undefined, name.trim(), context);
    } catch (e) {
      fail(e);
      return;
    }
    done(t("playlist.created"));
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
              <Button type="submit" disabled={!name.trim() || busy}>
                <Plus />
                {t("playlist.create")}
              </Button>
            </form>
            <ScrollArea className="h-72 rounded-md border">
              <div className="flex flex-col p-1">
                {playlists.isLoading && (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {trackIds.length > 0
                      ? t("playlist.checking")
                      : t("playlist.loading")}
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
                {playlists.data?.map((playlist) => {
                  const full = complete(playlist);
                  const partial =
                    !full &&
                    trackIds.length > 1 &&
                    (playlist.contains ?? 0) > 0;
                  const checked = selected.includes(playlist.id);
                  return (
                    <label
                      key={playlist.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm transition-colors hover:bg-muted",
                        checked && "bg-primary/8",
                        (full || busy) && "cursor-default opacity-60",
                      )}>
                      <Checkbox
                        checked={full || checked}
                        disabled={full || busy}
                        onCheckedChange={() => toggle(playlist.id)}
                      />
                      {playlist.images && playlist.images.length > 0 ? (
                        <Cover images={playlist.images} className="size-9" />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                          <ListMusic className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{playlist.name}</span>
                      {full && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="size-3" />
                          {t("playlist.alreadyIn")}
                        </Badge>
                      )}
                      {partial && (
                        <Badge variant="outline">
                          {t("playlist.partlyIn", {
                            count: playlist.contains ?? 0,
                            total: trackIds.length,
                          })}
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                disabled={selected.length === 0 || busy}
                onClick={() => addToSelected().catch(() => {})}>
                {busy && <Loader2 className="animate-spin" />}
                {selected.length === 0
                  ? t("playlist.pick")
                  : translatePlural("playlist.addTo", selected.length)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
