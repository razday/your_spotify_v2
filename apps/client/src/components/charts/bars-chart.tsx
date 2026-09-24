import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  tooltipLabel?: string;
}

interface BarsChartProps {
  data: BarDatum[];
  label: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  // Emphasizes the highest bar
  highlightMax?: boolean;
  className?: string;
  hideYAxis?: boolean;
}

export function BarsChart({
  data,
  label,
  valueFormatter = (v) => v.toString(),
  color = "var(--chart-1)",
  highlightMax = true,
  className,
  hideYAxis,
}: BarsChartProps) {
  const config = { value: { label, color } } satisfies ChartConfig;
  const max = Math.max(0, ...data.map((d) => d.value));

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-56 w-full", className)}>
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={4}
          interval="preserveStartEnd"
        />
        {!hideYAxis && (
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(value: number) => valueFormatter(value)}
          />
        )}
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(value, payload) =>
                (payload?.[0]?.payload as BarDatum | undefined)?.tooltipLabel ??
                value
              }
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium tabular text-foreground">
                    {valueFormatter(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((datum) => (
            <Cell
              key={datum.label}
              fill="var(--color-value)"
              fillOpacity={
                highlightMax && max > 0
                  ? datum.value === max
                    ? 1
                    : 0.45
                  : 0.85
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
