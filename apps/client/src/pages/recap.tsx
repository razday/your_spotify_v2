import { endOfYear, format, startOfYear } from "date-fns";
import { Loader2, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";

import { BarsChart } from "@/components/charts/bars-chart";
import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import { EmptyState } from "@/components/stats/section-card";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  formatDuration,
  formatHour,
  formatMinutes,
  formatNumber,
  pickImage,
  pluralize,
} from "@/lib/format";
import { listeningProfile } from "@/lib/profile";
import {
  useHeatmap,
  useOverview,
  useReleaseYears,
  useTimePer,
  useTopAlbums,
  useTopArtists,
  useTopTracks,
} from "@/lib/queries";
import { summarizeTaste } from "@/lib/taste";
import { cn } from "@/lib/utils";
import { selectUser } from "@/services/redux/modules/user/selector";
import { Timesplit } from "@/services/types";

function Slide({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 p-6 text-white md:p-10",
        className,
      )}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.22),transparent_45%)]" />
      <div className="relative">{children}</div>
    </Card>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-widest text-white/70 uppercase">
      {children}
    </p>
  );
}

export default function RecapPage() {
  const user = useSelector(selectUser);
  const [params, setParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const firstYear = user?.firstListenedAt
    ? new Date(user.firstListenedAt).getFullYear()
    : currentYear;
  const years = Array.from(
    { length: currentYear - firstYear + 1 },
    (_, i) => currentYear - i,
  );
  const year = Number(params.get("year")) || currentYear;

  const start = startOfYear(new Date(year, 0, 1));
  const endOfSelected = endOfYear(start);
  const range = {
    start,
    end:
      endOfSelected.getTime() > Date.now()
        ? new Date(new Date().setSeconds(0, 0))
        : endOfSelected,
  };

  const overview = useOverview(range);
  const artists = useTopArtists(range, 5);
  const tracks = useTopTracks(range, 5);
  const albums = useTopAlbums(range, 1);
  const releaseYears = useReleaseYears(range);
  const heatmap = useHeatmap(range);
  const months = useTimePer(range, Timesplit.month);

  const o = overview.data;
  const topArtist = artists.data?.[0];
  const topAlbum = albums.data?.[0];
  const taste = releaseYears.data ? summarizeTaste(releaseYears.data) : null;
  const topReleaseYear = [...(releaseYears.data ?? [])].sort(
    (a, b) => b.plays - a.plays,
  )[0];
  const traits = listeningProfile(heatmap.data ?? [], o);

  const monthData = Array.from({ length: 12 }, (_, month) => {
    const row = months.data?.find((m) => m._id?.month === month + 1);
    return {
      label: format(new Date(year, month, 1), "MMM"),
      tooltipLabel: format(new Date(year, month, 1), "MMMM yyyy"),
      value: Math.round((row?.count ?? 0) / 60000),
    };
  });
  const bestMonth = monthData.reduce(
    (best, m) => (m.value > best.value ? m : best),
    monthData[0]!,
  );

  const yearPicker = (
    <Select
      value={year.toString()}
      onValueChange={(value) => {
        const next = new URLSearchParams(params);
        next.set("year", value);
        setParams(next);
      }}>
      <SelectTrigger className="h-8 w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={y.toString()}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageHeader
        title="Recap"
        description="Your year in music, wrapped"
        icon={<Sparkles />}
        actions={yearPicker}
      />

      {!o ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : o.plays === 0 ? (
        <EmptyState
          title={`Nothing recorded in ${year}`}
          description="Pick another year, or import your Spotify history from the settings."
        />
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Slide className="bg-gradient-to-br from-primary via-chart-2 to-chart-3">
            <Kicker>Your {year} in music</Kicker>
            <p className="mt-6 text-6xl font-bold tracking-tighter tabular md:text-8xl">
              {formatMinutes(o.durationMs)}
            </p>
            <p className="mt-2 text-xl font-medium md:text-2xl">
              minutes of music
            </p>
            <p className="mt-4 max-w-xl text-white/80">
              That is {formatDuration(o.durationMs)} over{" "}
              {pluralize(o.activeDays, "day")}, {formatNumber(o.plays)} plays of{" "}
              {formatNumber(o.uniqueTracks)} different tracks by{" "}
              {formatNumber(o.uniqueArtists)} artists.
            </p>
          </Slide>

          {topArtist && (
            <Slide className="min-h-96 bg-zinc-900 p-0 md:p-0">
              {pickImage(topArtist.artist.images, 640) && (
                <img
                  src={pickImage(topArtist.artist.images, 640)}
                  alt=""
                  className="absolute inset-0 size-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
              <div className="relative grid gap-8 p-6 md:grid-cols-2 md:p-10">
                <div className="flex flex-col justify-end">
                  <Kicker>Artist of the year</Kicker>
                  <Link
                    to={`/artist/${topArtist.artist.id}`}
                    className="mt-3 text-4xl font-bold tracking-tight hover:underline md:text-6xl">
                    {topArtist.artist.name}
                  </Link>
                  <p className="mt-3 text-white/80">
                    {formatDuration(topArtist.duration_ms)} together ·{" "}
                    {pluralize(topArtist.count, "play")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl bg-black/35 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold text-white/70">
                    Top 5 artists
                  </p>
                  {artists.data?.map((item, index) => (
                    <Link
                      key={item.artist.id}
                      to={`/artist/${item.artist.id}`}
                      className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/10">
                      <span className="w-5 text-lg font-bold text-white/60 tabular">
                        {index + 1}
                      </span>
                      <Cover
                        images={item.artist.images}
                        rounded
                        className="size-10"
                      />
                      <span className="flex-1 truncate font-medium">
                        {item.artist.name}
                      </span>
                      <span className="text-sm text-white/70 tabular">
                        {formatMinutes(item.duration_ms)} min
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Slide>
          )}

          <div className="grid gap-6 md:grid-cols-5">
            <Slide className="bg-gradient-to-br from-chart-3 to-chart-5 md:col-span-3">
              <Kicker>Songs of the year</Kicker>
              <div className="mt-6 flex flex-col gap-3">
                {tracks.data?.map((item, index) => (
                  <Link
                    key={item.track.id}
                    to={`/track/${item.track.id}`}
                    className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/10">
                    <span className="w-6 text-2xl font-bold text-white/60 tabular">
                      {index + 1}
                    </span>
                    <Cover
                      images={item.album.images}
                      className="size-12 shadow-lg"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">
                        {item.track.name}
                      </span>
                      <span className="truncate text-sm text-white/75">
                        {item.artist.name}
                      </span>
                    </div>
                    <span className="text-sm text-white/75 tabular">
                      {pluralize(item.count, "play")}
                    </span>
                  </Link>
                ))}
              </div>
            </Slide>
            <Slide className="bg-gradient-to-br from-chart-4 to-chart-5 md:col-span-2">
              <Kicker>Album of the year</Kicker>
              {topAlbum && (
                <Link
                  to={`/album/${topAlbum.album.id}`}
                  className="group mt-6 flex flex-col gap-4">
                  <Cover
                    images={topAlbum.album.images}
                    size={400}
                    className="aspect-square w-full max-w-64 shadow-2xl transition-transform group-hover:scale-[1.02]"
                  />
                  <div>
                    <p className="text-2xl font-bold tracking-tight">
                      {topAlbum.album.name}
                    </p>
                    <p className="text-white/80">
                      {topAlbum.artist.name} ·{" "}
                      {pluralize(topAlbum.count, "play")}
                    </p>
                  </div>
                </Link>
              )}
            </Slide>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <RecapNumber
              label="New artists"
              value={formatNumber(o.newArtists)}
              hint="discovered this year"
            />
            <RecapNumber
              label="Longest streak"
              value={pluralize(o.longestStreak.days, "day")}
              hint="in a row with music"
            />
            <RecapNumber
              label="Biggest day"
              value={
                o.busiestDay ? formatDate(o.busiestDay.date, "MMM d") : "—"
              }
              hint={
                o.busiestDay
                  ? formatDuration(o.busiestDay.durationMs)
                  : undefined
              }
            />
            <RecapNumber
              label="Golden hour"
              value={o.favoriteHour !== null ? formatHour(o.favoriteHour) : "—"}
              hint="your most musical hour"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {taste && (
              <Slide className="bg-gradient-to-br from-chart-2 to-primary">
                <Kicker>Musical age</Kicker>
                <p className="mt-4 text-7xl font-bold tracking-tighter tabular">
                  {taste.musicalAge}
                </p>
                <p className="mt-1 text-lg font-medium">years old in {year}</p>
                {topReleaseYear && (
                  <p className="mt-4 text-white/80">
                    Your favorite release year was {topReleaseYear.year}
                    {topReleaseYear.top
                      ? `, led by "${topReleaseYear.top.track.name}"`
                      : ""}
                    .
                  </p>
                )}
              </Slide>
            )}
            {traits.length > 0 && (
              <Slide className="bg-gradient-to-br from-zinc-800 to-zinc-950">
                <Kicker>Your listening personality</Kicker>
                <div className="mt-6 flex flex-col gap-4">
                  {traits.slice(0, 3).map((trait) => (
                    <div key={trait.key} className="flex gap-3">
                      <span className="text-3xl">{trait.emoji}</span>
                      <div>
                        <p className="font-semibold">{trait.title}</p>
                        <p className="text-sm text-white/70">
                          {trait.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Slide>
            )}
          </div>

          <Card className="gap-4 p-6">
            <div>
              <p className="font-semibold">Month by month</p>
              <p className="text-sm text-muted-foreground">
                {bestMonth.value > 0
                  ? `${bestMonth.tooltipLabel} was your most musical month`
                  : "Minutes per month"}
              </p>
            </div>
            <BarsChart
              data={monthData}
              label="Minutes"
              valueFormatter={formatNumber}
            />
          </Card>
        </div>
      )}
    </>
  );
}

function RecapNumber({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-1 p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  );
}
