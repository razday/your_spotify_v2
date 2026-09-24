import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { translate as t } from "@/lib/i18n";
import { useCanLike, useIsLiked, useToggleLike } from "@/lib/library";
import { cn } from "@/lib/utils";
import { LibraryType } from "@/services/apis/library";

interface LikeButtonProps {
  type: LibraryType;
  id: string;
  size?: "icon" | "default";
  className?: string;
}

// Like a track or save an album on Spotify
export function LikeButton({
  type,
  id,
  size = "icon",
  className,
}: LikeButtonProps) {
  const canLike = useCanLike();
  const liked = useIsLiked(type, id);
  const toggle = useToggleLike();
  if (!canLike) {
    return null;
  }
  const label = liked
    ? t(type === "track" ? "library.unlike" : "library.removeAlbum")
    : t(type === "track" ? "library.like" : "library.saveAlbum");
  return (
    <Button
      variant={size === "icon" ? "ghost" : "outline"}
      size={size}
      title={label}
      aria-label={label}
      aria-pressed={liked}
      disabled={toggle.isPending}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        toggle.mutate({ type, ids: [id], saved: !liked });
      }}
      className={cn(
        size === "icon" && "size-8 shrink-0",
        liked ? "text-primary hover:text-primary" : "text-muted-foreground",
        className,
      )}>
      <Heart className={cn(liked && "fill-current")} />
      {size === "default" && label}
    </Button>
  );
}

// The same, as an entry of an actions menu
export function LikeMenuItem({ type, id }: { type: LibraryType; id: string }) {
  const canLike = useCanLike();
  const liked = useIsLiked(type, id);
  const toggle = useToggleLike();
  if (!canLike) {
    return null;
  }
  return (
    <DropdownMenuItem
      onSelect={() => toggle.mutate({ type, ids: [id], saved: !liked })}>
      <Heart className={cn(liked && "fill-current text-primary")} />
      {liked
        ? t(type === "track" ? "library.unlike" : "library.removeAlbum")
        : t(type === "track" ? "library.like" : "library.saveAlbum")}
    </DropdownMenuItem>
  );
}
