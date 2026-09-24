import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { translate as t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DeltaProps {
  current: number;
  previous: number | undefined | null;
  className?: string;
}

// Evolution against the previous period
export function Delta({ current, previous, className }: DeltaProps) {
  if (previous === undefined || previous === null) {
    return null;
  }
  if (previous === 0) {
    return current > 0 ? (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium text-primary",
          className,
        )}>
        <ArrowUpRight className="size-3.5" />
        {t("common.new")}
      </span>
    ) : null;
  }
  const ratio = (current - previous) / previous;
  const rounded = Math.round(ratio * 100);
  const Icon =
    rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular",
            rounded > 0 && "bg-primary/12 text-primary",
            rounded < 0 && "bg-destructive/12 text-destructive",
            rounded === 0 && "bg-muted text-muted-foreground",
            className,
          )}>
          <Icon className="size-3.5" />
          {Math.abs(rounded)}%
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("common.comparedPrevious")}</TooltipContent>
    </Tooltip>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
  loading?: boolean;
  className?: string;
  accent?: "primary" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
}

const accents = {
  primary: "bg-primary/12 text-primary",
  "chart-2": "bg-chart-2/12 text-chart-2",
  "chart-3": "bg-chart-3/12 text-chart-3",
  "chart-4": "bg-chart-4/15 text-chart-4",
  "chart-5": "bg-chart-5/12 text-chart-5",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  delta,
  loading,
  className,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex flex-col gap-2 p-4 sm:gap-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {icon && (
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
                accents[accent],
              )}>
              {icon}
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight tabular sm:text-2xl">
              {value}
            </span>
            {delta}
          </div>
        )}
        {hint && (
          <div className="min-h-4 text-xs text-muted-foreground">
            {loading ? <Skeleton className="h-3 w-32" /> : hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
