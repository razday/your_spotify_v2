import { BarsChart } from "@/components/charts/bars-chart";
import { ChartSkeleton, SectionCard } from "@/components/stats/section-card";
import {
  formatDate,
  formatHour,
  formatNumber,
  weekdayNames,
  weekdayShort,
} from "@/lib/format";
import { translate as t } from "@/lib/i18n";
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
        label: formatDate(date, "MMM yy"),
        tooltipLabel: formatDate(date, "MMMM yyyy"),
        value: m.plays,
      };
    }) ?? [];
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    label: hour.toString(),
    tooltipLabel: formatHour(hour),
    value: timeline?.hours.find((h) => h.hour === hour)?.plays ?? 0,
  }));
  const weekdays = weekdayNames().map((day, index) => ({
    label: weekdayShort(day),
    tooltipLabel: day,
    value: timeline?.weekdays.find((w) => w.weekday === index + 1)?.plays ?? 0,
  }));

  return (
    <>
      <SectionCard
        title={t("details.overTime")}
        description={t("details.overTimeDescription")}>
        {timeline ? (
          <BarsChart
            data={months}
            label={t("unit.plays")}
            valueFormatter={formatNumber}
          />
        ) : (
          <ChartSkeleton className="h-56" />
        )}
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t("details.hourOfDay")}
          description={t("unit.plays")}>
          {timeline ? (
            <BarsChart
              data={hours}
              label={t("unit.plays")}
              valueFormatter={formatNumber}
              color="var(--chart-2)"
            />
          ) : (
            <ChartSkeleton className="h-56" />
          )}
        </SectionCard>
        <SectionCard
          title={t("details.dayOfWeek")}
          description={t("unit.plays")}>
          {timeline ? (
            <BarsChart
              data={weekdays}
              label={t("unit.plays")}
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
