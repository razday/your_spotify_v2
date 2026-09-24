import { Disc3, MicVocal, Music2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useT } from "@/lib/i18n";
import { usePeriodSearch } from "@/lib/period";
import { useSearch } from "@/lib/queries";

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

export function SearchCommand() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 250);
  const { data, isFetching } = useSearch(debounced);
  const navigate = useNavigate();
  const periodSearch = usePeriodSearch();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (url: string) => {
    setOpen(false);
    setTerm("");
    navigate(`${url}${periodSearch}`);
  };

  const hasResults =
    data &&
    (data.artists.length > 0 ||
      data.tracks.length > 0 ||
      data.albums.length > 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 justify-start gap-2 px-2 font-normal text-muted-foreground sm:w-56 sm:px-3"
        onClick={() => setOpen(true)}>
        <Search className="size-4" />
        <span className="hidden sm:inline">{t("header.search")}</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("search.title")}
        description={t("search.description")}
        shouldFilter={false}>
        <CommandInput
          placeholder={t("search.placeholder")}
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          {debounced.trim().length < 2 ? (
            <CommandEmpty>{t("search.minLength")}</CommandEmpty>
          ) : !hasResults ? (
            <CommandEmpty>
              {isFetching ? t("search.searching") : t("search.noResult")}
            </CommandEmpty>
          ) : null}
          {data && data.artists.length > 0 && (
            <CommandGroup heading={t("search.artists")}>
              {data.artists.map((artist) => (
                <CommandItem
                  key={artist.id}
                  value={`artist-${artist.id}`}
                  onSelect={() => go(`/artist/${artist.id}`)}>
                  <Cover images={artist.images} rounded className="size-8" />
                  <span className="truncate">{artist.name}</span>
                  <MicVocal className="ml-auto text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data && data.tracks.length > 0 && (
            <CommandGroup heading={t("search.tracks")}>
              {data.tracks.map((track) => (
                <CommandItem
                  key={track.id}
                  value={`track-${track.id}`}
                  onSelect={() => go(`/track/${track.id}`)}>
                  <Cover images={track.full_album?.images} className="size-8" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{track.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {track.full_artists?.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                  <Music2 className="ml-auto text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data && data.albums.length > 0 && (
            <CommandGroup heading={t("search.albums")}>
              {data.albums.map((album) => (
                <CommandItem
                  key={album.id}
                  value={`album-${album.id}`}
                  onSelect={() => go(`/album/${album.id}`)}>
                  <Cover images={album.images} className="size-8" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{album.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {album.full_artists?.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                  <Disc3 className="ml-auto text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
