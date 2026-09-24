import { Cake, History, Palette, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { BarList } from "@/components/charts/bar-list";
import { BarsChart } from "@/components/charts/bars-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import {
  ChartSkeleton,
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { StatCard } from "@/components/stats/stat-card";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber, formatPercent, pluralize } from "@/lib/format";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useComposition, useFeatRatio, useReleaseYears } from "@/lib/queries";
import { summarizeTaste, tasteHeadline } from "@/lib/taste";

const ALBUM_TYPE_LABELS: Record<string, string> = {
  album: "Albums",
  single: "Singles & EPs",
  compilation: "Compilations",
  unknown: "Unknown",
};

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function TastePage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const years = useReleaseYears(period);
  const composition = useComposition(period);
  const feat = useFeatRatio(period);

  const summary = years.data ? summarizeTaste(years.data) : null;
  const topYears = [...(years.data ?? [])]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);
  const featAverage = feat.data?.[0]?.average;

  return (
    <>
      <PageHeader
        title="Taste"
        description={`Your musical age, eras and style · ${period.label}`}
        icon={<Palette />}
      />

      {years.data && !summary ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-chart-2 to-chart-3 p-0 text-white lg:col-span-2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.3),transparent_40%)]" />
              <div className="relative flex h-full flex-col justify-between gap-8 p-6 md:p-8">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <Cake className="size-4" />
                  Your musical age
                </div>
                {summary ? (
                  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-7xl font-bold tracking-tighter tabular md:text-8xl">
                          {summary.musicalAge}
                        </span>
                        <span className="text-xl font-medium text-white/80">
                          years old
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-medium">
                        {tasteHeadline(summary)}
                      </p>
                      <p className="mt-1 max-w-md text-sm text-white/75">
                        Your taste sounds like someone born around{" "}
                        {summary.estimatedBirthYear}: half of what you play was
                        released in {summary.medianYear} or before.
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger className="w-fit rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                        How is it computed?
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        We tend to love most the music released around our late
                        teens. Your median release year minus 17 gives an
                        estimated birth year. Just for fun!
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <div className="h-24 w-48 animate-pulse rounded-lg bg-white/20" />
                )}
              </div>
            </Card>
            <div className="grid gap-4">
              <StatCard
                label="Nostalgia"
                icon={<History />}
                accent="chart-4"
                loading={!summary}
                value={summary ? formatPercent(summary.nostalgia) : ""}
                hint="of your plays are 10+ years old"
              />
              <StatCard
                label="Freshness"
                icon={<Sparkles />}
                loading={!summary}
                value={summary ? formatPercent(summary.freshness) : ""}
                hint="of your plays were released this year or last"
              />
            </div>
          </div>

          <SectionCard
            title="Release years"
            description={
              summary
                ? `Average release year: ${Math.round(summary.averageYear)}`
                : "Plays per release year"
            }>
            {years.data ? (
              <BarsChart
                className="h-64"
                label="Plays"
                valueFormatter={formatNumber}
                data={[...years.data]
                  .sort((a, b) => a.year - b.year)
                  .map((y) => ({ label: y.year.toString(), value: y.plays }))}
              />
            ) : (
              <ChartSkeleton />
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Top years"
              description="The years your music comes from, and their anthem">
              {years.data ? (
                <div className="flex flex-col gap-1">
                  {topYears.map((year, index) => (
                    <div
                      key={year.year}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
                      <span className="w-12 shrink-0 text-lg font-semibold tabular">
                        {year.year}
                      </span>
                      {year.top ? (
                        <Link
                          to={`/track/${year.top.track.id}${periodSearch}`}
                          className="flex min-w-0 flex-1 items-center gap-3">
                          <Cover
                            images={year.top.album?.images}
                            size={64}
                            className="size-10"
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">
                              {year.top.track.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {year.top.artist?.name}
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <span className="flex-1" />
                      )}
                      <div className="flex shrink-0 flex-col items-end">
                        <span className="text-sm font-medium tabular">
                          {pluralize(year.plays, "play")}
                        </span>
                        {index === 0 && (
                          <span className="text-xs text-primary">
                            Your top year
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ListSkeleton rows={6} />
              )}
            </SectionCard>
            <SectionCard
              title="Decades"
              description={
                summary?.topDecade
                  ? `The ${summary.topDecade.decade}s lead your plays`
                  : "Plays per decade"
              }>
              {summary ? (
                <BarList
                  items={[...summary.decades]
                    .sort((a, b) => b.plays - a.plays)
                    .map((d) => ({
                      key: d.decade.toString(),
                      label: `${d.decade}s`,
                      value: d.plays,
                      display: formatPercent(d.plays / summary.totalPlays),
                    }))}
                />
              ) : (
                <ListSkeleton rows={4} />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Formats" description="What kind of releases">
              {composition.data ? (
                <DonutChart
                  centerValue={formatNumber(
                    composition.data.albumTypes.reduce(
                      (s, t) => s + t.plays,
                      0,
                    ),
                  )}
                  centerLabel="plays"
                  data={composition.data.albumTypes
                    .sort((a, b) => b.plays - a.plays)
                    .map((t, i) => ({
                      key: t.type,
                      label: ALBUM_TYPE_LABELS[t.type] ?? t.type,
                      value: t.plays,
                      color: SLICE_COLORS[i % SLICE_COLORS.length]!,
                    }))}
                />
              ) : (
                <ChartSkeleton className="h-44" />
              )}
            </SectionCard>
            <SectionCard
              title="Explicit content"
              description="Parental advisory">
              {composition.data ? (
                <DonutChart
                  centerValue={formatPercent(
                    composition.data.explicit.explicit /
                      Math.max(
                        1,
                        composition.data.explicit.explicit +
                          composition.data.explicit.clean,
                      ),
                  )}
                  centerLabel="explicit"
                  data={[
                    {
                      key: "explicit",
                      label: "Explicit",
                      value: composition.data.explicit.explicit,
                      color: "var(--chart-5)",
                    },
                    {
                      key: "clean",
                      label: "Clean",
                      value: composition.data.explicit.clean,
                      color: "var(--chart-2)",
                    },
                  ]}
                />
              ) : (
                <ChartSkeleton className="h-44" />
              )}
            </SectionCard>
            <SectionCard
              title="Track length"
              description={
                featAverage
                  ? `${featAverage.toFixed(2)} artists per track on average`
                  : "How long your songs are"
              }
              action={<Users className="size-4 text-muted-foreground" />}>
              {composition.data ? (
                <BarList
                  color="var(--chart-3)"
                  items={composition.data.trackLengths.map((b) => ({
                    key: b.bucket,
                    label: b.bucket,
                    value: b.plays,
                    display: formatNumber(b.plays),
                  }))}
                />
              ) : (
                <ListSkeleton rows={5} />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
