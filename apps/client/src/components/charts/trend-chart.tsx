import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate } from "@/lib/format";
import { SeriesPoint } from "@/lib/series";
import { cn } from "@/lib/utils";

interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: SeriesPoint[];
  series: TrendSeries[];
  tooltipDateFormat: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function TrendChart({
  data,
  series,
  tooltipDateFormat,
  valueFormatter = (v) => v.toString(),
  className,
}: TrendChartProps) {
  const id = useId().replace(/:/g, "");
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-64 w-full", className)}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${id}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(value: number) => valueFormatter(value)}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as SeriesPoint | undefined;
                return point ? formatDate(point.date, tooltipDateFormat) : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-[2px]"
                      style={{ background: `var(--color-${name})` }}
                    />
                    {config[name as string]?.label}
                  </span>
                  <span className="font-mono font-medium tabular text-foreground">
                    {valueFormatter(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            fill={`url(#${id}-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
