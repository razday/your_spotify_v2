import {
  ArrowRight,
  Clock3,
  Flame,
  Headphones,
  MicVocal,
  Music2,
  Telescope,
} from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { BarsChart } from "@/components/charts/bars-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Cover } from "@/components/stats/cover";
import { TrackActions } from "@/components/stats/item-actions";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  ChartSkeleton,
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Delta, StatCard } from "@/components/stats/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDuration,
  formatHour,
  formatNumber,
  formatTimeAgo,
  pickImage,
  pluralize,
} from "@/lib/format";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import {
  useOverview,
  useRecentTracks,
  useSongsPer,
  useTimePer,
  useHeatmap,
  useTopAlbums,
  useTopArtists,
  useTopTracks,
} from "@/lib/queries";
import { buildSeries, timesplitTooltipFormat } from "@/lib/series";
import { selectUser } from "@/services/redux/modules/user/selector";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const user = useSelector(selectUser);
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const [metric, setMetric] = useState<"time" | "plays">("time");

  const overview = useOverview(period);
  const previous = useOverview(period.previous);
  const timePer = useTimePer(period, period.timesplit);
  const songsPer = useSongsPer(period, period.timesplit);
  const perHour = useHeatmap(period);
  const topArtists = useTopArtists(period, 6);
  const topTracks = useTopTracks(period, 6);
  const topAlbums = useTopAlbums(period, 6);
  const recent = useRecentTracks(8);

  const o = overview.data;
  const p = previous.data;

  const series =
    metric === "time"
      ? buildSeries(
          timePer.data,
          period.start,
          period.end,
          period.timesplit,
          (r) => ({ minutes: Math.round(r.count / 60000) }),
        )
      : buildSeries(
          songsPer.data,
          period.start,
          period.end,
          period.timesplit,
          (r) => ({ plays: r.count }),
        );

  const hourData = Array.from({ length: 24 }, (_, hour) => {
    const durationMs = (perHour.data ?? [])
      .filter((cell) => cell.hour === hour)
      .reduce((sum, cell) => sum + cell.durationMs, 0);
    return {
      label: hour.toString(),
      tooltipLabel: `${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`,
      value: Math.round(durationMs / 60000),
    };
  });

  const topArtist = topArtists.data?.[0];
  const noData = o && o.plays === 0;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{period.label}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {greeting()}, {user?.username}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Listening time"
          icon={<Clock3 />}
          loading={!o}
          value={o ? formatDuration(o.durationMs) : ""}
          delta={o && <Delta current={o.durationMs} previous={p?.durationMs} />}
          hint={
            o &&
            o.activeDays > 0 &&
            `${formatDuration(o.durationMs / o.activeDays)} per active day`
          }
        />
        <StatCard
          label="Plays"
          icon={<Headphones />}
          accent="chart-2"
          loading={!o}
          value={o ? formatNumber(o.plays) : ""}
          delta={o && <Delta current={o.plays} previous={p?.plays} />}
          hint={o && pluralize(o.activeDays, "active day")}
        />
        <StatCard
          label="Tracks"
          icon={<Music2 />}
          accent="chart-3"
          loading={!o}
          value={o ? formatNumber(o.uniqueTracks) : ""}
          delta={
            o && <Delta current={o.uniqueTracks} previous={p?.uniqueTracks} />
          }
          hint={o && `${pluralize(o.uniqueAlbums, "album")}`}
        />
        <StatCard
          label="Artists"
          icon={<MicVocal />}
          accent="chart-4"
          loading={!o}
          value={o ? formatNumber(o.uniqueArtists) : ""}
          delta={
            o && <Delta current={o.uniqueArtists} previous={p?.uniqueArtists} />
          }
          hint={
            o &&
            o.uniqueArtists > 0 &&
            `${(o.plays / o.uniqueArtists).toFixed(1)} plays per artist`
          }
        />
        <StatCard
          label="Discoveries"
          icon={<Telescope />}
          accent="chart-5"
          loading={!o}
          value={o ? formatNumber(o.newArtists) : ""}
          hint={o && `new artists · ${pluralize(o.newTracks, "new track")}`}
        />
        <StatCard
          label="Streak"
          icon={<Flame />}
          accent="chart-4"
          loading={!o}
          value={o ? pluralize(o.currentStreak, "day") : ""}
          hint={o && `Best: ${pluralize(o.longestStreak.days, "day")} in a row`}
        />
      </div>

      {noData ? (
        <EmptyState
          title="No listening in this period"
          description="Try a longer period with the selector at the top right. If you just linked Spotify, your first plays arrive within a few minutes."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              className="xl:col-span-2"
              title="Listening over time"
              description={period.label}
              action={
                <Tabs
                  value={metric}
                  onValueChange={(v) => setMetric(v as "time" | "plays")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="time" className="text-xs">
                      Minutes
                    </TabsTrigger>
                    <TabsTrigger value="plays" className="text-xs">
                      Plays
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              }>
              {(metric === "time" ? timePer.data : songsPer.data) ? (
                <TrendChart
                  data={series}
                  tooltipDateFormat={timesplitTooltipFormat[period.timesplit]}
                  series={[
                    metric === "time"
                      ? {
                          key: "minutes",
                          label: "Minutes",
                          color: "var(--chart-1)",
                        }
                      : {
                          key: "plays",
                          label: "Plays",
                          color: "var(--chart-2)",
                        },
                  ]}
                  valueFormatter={(v) => formatNumber(v)}
                />
              ) : (
                <ChartSkeleton />
              )}
            </SectionCard>

            <TopArtistSpotlight
              loading={topArtists.isLoading}
              artist={topArtist}
              periodSearch={periodSearch}
              totalMs={o?.durationMs}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <SectionCard
              title="Top artists"
              action={<SeeAll to={`/top/artists${periodSearch}`} />}>
              {topArtists.data ? (
                <div className="flex flex-col">
                  {topArtists.data.slice(0, 5).map((item, index) => (
                    <RankedRow
                      key={item.artist.id}
                      rank={index + 1}
                      rounded
                      images={item.artist.images}
                      title={item.artist.name}
                      subtitle={pluralize(item.count, "play")}
                      value={formatDuration(item.duration_ms)}
                      to={`/artist/${item.artist.id}${periodSearch}`}
                    />
                  ))}
                </div>
              ) : (
                <ListSkeleton rounded />
              )}
            </SectionCard>
            <SectionCard
              title="Top tracks"
              action={<SeeAll to={`/top/tracks${periodSearch}`} />}>
              {topTracks.data ? (
                <div className="flex flex-col">
                  {topTracks.data.slice(0, 5).map((item, index) => (
                    <RankedRow
                      key={item.track.id}
                      rank={index + 1}
                      images={item.album.images}
                      title={item.track.name}
                      subtitle={item.artist.name}
                      value={pluralize(item.count, "play")}
                      to={`/track/${item.track.id}${periodSearch}`}
                    />
                  ))}
                </div>
              ) : (
                <ListSkeleton />
              )}
            </SectionCard>
            <SectionCard
              className="lg:col-span-2 xl:col-span-1"
              title="Top albums"
              action={<SeeAll to={`/top/albums${periodSearch}`} />}>
              {topAlbums.data ? (
                <div className="grid grid-cols-3 gap-3">
                  {topAlbums.data.slice(0, 6).map((item, index) => (
                    <Link
                      key={item.album.id}
                      to={`/album/${item.album.id}${periodSearch}`}
                      className="group flex min-w-0 flex-col gap-1.5">
                      <div className="relative">
                        <Cover
                          images={item.album.images}
                          className="aspect-square w-full transition-transform group-hover:scale-[1.03]"
                        />
                        <span className="absolute top-1 left-1 rounded-md bg-background/85 px-1.5 text-xs font-semibold backdrop-blur">
                          {index + 1}
                        </span>
                      </div>
                      <span className="truncate text-xs font-medium">
                        {item.album.name}
                      </span>
                      <span className="-mt-1 truncate text-xs text-muted-foreground">
                        {item.artist.name}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <ListSkeleton rows={3} />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              className="xl:col-span-2"
              title="When you listen"
              description={
                o?.favoriteHour !== null && o?.favoriteHour !== undefined
                  ? `Your favorite hour is ${formatHour(o.favoriteHour)}`
                  : "Minutes per hour of the day"
              }
              action={<SeeAll to={`/habits${periodSearch}`} label="Habits" />}>
              {perHour.data ? (
                <BarsChart
                  data={hourData}
                  label="Minutes"
                  valueFormatter={(v) => formatNumber(v)}
                />
              ) : (
                <ChartSkeleton className="h-56" />
              )}
            </SectionCard>
            <SectionCard
              title="Recently played"
              action={
                <SeeAll to={`/history${periodSearch}`} label="History" />
              }>
              {recent.data ? (
                <div className="flex flex-col">
                  {recent.data.map((play) => (
                    <RankedRow
                      key={play._id}
                      images={play.track.full_album?.images}
                      title={play.track.name}
                      subtitle={play.track.full_artists
                        ?.map((a) => a.name)
                        .join(", ")}
                      secondary={formatTimeAgo(play.played_at)}
                      to={`/track/${play.track.id}${periodSearch}`}
                      actions={
                        <TrackActions
                          trackId={play.track.id}
                          albumId={play.track.album}
                          artistId={play.track.artists[0]}
                        />
                      }
                    />
                  ))}
                </div>
              ) : (
                <ListSkeleton />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}

function SeeAll({ to, label = "See all" }: { to: string; label?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
      <Link to={to}>
        {label}
        <ArrowRight />
      </Link>
    </Button>
  );
}

function TopArtistSpotlight({
  artist,
  loading,
  periodSearch,
  totalMs,
}: {
  artist:
    | {
        artist: {
          id: string;
          name: string;
          images: { url: string; width: number; height: number }[];
        };
        count: number;
        duration_ms: number;
        differents: number;
      }
    | undefined;
  loading: boolean;
  periodSearch: string;
  totalMs: number | undefined;
}) {
  const image = pickImage(artist?.artist.images, 640);
  return (
    <Card className="relative min-h-72 overflow-hidden border-0 p-0">
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full scale-105 object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-chart-2/30 to-chart-3/40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <div className="relative flex h-full min-h-72 flex-col justify-end gap-2 p-6 text-white">
        <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
          #1 artist
        </span>
        {loading ? (
          <div className="h-8 w-40 animate-pulse rounded bg-white/20" />
        ) : artist ? (
          <>
            <Link
              to={`/artist/${artist.artist.id}${periodSearch}`}
              className="text-3xl font-semibold tracking-tight hover:underline">
              {artist.artist.name}
            </Link>
            <p className="text-sm text-white/80">
              {formatDuration(artist.duration_ms)} ·{" "}
              {pluralize(artist.count, "play")} ·{" "}
              {pluralize(artist.differents, "track")}
              {totalMs
                ? ` · ${Math.round((artist.duration_ms / totalMs) * 100)}% of your time`
                : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-white/80">No artist yet</p>
        )}
      </div>
    </Card>
  );
}
