import { Label, Pie, PieChart } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  className?: string;
}

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const config = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.color }]),
  ) satisfies ChartConfig;
  const pieData = data.map((d) => ({ ...d, fill: `var(--color-${d.key})` }));

  return (
    <div
      className={cn("flex flex-col items-center gap-4 sm:flex-row", className)}>
      <ChartContainer config={config} className="aspect-square h-44 shrink-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="key"
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {(item.payload as DonutSlice).label}
                    </span>
                    <span className="font-mono font-medium tabular text-foreground">
                      {total > 0 ? formatPercent(Number(value) / total) : "0%"}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="key"
            innerRadius={52}
            outerRadius={80}
            strokeWidth={3}
            stroke="var(--card)"
            paddingAngle={2}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) {
                  return null;
                }
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-xl font-semibold">
                      {centerValue}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 20}
                      className="fill-muted-foreground text-xs">
                      {centerLabel}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="flex w-full flex-col gap-2">
        {data.map((slice) => (
          <div key={slice.key} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {slice.label}
            </span>
            <span className="font-medium tabular">
              {total > 0 ? formatPercent(slice.value / total) : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
