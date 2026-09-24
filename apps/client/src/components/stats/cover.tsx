import { Disc3, MicVocal } from "lucide-react";
import { useState } from "react";

import { pickImage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SpotifyImage } from "@/services/types";

interface CoverProps {
  images: SpotifyImage[] | undefined | null;
  alt?: string;
  // Artists are shown round
  rounded?: boolean;
  size?: number;
  className?: string;
}

export function Cover({
  images,
  alt = "",
  rounded,
  size = 160,
  className,
}: CoverProps) {
  const [failed, setFailed] = useState(false);
  const url = pickImage(images, size);
  const Fallback = rounded ? MicVocal : Disc3;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        rounded ? "rounded-full" : "rounded-md",
        className,
      )}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Fallback className="size-1/2 max-h-10 max-w-10" />
        </div>
      )}
    </div>
  );
}
