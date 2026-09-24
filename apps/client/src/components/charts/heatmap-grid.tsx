import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDuration,
  formatHour,
  pluralize,
  weekdayNames,
  weekdayShort,
} from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { HeatmapCell } from "@/services/apis/insights";

// Weekday x hour grid, the darker the more listening
export function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c]));
  const max = Math.max(1, ...cells.map((c) => c.durationMs));
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <div className="grid min-w-[36rem] grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1">
        <div />
        {hours.map((hour) => (
          <div
            key={hour}
            className="text-center text-[10px] text-muted-foreground tabular">
            {hour % 3 === 0 ? hour : ""}
          </div>
        ))}
        {weekdayNames().map((day, index) => (
          <div key={day} className="contents">
            <div className="flex items-center text-xs text-muted-foreground">
              {weekdayShort(day)}
            </div>
            {hours.map((hour) => {
              const cell = byKey.get(`${index + 1}-${hour}`);
              const intensity = cell ? cell.durationMs / max : 0;
              return (
                <Tooltip key={hour}>
                  <TooltipTrigger asChild>
                    <div
                      className="aspect-square rounded-[4px] bg-muted transition-transform hover:scale-110"
                      style={
                        intensity > 0
                          ? {
                              backgroundColor: `color-mix(in oklch, var(--chart-1) ${Math.round(
                                15 + intensity * 85,
                              )}%, var(--muted))`,
                            }
                          : undefined
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {day} {formatHour(hour)}
                    </p>
                    <p className="text-xs opacity-80">
                      {cell
                        ? `${formatDuration(cell.durationMs)} · ${pluralize(cell.plays, "play")}`
                        : t("common.nothing")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
