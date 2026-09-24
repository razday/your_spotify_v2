import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  display?: ReactNode;
}

// Horizontal bars with the label inside, for short rankings
export function BarList({
  items,
  className,
  color = "var(--chart-1)",
}: {
  items: BarListItem[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-muted/50">
            <div
              className="absolute inset-y-0 left-0 rounded-md"
              style={{
                width: `${Math.max(1.5, (item.value / max) * 100)}%`,
                background: `color-mix(in oklch, ${color} 35%, transparent)`,
              }}
            />
            <div className="relative flex h-full items-center px-2.5 text-sm">
              <span className="truncate">{item.label}</span>
            </div>
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-medium tabular">
            {item.display ?? item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
