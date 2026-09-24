import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { cn } from "@/lib/utils";
import { SpotifyImage } from "@/services/types";

interface RankedRowProps {
  rank?: number;
  images: SpotifyImage[] | undefined | null;
  rounded?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  to?: string;
  value?: ReactNode;
  secondary?: ReactNode;
  // 0..1, drawn as a thin bar under the row
  share?: number;
  actions?: ReactNode;
  className?: string;
}

export function RankedRow({
  rank,
  images,
  rounded,
  title,
  subtitle,
  to,
  value,
  secondary,
  share,
  actions,
  className,
}: RankedRowProps) {
  const content = (
    <>
      {rank !== undefined && (
        <span
          className={cn(
            "w-6 shrink-0 text-center text-sm font-semibold tabular text-muted-foreground",
            rank === 1 && "text-primary",
          )}>
          {rank}
        </span>
      )}
      <Cover images={images} rounded={rounded} size={64} className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
        {share !== undefined && (
          <div className="h-1 w-full max-w-64 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
            />
          </div>
        )}
      </div>
      {(value || secondary) && (
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          {value && (
            <span className="text-sm font-medium tabular">{value}</span>
          )}
          {secondary && (
            <span className="text-xs text-muted-foreground tabular">
              {secondary}
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg transition-colors hover:bg-muted/60",
        className,
      )}>
      {to ? (
        <Link to={to} className="flex min-w-0 flex-1 items-center gap-3 p-2">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-2">
          {content}
        </div>
      )}
      {actions && <div className="pr-1">{actions}</div>}
    </div>
  );
}
