import {
  addDays,
  differenceInCalendarWeeks,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/format";
import { CalendarDay } from "@/services/apis/insights";

interface CalendarHeatmapProps {
  days: CalendarDay[];
  start: Date;
  end: Date;
}

const LEVELS = [0, 0.25, 0.5, 0.75, 1];

// GitHub like calendar, one column per week, one square per day
export function CalendarHeatmap({ days, start, end }: CalendarHeatmapProps) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const max = Math.max(1, ...days.map((d) => d.durationMs));
  const firstWeek = startOfWeek(start, { weekStartsOn: 1 });
  const weeks =
    differenceInCalendarWeeks(end, firstWeek, { weekStartsOn: 1 }) + 1;
  const today = startOfDay(end);

  const columns = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_day, day) => addDays(firstWeek, week * 7 + day)),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex w-max gap-[3px]">
          {columns.map((column, index) => (
            <div key={index} className="flex flex-col gap-[3px]">
              <div className="h-4 text-[10px] text-muted-foreground">
                {column[0] && column[0].getDate() <= 7
                  ? format(column[0], "MMM")
                  : ""}
              </div>
              {column.map((date) => {
                const key = format(date, "yyyy-MM-dd");
                const outside = date < startOfDay(start) || date > today;
                const day = byDate.get(key);
                const intensity = day ? day.durationMs / max : 0;
                if (outside) {
                  return <div key={key} className="size-3" />;
                }
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div
                        className="size-3 rounded-[3px] bg-muted"
                        style={
                          intensity > 0
                            ? {
                                backgroundColor: `color-mix(in oklch, var(--chart-1) ${Math.round(
                                  25 + intensity * 75,
                                )}%, var(--muted))`,
                              }
                            : undefined
                        }
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{format(date, "EEEE, PP")}</p>
                      <p className="text-xs opacity-80">
                        {day
                          ? `${formatDuration(day.durationMs)} · ${day.plays} plays`
                          : "No listening"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        Less
        {LEVELS.map((level) => (
          <div
            key={level}
            className="size-3 rounded-[3px] bg-muted"
            style={
              level > 0
                ? {
                    backgroundColor: `color-mix(in oklch, var(--chart-1) ${Math.round(
                      25 + level * 75,
                    )}%, var(--muted))`,
                  }
                : undefined
            }
          />
        ))}
        More
      </div>
    </div>
  );
}
