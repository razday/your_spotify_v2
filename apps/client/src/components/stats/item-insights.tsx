import { format } from "date-fns";

import { BarsChart } from "@/components/charts/bars-chart";
import { ChartSkeleton, SectionCard } from "@/components/stats/section-card";
import { formatHour, formatNumber, WEEKDAYS } from "@/lib/format";
import { ItemTimeline } from "@/services/apis/insights";

// Months, hours and weekdays charts shared by the artist/album/track pages
export function ItemInsights({
  timeline,
}: {
  timeline: ItemTimeline | undefined;
}) {
  const months =
    timeline?.months.map((m) => {
      const date = new Date(`${m.month}-01T00:00:00`);
      return {
        label: format(date, "MMM yy"),
        tooltipLabel: format(date, "MMMM yyyy"),
        value: m.plays,
      };
    }) ?? [];
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    label: hour.toString(),
    tooltipLabel: formatHour(hour),
    value: timeline?.hours.find((h) => h.hour === hour)?.plays ?? 0,
  }));
  const weekdays = WEEKDAYS.map((day, index) => ({
    label: day.slice(0, 3),
    tooltipLabel: day,
    value: timeline?.weekdays.find((w) => w.weekday === index + 1)?.plays ?? 0,
  }));

  return (
    <>
      <SectionCard title="Plays over time" description="Per month, all time">
        {timeline ? (
          <BarsChart
            data={months}
            label="Plays"
            valueFormatter={formatNumber}
          />
        ) : (
          <ChartSkeleton className="h-56" />
        )}
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Hour of the day" description="Plays">
          {timeline ? (
            <BarsChart
              data={hours}
              label="Plays"
              valueFormatter={formatNumber}
              color="var(--chart-2)"
            />
          ) : (
            <ChartSkeleton className="h-56" />
          )}
        </SectionCard>
        <SectionCard title="Day of the week" description="Plays">
          {timeline ? (
            <BarsChart
              data={weekdays}
              label="Plays"
              valueFormatter={formatNumber}
              color="var(--chart-3)"
            />
          ) : (
            <ChartSkeleton className="h-56" />
          )}
        </SectionCard>
      </div>
    </>
  );
}
