import { Repeat2, Sparkle, Telescope } from "lucide-react";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { TrackActions } from "@/components/stats/item-actions";
import { PageHeader } from "@/components/stats/page-header";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { StatCard } from "@/components/stats/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useDiscoveries, useOverview, useRepeats } from "@/lib/queries";

export default function DiscoveriesPage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const discoveries = useDiscoveries(period, 24);
  const repeats = useRepeats(period, 12);
  const overview = useOverview(period);
  const d = discoveries.data;
  const o = overview.data;

  return (
    <>
      <PageHeader
        title="Discoveries"
        description={`What was new to your ears · ${period.label}`}
        icon={<Telescope />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="New artists"
          icon={<Sparkle />}
          loading={!d}
          value={d ? formatNumber(d.totalArtists) : ""}
          hint={
            o && o.uniqueArtists > 0 && d
              ? `${Math.round((d.totalArtists / o.uniqueArtists) * 100)}% of the artists you played`
              : undefined
          }
        />
        <StatCard
          label="New tracks"
          icon={<Sparkle />}
          accent="chart-2"
          loading={!d}
          value={d ? formatNumber(d.totalTracks) : ""}
          hint={
            o && o.uniqueTracks > 0 && d
              ? `${Math.round((d.totalTracks / o.uniqueTracks) * 100)}% of the tracks you played`
              : undefined
          }
        />
        <StatCard
          label="Obsessions"
          icon={<Repeat2 />}
          accent="chart-5"
          loading={!repeats.data}
          value={repeats.data ? formatNumber(repeats.data.length) : ""}
          hint="tracks played several times in a single day"
        />
      </div>

      <SectionCard
        title="New artists"
        description="Artists you listened to for the first time, most played first">
        {!d ? (
          <ListSkeleton rows={3} rounded />
        ) : d.artists.length === 0 ? (
          <EmptyState
            title="No new artist"
            description="You stayed with artists you already knew."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {d.artists.map((item) => (
              <Link
                key={item.artist.id}
                to={`/artist/${item.artist.id}${periodSearch}`}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-muted/60">
                <Cover
                  images={item.artist.images}
                  rounded
                  className="aspect-square w-full max-w-32 shadow-sm transition-transform group-hover:scale-[1.03]"
                />
                <span className="w-full truncate text-sm font-medium">
                  {item.artist.name}
                </span>
                <span className="-mt-1.5 text-xs text-muted-foreground">
                  {pluralize(item.plays, "play")} · since{" "}
                  {formatDate(item.firstListenedAt, "MMM d")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="New tracks"
          description="First listened during this period">
          {!d ? (
            <ListSkeleton rows={6} />
          ) : d.tracks.length === 0 ? (
            <EmptyState title="No new track" />
          ) : (
            <div className="flex flex-col">
              {d.tracks.slice(0, 12).map((item) => (
                <RankedRow
                  key={item.track.id}
                  images={item.album?.images}
                  title={item.track.name}
                  subtitle={item.artist?.name}
                  to={`/track/${item.track.id}${periodSearch}`}
                  value={pluralize(item.plays, "play")}
                  secondary={`first ${formatDate(item.firstListenedAt, "MMM d")}`}
                  actions={
                    <TrackActions
                      trackId={item.track.id}
                      albumId={item.album?.id}
                      artistId={item.artist?.id}
                    />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title="On repeat"
          description="The most plays of a track in a single day">
          {!repeats.data ? (
            <ListSkeleton rows={6} />
          ) : repeats.data.length === 0 ? (
            <EmptyState
              title="Nothing on repeat"
              description="No track was played twice the same day."
            />
          ) : (
            <div className="flex flex-col">
              {repeats.data.map((item) => (
                <RankedRow
                  key={`${item.track.id}-${item.day}`}
                  images={item.album?.images}
                  title={item.track.name}
                  subtitle={item.artist?.name}
                  to={`/track/${item.track.id}${periodSearch}`}
                  value={
                    <Badge variant="secondary" className="tabular">
                      ×{item.plays}
                    </Badge>
                  }
                  secondary={formatDate(item.day, "PP")}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
