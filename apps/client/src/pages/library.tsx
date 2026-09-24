import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Disc3,
  Heart,
  HeartOff,
  Hourglass,
  Loader2,
  Percent,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { BarsChart } from "@/components/charts/bars-chart";
import { Cover } from "@/components/stats/cover";
import { TrackActions } from "@/components/stats/item-actions";
import { LikeButton } from "@/components/stats/like-button";
import { PageHeader } from "@/components/stats/page-header";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  ChartSkeleton,
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { StatCard } from "@/components/stats/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatTimeAgo,
  pluralize,
} from "@/lib/format";
import { translate as t, translatePlural } from "@/lib/i18n";
import { useCanLike } from "@/lib/library";
import { usePeriodSearch } from "@/lib/period";
import { queryClient } from "@/lib/queries";
import { api } from "@/services/apis/api";
import { LibraryEntry } from "@/services/apis/library";
import { selectPublicToken } from "@/services/redux/modules/user/selector";
import { SpotifyImage } from "@/services/types";

const imagesOf = (url: string | null): SpotifyImage[] =>
  url ? [{ url, width: 300, height: 300 }] : [];

function EntryRow({
  entry,
  rank,
  detail,
}: {
  entry: LibraryEntry;
  rank?: number;
  detail: string;
}) {
  const periodSearch = usePeriodSearch();
  return (
    <RankedRow
      rank={rank}
      images={imagesOf(entry.image)}
      to={`/track/${entry.id}${periodSearch}`}
      title={entry.name}
      subtitle={entry.artists.map((a) => a.name).join(", ")}
      value={detail}
      actions={
        <>
          <LikeButton type="track" id={entry.id} />
          <TrackActions
            trackId={entry.id}
            albumId={entry.album?.id}
            artistId={entry.artists[0]?.id}
          />
        </>
      }
    />
  );
}

export default function LibraryPage() {
  const scope = useSelector(selectPublicToken) ?? "me";
  const canLike = useCanLike();
  const periodSearch = usePeriodSearch();
  const [likesTab, setLikesTab] = useState("recent");
  const summary = useQuery({
    queryKey: ["library-summary", scope],
    queryFn: () => api.librarySummary().then((r) => r.data),
  });
  const s = summary.data;

  const refresh = () => {
    queryClient
      .invalidateQueries({ queryKey: ["library-summary"] })
      .catch(() => {});
    queryClient
      .invalidateQueries({ queryKey: ["library-ids"] })
      .catch(() => {});
  };

  const sync = useMutation({
    mutationFn: () => api.syncLibrary(),
    onSuccess: () => {
      toast.success(t("library.synced"));
      refresh();
    },
    onError: () => toast.error(t("library.error")),
  });

  const likeAll = useMutation({
    mutationFn: (minPlays: number) =>
      api.likePlayed(minPlays).then((r) => r.data),
    onSuccess: ({ liked }) => {
      toast.success(translatePlural("library.likedMany", liked));
      refresh();
    },
    onError: () => toast.error(t("library.error")),
  });

  const readable = s?.accounts.some((account) => account.canRead);
  const lastSync = s?.accounts
    .map((account) => account.syncedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  const months = (s?.likesPerMonth ?? [])
    .slice(-24)
    .map((row) => ({
      label: formatDate(`${row.month}-01T12:00:00`, "MMM yy"),
      value: row.count,
    }));

  return (
    <>
      <PageHeader
        title={t("library.title")}
        description={
          lastSync
            ? `${t("library.description")} · ${t("library.syncedAgo", { time: formatTimeAgo(lastSync) })}`
            : t("library.description")
        }
        icon={<Heart />}
        actions={
          canLike && (
            <Button
              variant="outline"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}>
              {sync.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {t("library.sync")}
            </Button>
          )
        }
      />

      {s && !readable ? (
        <EmptyState
          icon={<HeartOff />}
          title={t("library.notLinked")}
          description={t("library.notLinkedHint")}>
          {canLike === false && (
            <Button asChild>
              <Link to="/settings/account">{t("accounts.relink")}</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={t("library.likedTracks")}
              icon={<Heart />}
              loading={!s}
              value={s ? formatNumber(s.likedTracks) : ""}
            />
            <StatCard
              label={t("library.savedAlbums")}
              icon={<Disc3 />}
              accent="chart-2"
              loading={!s}
              value={s ? formatNumber(s.savedAlbums) : ""}
            />
            <StatCard
              label={t("library.likedShare")}
              icon={<Percent />}
              accent="chart-3"
              loading={!s}
              value={s ? formatPercent(s.likedShare) : ""}
              hint={t("library.likedShareHint")}
            />
            <StatCard
              label={t("library.neverPlayed")}
              icon={<Hourglass />}
              accent="chart-4"
              loading={!s}
              value={s ? formatNumber(s.neverPlayed.total) : ""}
              hint={
                s && s.likedTracks > 0
                  ? formatPercent(s.neverPlayed.total / s.likedTracks)
                  : undefined
              }
            />
          </div>

          <SectionCard
            title={t("library.perMonth")}
            description={t("library.perMonthDescription")}>
            {!s ? (
              <ChartSkeleton />
            ) : months.length === 0 ? (
              <EmptyState title={t("library.noLikes")} />
            ) : (
              <BarsChart
                data={months}
                label={t("library.likes")}
                highlightMax
                className="h-56"
              />
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title={t("library.notLiked")}
              description={
                s
                  ? t("library.notLikedDescription", {
                      count: formatNumber(s.notLiked.total),
                      plays: s.notLiked.minPlays,
                    })
                  : undefined
              }
              action={
                canLike &&
                s &&
                s.notLiked.total > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" disabled={likeAll.isPending}>
                        {likeAll.isPending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Heart />
                        )}
                        {t("library.likeAll")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("library.likeAllTitle", {
                            count: formatNumber(
                              Math.min(s.notLiked.total, 200),
                            ),
                          })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("library.likeAllText", {
                            plays: s.notLiked.minPlays,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => likeAll.mutate(s.notLiked.minPlays)}>
                          {t("library.likeAll")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              }>
              {!s ? (
                <ListSkeleton rows={6} />
              ) : s.notLiked.items.length === 0 ? (
                <EmptyState title={t("library.allLiked")} />
              ) : (
                <div className="flex flex-col">
                  {s.notLiked.items.map((item, index) => (
                    <RankedRow
                      key={item.track.id}
                      rank={index + 1}
                      images={item.album?.images}
                      to={`/track/${item.track.id}${periodSearch}`}
                      title={item.track.name}
                      subtitle={item.artist?.name}
                      value={pluralize(item.plays, "play")}
                      actions={
                        <>
                          <LikeButton type="track" id={item.track.id} />
                          <TrackActions
                            trackId={item.track.id}
                            albumId={item.album?.id}
                            artistId={item.artist?.id}
                          />
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title={t("library.neverPlayedTitle")}
              description={t("library.neverPlayedDescription")}>
              {!s ? (
                <ListSkeleton rows={6} />
              ) : s.neverPlayed.items.length === 0 ? (
                <EmptyState title={t("library.nothingUnplayed")} />
              ) : (
                <div className="flex flex-col">
                  {s.neverPlayed.items.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      detail={t("library.likedOn", {
                        date: formatDate(entry.addedAt, "PP"),
                      })}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title={t("library.likes")}
            action={
              <Tabs value={likesTab} onValueChange={setLikesTab}>
                <TabsList>
                  <TabsTrigger value="recent">
                    {t("library.recent")}
                  </TabsTrigger>
                  <TabsTrigger value="oldest">
                    {t("library.oldest")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }>
            {!s ? (
              <ListSkeleton rows={6} />
            ) : (
              <Tabs value={likesTab}>
                {(["recent", "oldest"] as const).map((tab) => (
                  <TabsContent
                    key={tab}
                    value={tab}
                    className="grid gap-x-6 lg:grid-cols-2">
                    {s[tab].map((entry, index) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        rank={index + 1}
                        detail={formatDate(entry.addedAt, "PP")}
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </SectionCard>

          <SectionCard
            title={t("library.albums")}
            description={
              s
                ? t("library.albumsDescription", {
                    count: formatNumber(s.savedAlbums),
                  })
                : undefined
            }>
            {!s ? (
              <ListSkeleton rows={3} />
            ) : s.albums.length === 0 ? (
              <EmptyState icon={<Sparkles />} title={t("library.noAlbums")} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {s.albums.map((album) => (
                  <Link
                    key={album.id}
                    to={`/album/${album.id}${periodSearch}`}
                    className="group relative flex min-w-0 flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-muted/60">
                    <Cover
                      images={imagesOf(album.image)}
                      className="aspect-square w-full shadow-sm transition-transform group-hover:scale-[1.02]"
                    />
                    <span className="truncate text-sm font-medium">
                      {album.name}
                    </span>
                    <span className="-mt-1.5 truncate text-xs text-muted-foreground">
                      {album.artists.map((a) => a.name).join(", ")}
                    </span>
                    <LikeButton
                      type="album"
                      id={album.id}
                      className="absolute top-3 right-3 bg-background/70 backdrop-blur"
                    />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
