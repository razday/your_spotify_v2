import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  Hourglass,
  ImagePlus,
  ListMusic,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { BarsChart } from "@/components/charts/bars-chart";
import { Cover } from "@/components/stats/cover";
import { DetailHero, Pill } from "@/components/stats/detail-hero";
import { LikeButton } from "@/components/stats/like-button";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { StatCard } from "@/components/stats/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTimeAgo,
  formatTrackLength,
  pluralize,
} from "@/lib/format";
import { translate as t, translatePlural } from "@/lib/i18n";
import { usePeriodSearch } from "@/lib/period";
import { addToQueue } from "@/lib/player";
import { queryClient } from "@/lib/queries";
import { generateCover, smartMeta } from "@/lib/smart-playlists";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import { PlaylistDetails, PlaylistItem } from "@/services/apis/library";
import { SpotifyImage } from "@/services/types";

import { RefreshSelect, smartTitle } from "./playlists";

const imagesOf = (url: string | null): SpotifyImage[] =>
  url ? [{ url, width: 300, height: 300 }] : [];

// Spotify escapes the description
function decode(text: string | null) {
  if (!text) {
    return "";
  }
  const element = document.createElement("textarea");
  element.innerHTML = text;
  return element.value;
}

function EditDialog({
  details,
  open,
  onClose,
  onSaved,
}: {
  details: PlaylistDetails["playlist"];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(details.name);
  const [description, setDescription] = useState(decode(details.description));
  const [isPublic, setIsPublic] = useState(Boolean(details.public));
  const save = useMutation({
    mutationFn: () =>
      api.updatePlaylist(details.accountId, details.id, {
        name: name.trim(),
        description: description.trim(),
        public: isPublic,
      }),
    onSuccess: () => {
      toast.success(t("playlists.saved"));
      onSaved();
      onClose();
    },
    onError: () => toast.error(t("playlist.error")),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("playlists.edit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="playlist-name">{t("playlists.name")}</Label>
            <Input
              id="playlist-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="playlist-description">
              {t("playlists.descriptionLabel")}
            </Label>
            <Textarea
              id="playlist-description"
              value={description}
              maxLength={300}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="font-medium">{t("playlists.public")}</span>
              <span className="block text-xs text-muted-foreground">
                {t("playlists.publicHint")}
              </span>
            </span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending && <Loader2 className="animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrackRow({
  item,
  index,
  count,
  editable,
  busy,
  onMove,
  onRemove,
}: {
  item: PlaylistItem;
  index: number;
  count: number;
  editable: boolean;
  busy: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const periodSearch = usePeriodSearch();
  const title = item.known ? (
    <Link
      to={`/track/${item.id}${periodSearch}`}
      className="truncate font-medium hover:underline">
      {item.name}
    </Link>
  ) : (
    <span className="truncate font-medium">{item.name}</span>
  );
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <span className="w-7 shrink-0 text-center text-xs text-muted-foreground tabular">
        {index + 1}
      </span>
      <Cover images={imagesOf(item.image)} size={64} className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col text-sm">
        {title}
        <span className="truncate text-xs text-muted-foreground">
          {item.artists.map((a) => a.name).join(", ")}
          {item.album ? ` · ${item.album.name}` : ""}
        </span>
      </div>
      <div className="hidden w-28 shrink-0 text-right text-xs md:block">
        {item.plays > 0 ? (
          <span className="font-medium tabular">
            {pluralize(item.plays, "play")}
          </span>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {t("playlists.neverPlayedBadge")}
          </Badge>
        )}
      </div>
      <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground lg:block">
        {item.addedAt ? formatDate(item.addedAt, "PP") : ""}
      </span>
      <span className="hidden w-12 shrink-0 text-right text-xs text-muted-foreground tabular sm:block">
        {formatTrackLength(item.durationMs)}
      </span>
      {item.id && item.type === "track" && (
        <LikeButton type="track" id={item.id} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            disabled={busy}>
            <MoreHorizontal />
            <span className="sr-only">{t("actions.label")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.id && item.type === "track" && (
            <DropdownMenuItem
              onSelect={() => addToQueue(item.id!).catch(() => {})}>
              {t("player.addToQueue")}
            </DropdownMenuItem>
          )}
          {item.id && (
            <DropdownMenuItem asChild>
              <a
                href={`https://open.spotify.com/${item.type}/${item.id}`}
                target="_blank"
                rel="noreferrer">
                <ExternalLink />
                {t("common.openSpotify")}
              </a>
            </DropdownMenuItem>
          )}
          {editable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={index === 0}
                onSelect={() => onMove(index - 1)}>
                <ArrowUp />
                {t("playlists.moveUp")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === count - 1}
                onSelect={() => onMove(index + 1)}>
                <ArrowDown />
                {t("playlists.moveDown")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === 0}
                onSelect={() => onMove(0)}>
                <ArrowUp />
                {t("playlists.moveTop")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                <Trash2 />
                {t("playlists.remove")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function PlaylistPage() {
  const { accountId = "", id = "" } = useParams();
  const periodSearch = usePeriodSearch();
  const [editing, setEditing] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "never">("all");
  const key = ["playlist", accountId, id];
  const query = useQuery({
    queryKey: key,
    queryFn: () => api.playlist(accountId, id).then((r) => r.data),
  });
  const data = query.data;

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: key }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["playlists"] }).catch(() => {});
  };

  const change = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onError: () => toast.error(t("playlist.error")),
    onSettled: reload,
  });

  const refreshSmart = useMutation({
    mutationFn: (smartId: string) => api.refreshSmartPlaylist(smartId),
    onSuccess: () => toast.success(t("smart.refreshedShort")),
    onError: () => toast.error(t("smart.error")),
    onSettled: reload,
  });

  const updateSmart = useMutation({
    mutationFn: ({
      smartId,
      refresh,
    }: {
      smartId: string;
      refresh: "daily" | "weekly" | "never";
    }) => api.updateSmartPlaylist(smartId, { refresh }),
    onSettled: reload,
  });

  if (query.isError) {
    return (
      <EmptyState
        icon={<ListMusic />}
        title={t("playlists.notFound")}
        description={t("playlists.notFoundHint")}>
        <Button asChild variant="outline">
          <Link to="/playlists">{t("playlists.back")}</Link>
        </Button>
      </EmptyState>
    );
  }
  if (!data) {
    return (
      <>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <ListSkeleton rows={8} />
      </>
    );
  }

  const { playlist, stats, items, smart } = data;
  const editable = playlist.editable;
  const shown =
    filter === "never" ? items.filter((item) => item.plays === 0) : items;

  const makeCover = async () => {
    setCoverBusy(true);
    const title = smart ? smartTitle(smart) : playlist.name;
    const done = await generateCover(
      accountId,
      id,
      title,
      smart ? smartMeta(smart.kind).theme : "green",
    );
    setCoverBusy(false);
    if (done) {
      toast.success(t("playlists.coverDone"));
      // Spotify takes a few seconds to process the image
      setTimeout(reload, 3000);
    }
  };

  const dedupe = () =>
    change.mutate(async () => {
      const { data: result } = await api.dedupePlaylist(accountId, id);
      toast.success(translatePlural("playlists.dedupeDone", result.removed));
    });

  return (
    <>
      <DetailHero
        kind={smart ? t("playlists.smartKind") : t("playlists.kind")}
        title={playlist.name}
        images={playlist.images ?? []}
        subtitle={
          <span className="line-clamp-2">
            {decode(playlist.description) ||
              t("playlists.by", { owner: playlist.owner })}
          </span>
        }
        pills={
          <>
            <Pill>
              <ListMusic />
              {pluralize(stats.tracks, "track")}
            </Pill>
            <Pill>
              <Clock />
              {formatDuration(stats.durationMs)}
            </Pill>
            <Pill highlight>
              <Headphones />
              {pluralize(stats.totalPlays, "play")}
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <a
                href={`https://open.spotify.com/playlist/${playlist.id}`}
                target="_blank"
                rel="noreferrer">
                <ExternalLink />
                {t("common.spotify")}
              </a>
            </Button>
            {editable && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  {t("playlists.edit")}
                </Button>
                <Button
                  variant="outline"
                  disabled={coverBusy}
                  onClick={() => makeCover().catch(() => {})}>
                  {coverBusy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ImagePlus />
                  )}
                  {t("playlists.cover")}
                </Button>
              </>
            )}
          </>
        }
      />

      {smart && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-primary/6 p-4">
          <Sparkles className="size-5 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">
              {t("smart.bannerTitle")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(smartMeta(smart.kind).description, { year: smart.year ?? "" })}
              {smart.lastRefreshAt
                ? ` · ${t("smart.updatedAgo", { time: formatTimeAgo(smart.lastRefreshAt) })}`
                : ""}
            </span>
          </div>
          <RefreshSelect
            value={smart.refresh}
            onChange={(refresh) =>
              updateSmart.mutate({ smartId: smart.id, refresh })
            }
          />
          <Button
            variant="outline"
            size="sm"
            disabled={refreshSmart.isPending}
            onClick={() => refreshSmart.mutate(smart.id)}>
            <RefreshCw
              className={cn(refreshSmart.isPending && "animate-spin")}
            />
            {t("smart.refreshNow")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("playlists.tracks")}
          icon={<ListMusic />}
          value={formatNumber(stats.tracks)}
          hint={formatDuration(stats.durationMs)}
        />
        <StatCard
          label={t("playlists.plays")}
          icon={<Headphones />}
          accent="chart-2"
          value={formatNumber(stats.totalPlays)}
          hint={t("playlists.playsHint")}
        />
        <StatCard
          label={t("playlists.neverPlayed")}
          icon={<Hourglass />}
          accent="chart-4"
          value={formatNumber(stats.neverPlayed)}
          hint={
            stats.tracks > 0
              ? formatPercent(stats.neverPlayed / stats.tracks)
              : undefined
          }
        />
        <StatCard
          label={t("playlists.duplicates")}
          icon={<Copy />}
          accent="chart-5"
          value={formatNumber(
            stats.duplicates.reduce((sum, d) => sum + d.count - 1, 0),
          )}
          hint={
            stats.duplicates.length > 0 && editable ? (
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0 text-xs"
                disabled={change.isPending}
                onClick={dedupe}>
                {t("playlists.dedupe")}
              </Button>
            ) : (
              t("playlists.noDuplicates")
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title={t("playlists.decades")}
          description={t("playlists.decadesDescription")}>
          {stats.decades.length === 0 ? (
            <EmptyState />
          ) : (
            <BarsChart
              data={stats.decades.map((row) => ({
                label: `${row.decade}s`,
                value: row.count,
              }))}
              label={t("playlists.tracks")}
              highlightMax
              className="h-52"
            />
          )}
        </SectionCard>
        <SectionCard className="lg:col-span-2" title={t("playlists.artists")}>
          {stats.topArtists.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topArtists.map((artist) => (
                <div key={artist.id} className="flex items-center gap-3">
                  <Link
                    to={`/artist/${artist.id}${periodSearch}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                    {artist.name}
                  </Link>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(artist.count / stats.topArtists[0]!.count) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground tabular">
                    {artist.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={t("playlists.content")}
        action={
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-xs">
            {(["all", "never"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium text-muted-foreground",
                  filter === value && "bg-background text-foreground shadow-sm",
                )}>
                {value === "all"
                  ? t("playlists.filterAll")
                  : t("playlists.filterNever")}
              </button>
            ))}
          </div>
        }>
        {shown.length === 0 ? (
          <EmptyState title={t("playlists.empty")} />
        ) : (
          <div className="flex flex-col">
            {shown.map((item) => (
              <TrackRow
                key={`${item.uri}-${item.position}`}
                item={item}
                index={item.position}
                count={items.length}
                editable={editable && filter === "all"}
                busy={change.isPending}
                onMove={(to) =>
                  change.mutate(() =>
                    api.moveInPlaylist(
                      accountId,
                      id,
                      item.position,
                      to,
                      playlist.snapshotId,
                    ),
                  )
                }
                onRemove={() =>
                  change.mutate(async () => {
                    await api.removeFromPlaylist(accountId, id, [item.uri]);
                    toast.success(t("playlists.removed"));
                  })
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      {editing && (
        <EditDialog
          details={playlist}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={reload}
        />
      )}
    </>
  );
}
