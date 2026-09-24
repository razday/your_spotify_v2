import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { CalendarClock } from "lucide-react";

import { BarsChart } from "@/components/charts/bars-chart";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { HeatmapGrid } from "@/components/charts/heatmap-grid";
import { TrendChart } from "@/components/charts/trend-chart";
import { PageHeader } from "@/components/stats/page-header";
import {
  ChartSkeleton,
  EmptyState,
  SectionCard,
} from "@/components/stats/section-card";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  formatDuration,
  formatHour,
  formatNumber,
  pluralize,
  WEEKDAYS,
} from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { listeningProfile } from "@/lib/profile";
import {
  useCalendar,
  useDifferentArtistsPer,
  useHeatmap,
  useOverview,
  useSongsPer,
} from "@/lib/queries";
import { buildSeries, timesplitTooltipFormat } from "@/lib/series";

export default function HabitsPage() {
  const { period } = usePeriod();
  const heatmap = useHeatmap(period);
  const overview = useOverview(period);
  const songsPer = useSongsPer(period, period.timesplit);
  const artistsPer = useDifferentArtistsPer(period, period.timesplit);

  // Short periods look better on a full year calendar
  const calendarRange =
    differenceInCalendarDays(period.end, period.start) >= 84
      ? { start: period.start, end: period.end }
      : { start: startOfDay(subDays(period.end, 364)), end: period.end };
  const calendar = useCalendar(calendarRange);

  const cells = heatmap.data ?? [];
  const byWeekday = WEEKDAYS.map((day, index) => ({
    label: day.slice(0, 3),
    tooltipLabel: day,
    value: Math.round(
      cells
        .filter((c) => c.weekday === index + 1)
        .reduce((sum, c) => sum + c.durationMs, 0) / 60000,
    ),
  }));
  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    label: hour.toString(),
    tooltipLabel: `${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`,
    value: Math.round(
      cells
        .filter((c) => c.hour === hour)
        .reduce((sum, c) => sum + c.durationMs, 0) / 60000,
    ),
  }));
  const bestWeekday = byWeekday.reduce(
    (best, day) => (day.value > best.value ? day : best),
    byWeekday[0]!,
  );

  const artistsSeries = buildSeries(
    artistsPer.data,
    period.start,
    period.end,
    period.timesplit,
    (row) => ({ artists: row.differents }),
  );
  const variety = buildSeries(
    songsPer.data,
    period.start,
    period.end,
    period.timesplit,
    (row) => ({ tracks: row.differents }),
  ).map((point, index) => ({
    ...point,
    artists: artistsSeries[index]?.artists ?? 0,
  }));

  const traits = listeningProfile(cells, overview.data);
  const o = overview.data;

  return (
    <>
      <PageHeader
        title="Habits"
        description={`When and how you listen · ${period.label}`}
        icon={<CalendarClock />}
      />

      {heatmap.data && cells.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {traits.map((trait) => (
              <Card key={trait.key} className="gap-2 p-5">
                <span className="text-3xl">{trait.emoji}</span>
                <span className="font-semibold">{trait.title}</span>
                <span className="text-sm text-muted-foreground">
                  {trait.description}
                </span>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat
              label="Busiest day"
              value={o?.busiestDay ? formatDate(o.busiestDay.date, "PPP") : "—"}
              hint={
                o?.busiestDay
                  ? `${formatDuration(o.busiestDay.durationMs)} of music`
                  : undefined
              }
            />
            <MiniStat
              label="Favorite weekday"
              value={bestWeekday.value > 0 ? bestWeekday.tooltipLabel : "—"}
              hint={
                bestWeekday.value > 0
                  ? `${formatNumber(bestWeekday.value)} minutes`
                  : undefined
              }
            />
            <MiniStat
              label="Longest streak"
              value={o ? pluralize(o.longestStreak.days, "day") : "—"}
              hint={
                o?.longestStreak.start && o.longestStreak.end
                  ? `${formatDate(o.longestStreak.start, "PP")} → ${formatDate(o.longestStreak.end, "PP")}`
                  : undefined
              }
            />
          </div>

          <SectionCard
            title="Listening calendar"
            description={
              calendarRange.start === period.start
                ? period.label
                : "Last 12 months"
            }>
            {calendar.data ? (
              <CalendarHeatmap
                days={calendar.data}
                start={calendarRange.start}
                end={calendarRange.end}
              />
            ) : (
              <ChartSkeleton className="h-32" />
            )}
          </SectionCard>

          <SectionCard
            title="Week at a glance"
            description="Listening time per day of the week and hour">
            {heatmap.data ? <HeatmapGrid cells={cells} /> : <ChartSkeleton />}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="By day of the week" description="Minutes">
              {heatmap.data ? (
                <BarsChart
                  data={byWeekday}
                  label="Minutes"
                  valueFormatter={formatNumber}
                />
              ) : (
                <ChartSkeleton className="h-56" />
              )}
            </SectionCard>
            <SectionCard title="By hour of the day" description="Minutes">
              {heatmap.data ? (
                <BarsChart
                  data={byHour}
                  label="Minutes"
                  valueFormatter={formatNumber}
                  color="var(--chart-2)"
                />
              ) : (
                <ChartSkeleton className="h-56" />
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Variety"
            description="Different tracks and artists you played">
            {songsPer.data && artistsPer.data ? (
              <TrendChart
                data={variety}
                tooltipDateFormat={timesplitTooltipFormat[period.timesplit]}
                series={[
                  { key: "tracks", label: "Tracks", color: "var(--chart-1)" },
                  { key: "artists", label: "Artists", color: "var(--chart-3)" },
                ]}
                valueFormatter={formatNumber}
              />
            ) : (
              <ChartSkeleton />
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}

function MiniStat({
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
      <span className="text-xl font-semibold tracking-tight">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  );
}
