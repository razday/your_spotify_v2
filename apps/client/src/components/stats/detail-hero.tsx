import { ReactNode } from "react";

import { Cover } from "@/components/stats/cover";
import { pickImage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SpotifyImage } from "@/services/types";

interface DetailHeroProps {
  kind: string;
  title: string;
  subtitle?: ReactNode;
  images: SpotifyImage[] | undefined;
  rounded?: boolean;
  pills?: ReactNode;
  actions?: ReactNode;
}

// Big header of the artist / album / track pages
export function DetailHero({
  kind,
  title,
  subtitle,
  images,
  rounded,
  pills,
  actions,
}: DetailHeroProps) {
  const background = pickImage(images, 300);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      {background && (
        <img
          src={background}
          alt=""
          className="absolute inset-0 size-full scale-125 object-cover opacity-40 blur-3xl saturate-150 dark:opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-card/20" />
      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:p-8">
        <Cover
          images={images}
          rounded={rounded}
          size={400}
          className={cn(
            "size-40 shadow-2xl md:size-52",
            !rounded && "rounded-xl",
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {kind}
          </span>
          <h1 className="text-3xl font-bold tracking-tight break-words md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          )}
          {pills && <div className="flex flex-wrap gap-2">{pills}</div>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Pill({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tabular backdrop-blur [&_svg]:size-3.5",
        highlight
          ? "border-primary/30 bg-primary/12 text-primary"
          : "bg-background/60",
      )}>
      {children}
    </span>
  );
}
