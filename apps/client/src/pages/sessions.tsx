import { format } from "date-fns";
import { Hourglass } from "lucide-react";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, formatDuration, pluralize } from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useSessions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const sessions = useSessions(period);

  return (
    <>
      <PageHeader
        title={t("sessions.title")}
        description={`${t("sessions.description")} · ${period.label}`}
        icon={<Hourglass />}
      />
      {!sessions.data ? (
        <SectionCard title={t("common.loading")}>
          <ListSkeleton rows={5} />
        </SectionCard>
      ) : sessions.data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.data.map((session, index) => {
            const plays = session.distanceToLast.distance;
            const first = plays[0]?.info;
            const last = plays.at(-1)?.info;
            if (!first || !last) {
              return null;
            }
            const start = new Date(first.played_at);
            const end = new Date(
              new Date(last.played_at).getTime() + last.durationMs,
            );
            const tracks = plays.map((p) => session.full_tracks[p.info.id]);
            const distinct = new Set(plays.map((p) => p.info.id)).size;
            return (
              <Card key={first._id} className="gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl text-sm font-bold",
                        index === 0
                          ? "bg-chart-4 text-black"
                          : "bg-muted text-muted-foreground",
                      )}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {formatDate(start, "EEEE PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(start, "HH:mm")} → {format(end, "HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-sm">
                      {formatDuration(end.getTime() - start.getTime())}
                    </Badge>
                    <Badge variant="secondary">
                      {pluralize(plays.length, "play")}
                    </Badge>
                    <Badge variant="secondary">
                      {pluralize(distinct, "track")}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {plays.map((play, i) => {
                    const track = tracks[i];
                    return (
                      <Tooltip key={`${play.info._id}-${i}`}>
                        <TooltipTrigger asChild>
                          <Link
                            to={`/track/${play.info.id}${periodSearch}`}
                            className="shrink-0">
                            <Cover
                              images={track?.full_album?.images}
                              size={64}
                              className="size-12 transition-transform hover:scale-105"
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">
                            {track?.name ?? t("sessions.unknownTrack")}
                          </p>
                          <p className="text-xs opacity-80">
                            {format(new Date(play.info.played_at), "HH:mm")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
