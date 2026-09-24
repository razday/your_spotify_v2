import {
  CalendarRange,
  Crown,
  HeartCrack,
  History,
  Moon,
  Sparkle,
  Telescope,
  TrendingUp,
} from "lucide-react";
import { ReactNode } from "react";
import { toast } from "sonner";

import { api } from "@/services/apis/api";
import { SmartPlaylistKind } from "@/services/apis/library";

import { MessageKey, translate as t } from "./i18n";
import { CoverTheme, renderPlaylistCover } from "./playlist-cover";

interface SmartKindMeta {
  kind: SmartPlaylistKind;
  icon: ReactNode;
  theme: CoverTheme;
  title: MessageKey;
  description: MessageKey;
}

export const SMART_KINDS: SmartKindMeta[] = [
  {
    kind: "top-month",
    icon: <TrendingUp />,
    theme: "green",
    title: "smart.top-month",
    description: "smart.top-month.description",
  },
  {
    kind: "top-year",
    icon: <CalendarRange />,
    theme: "ocean",
    title: "smart.top-year",
    description: "smart.top-year.description",
  },
  {
    kind: "top-all",
    icon: <Crown />,
    theme: "gold",
    title: "smart.top-all",
    description: "smart.top-all.description",
  },
  {
    kind: "discoveries",
    icon: <Telescope />,
    theme: "violet",
    title: "smart.discoveries",
    description: "smart.discoveries.description",
  },
  {
    kind: "forgotten",
    icon: <History />,
    theme: "sunset",
    title: "smart.forgotten",
    description: "smart.forgotten.description",
  },
  {
    kind: "night",
    icon: <Moon />,
    theme: "night",
    title: "smart.night",
    description: "smart.night.description",
  },
  {
    kind: "year",
    icon: <Sparkle />,
    theme: "rose",
    title: "smart.year",
    description: "smart.year.description",
  },
  {
    kind: "liked-unplayed",
    icon: <HeartCrack />,
    theme: "rose",
    title: "smart.liked-unplayed",
    description: "smart.liked-unplayed.description",
  },
];

export const smartMeta = (kind: SmartPlaylistKind) =>
  SMART_KINDS.find((meta) => meta.kind === kind)!;

// Draws a cover from the first tracks of the playlist and sends it
export async function generateCover(
  accountId: string,
  playlistId: string,
  title: string,
  theme: CoverTheme,
) {
  try {
    const { data } = await api.playlist(accountId, playlistId);
    const images = data.items.flatMap((item) =>
      item.image ? [item.image] : [],
    );
    const image = await renderPlaylistCover({
      title,
      images,
      theme,
      subtitle: t("playlists.coverSubtitle", { count: data.items.length }),
    });
    await api.uploadPlaylistCover(accountId, playlistId, image);
    return true;
  } catch {
    toast.error(t("playlists.coverError"));
    return false;
  }
}
