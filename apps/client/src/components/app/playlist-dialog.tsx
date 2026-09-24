import { ListMusic, Loader2, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Cover } from "@/components/stats/cover";
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
import { clearPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import {
  selectPlaylistContext,
  selectPlaylists,
} from "@/services/redux/modules/playlist/selector";
import {
  addToPlaylist,
  fetchPlaylists,
} from "@/services/redux/modules/playlist/thunk";
import { useAppDispatch } from "@/services/redux/tools";

export function PlaylistDialog() {
  const dispatch = useAppDispatch();
  const context = useSelector(selectPlaylistContext);
  const playlists = useSelector(selectPlaylists);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (context && !playlists) {
      dispatch(fetchPlaylists()).catch(() => {});
    }
  }, [context, playlists, dispatch]);

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
      await dispatch(
        id
          ? addToPlaylist({ id, context })
          : addToPlaylist({ id: undefined, name: playlistName ?? "", context }),
      ).unwrap();
      toast.success(id ? "Added to the playlist" : "Playlist created");
      close();
    } catch {
      toast.error("Could not update the playlist");
      setBusy(null);
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      add(undefined, name.trim()).catch(() => {});
    }
  };

  return (
    <Dialog open={context !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to a playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist or pick one of yours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="flex gap-2">
          <Input
            placeholder="New playlist name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" disabled={!name.trim() || busy !== null}>
            {busy === "new" ? <Loader2 className="animate-spin" /> : <Plus />}
            Create
          </Button>
        </form>
        <ScrollArea className="h-72 rounded-md border">
          <div className="flex flex-col p-1">
            {playlists === null && (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading your playlists
              </div>
            )}
            {playlists?.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                You have no playlist yet.
              </div>
            )}
            {playlists?.map((playlist) => (
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
      </DialogContent>
    </Dialog>
  );
}
