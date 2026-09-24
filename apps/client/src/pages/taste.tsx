import { Cake, History, Palette, Sparkles, Tags, Users } from "lucide-react";
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
import {
  formatDecimal,
  formatNumber,
  formatPercent,
  pluralize,
} from "@/lib/format";
import { MessageKey, translate as t } from "@/lib/i18n";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import {
  useComposition,
  useFeatRatio,
  useGenres,
  useReleaseYears,
} from "@/lib/queries";
import { summarizeTaste, tasteHeadline } from "@/lib/taste";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const formatLabel = (type: string) =>
  ["album", "single", "compilation"].includes(type)
    ? t(`taste.format.${type}` as MessageKey)
    : t("taste.format.unknown");

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default function TastePage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const years = useReleaseYears(period);
  const composition = useComposition(period);
  const feat = useFeatRatio(period);
  const genres = useGenres(period, 12);

  const summary = years.data ? summarizeTaste(years.data) : null;
  const topYears = [...(years.data ?? [])]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);
  const featAverage = feat.data?.[0]?.average;
  const g = genres.data;
  const genresCoverage =
    g && g.totalPlays > 0 ? g.coveredPlays / g.totalPlays : 0;

  return (
    <>
      <PageHeader
        title={t("taste.title")}
        description={`${t("taste.description")} · ${period.label}`}
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
                  {t("taste.musicalAge")}
                </div>
                {summary ? (
                  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-7xl font-bold tracking-tighter tabular md:text-8xl">
                          {summary.musicalAge}
                        </span>
                        <span className="text-xl font-medium text-white/80">
                          {t("taste.yearsOld")}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-medium">
                        {tasteHeadline(summary)}
                      </p>
                      <p className="mt-1 max-w-md text-sm text-white/75">
                        {t("taste.bornAround", {
                          year: summary.estimatedBirthYear,
                          median: summary.medianYear,
                        })}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger className="w-fit rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                        {t("taste.how")}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {t("taste.howDescription")}
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
                label={t("taste.nostalgia")}
                icon={<History />}
                accent="chart-4"
                loading={!summary}
                value={summary ? formatPercent(summary.nostalgia) : ""}
                hint={t("taste.nostalgiaHint")}
              />
              <StatCard
                label={t("taste.freshness")}
                icon={<Sparkles />}
                loading={!summary}
                value={summary ? formatPercent(summary.freshness) : ""}
                hint={t("taste.freshnessHint")}
              />
            </div>
          </div>

          <SectionCard
            title={t("taste.genres")}
            description={
              g && g.genres.length > 0
                ? t("taste.genresDescription", {
                    percent: Math.round(genresCoverage * 100),
                  })
                : undefined
            }
            action={<Tags className="size-4 text-muted-foreground" />}>
            {!g ? (
              <ListSkeleton rows={4} />
            ) : g.genres.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("taste.genresPending")}
              </p>
            ) : (
              <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                {g.genres.map((genre, index) => {
                  const share =
                    g.coveredPlays > 0 ? genre.plays / g.coveredPlays : 0;
                  return (
                    <div
                      key={genre.genre}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60">
                      <span className="w-5 text-sm font-semibold text-muted-foreground tabular">
                        {index + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {capitalize(genre.genre)}
                          </span>
                          <span className="text-xs text-muted-foreground tabular">
                            {formatPercent(share)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(3, share * 100)}%`,
                              background:
                                SLICE_COLORS[index % SLICE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {genre.topArtists.filter(Boolean).map((artist) => (
                          <Link
                            key={artist.id}
                            to={`/artist/${artist.id}${periodSearch}`}
                            title={artist.name}>
                            <Cover
                              images={artist.images}
                              rounded
                              className="size-7 ring-2 ring-card"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t("taste.releaseYears")}
            description={
              summary
                ? t("taste.averageYear", {
                    year: Math.round(summary.averageYear),
                  })
                : t("taste.playsPerYear")
            }>
            {years.data ? (
              <BarsChart
                className="h-64"
                label={t("unit.plays")}
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
              title={t("taste.topYears")}
              description={t("taste.topYearsDescription")}>
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
                            {t("taste.topYear")}
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
              title={t("taste.decades")}
              description={
                summary?.topDecade
                  ? t("taste.decadeLeads", { decade: summary.topDecade.decade })
                  : t("taste.playsPerDecade")
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
            <SectionCard
              title={t("taste.formats")}
              description={t("taste.formatsDescription")}>
              {composition.data ? (
                <DonutChart
                  centerValue={formatNumber(
                    composition.data.albumTypes.reduce(
                      (sum, x) => sum + x.plays,
                      0,
                    ),
                  )}
                  centerLabel={t("unit.plays").toLowerCase()}
                  data={[...composition.data.albumTypes]
                    .sort((a, b) => b.plays - a.plays)
                    .map((type, index) => ({
                      key: type.type,
                      label: formatLabel(type.type),
                      value: type.plays,
                      color: SLICE_COLORS[index % SLICE_COLORS.length]!,
                    }))}
                />
              ) : (
                <ChartSkeleton className="h-44" />
              )}
            </SectionCard>
            <SectionCard
              title={t("taste.explicit")}
              description={t("taste.explicitDescription")}>
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
                  centerLabel={t("taste.explicitLabel").toLowerCase()}
                  data={[
                    {
                      key: "explicit",
                      label: t("taste.explicitLabel"),
                      value: composition.data.explicit.explicit,
                      color: "var(--chart-5)",
                    },
                    {
                      key: "clean",
                      label: t("taste.clean"),
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
              title={t("taste.trackLength")}
              description={
                featAverage
                  ? t("taste.artistsPerTrack", {
                      value: formatDecimal(featAverage, 2),
                    })
                  : t("taste.trackLengthDescription")
              }
              action={<Users className="size-4 text-muted-foreground" />}>
              {composition.data ? (
                <BarList
                  color="var(--chart-3)"
                  items={composition.data.trackLengths.map((bucket) => ({
                    key: bucket.bucket,
                    label: bucket.bucket,
                    value: bucket.plays,
                    display: formatNumber(bucket.plays),
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
