import { format, isToday, isYesterday } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { TrackActions } from "@/components/stats/item-actions";
import { PageHeader } from "@/components/stats/page-header";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Badge } from "@/components/ui/badge";
import { useOnVisible } from "@/hooks/use-in-view";
import { formatDuration, formatTrackLength, pluralize } from "@/lib/format";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useHistory } from "@/lib/queries";
import { TrackInfoWithFullArtistAlbum } from "@/services/types";

function dayTitle(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

export default function HistoryPage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const query = useHistory(period);
  const plays = query.data?.pages.flat() ?? [];
  const sentinel = useOnVisible<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage().catch(() => {});
    }
  }, Boolean(query.hasNextPage));

  const days: {
    key: string;
    date: Date;
    plays: TrackInfoWithFullArtistAlbum[];
  }[] = [];
  for (const play of plays) {
    const date = new Date(play.played_at);
    const key = format(date, "yyyy-MM-dd");
    const last = days.at(-1);
    if (last?.key === key) {
      last.plays.push(play);
    } else {
      days.push({ key, date, plays: [play] });
    }
  }

  return (
    <>
      <PageHeader
        title="History"
        description={`Everything you listened to · ${period.label}`}
        icon={<History />}
      />
      {query.isLoading ? (
        <SectionCard title="Loading">
          <ListSkeleton rows={10} />
        </SectionCard>
      ) : plays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => {
            const total = day.plays.reduce((sum, p) => sum + p.durationMs, 0);
            return (
              <SectionCard
                key={day.key}
                title={dayTitle(day.date)}
                action={
                  <Badge variant="secondary" className="tabular">
                    {pluralize(day.plays.length, "play")} ·{" "}
                    {formatDuration(total)}
                  </Badge>
                }
                contentClassName="px-2 sm:px-4">
                <div className="flex flex-col">
                  {day.plays.map((play) => (
                    <div
                      key={play._id}
                      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
                      <span className="w-11 shrink-0 text-xs text-muted-foreground tabular">
                        {format(new Date(play.played_at), "HH:mm")}
                      </span>
                      <Cover
                        images={play.track.full_album?.images}
                        size={64}
                        className="size-10"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          to={`/track/${play.track.id}${periodSearch}`}
                          className="truncate text-sm font-medium hover:underline">
                          {play.track.name}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {play.track.full_artists?.map((artist, index) => (
                            <span key={artist.id}>
                              {index > 0 && ", "}
                              <Link
                                to={`/artist/${artist.id}${periodSearch}`}
                                className="hover:text-foreground hover:underline">
                                {artist.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </div>
                      <Link
                        to={`/album/${play.track.album}${periodSearch}`}
                        className="hidden w-56 truncate text-xs text-muted-foreground hover:text-foreground hover:underline lg:block">
                        {play.track.full_album?.name}
                      </Link>
                      <span className="hidden w-12 text-right text-xs text-muted-foreground tabular sm:block">
                        {formatTrackLength(play.track.duration_ms)}
                      </span>
                      <TrackActions
                        trackId={play.track.id}
                        albumId={play.track.album}
                        artistId={play.track.artists[0]}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
          <div ref={sentinel} className="flex justify-center py-4">
            {query.isFetchingNextPage && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
