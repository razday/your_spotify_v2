import { format, formatDistanceToNowStrict } from "date-fns";

import {
  getDateLocale,
  getLanguage,
  getNumberLocale,
  translatePlural,
} from "@/lib/i18n";
import { SpotifyImage } from "@/services/types";

export const formatNumber = (value: number) =>
  new Intl.NumberFormat(getNumberLocale()).format(value);

export const formatCompact = (value: number) =>
  new Intl.NumberFormat(getNumberLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export function formatPercent(value: number, digits = 0) {
  return new Intl.NumberFormat(getNumberLocale(), {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export const formatDecimal = (value: number, digits = 1) =>
  new Intl.NumberFormat(getNumberLocale(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

// 2h 05m / 2 h 05, 45 min, 30 s
export function formatDuration(ms: number) {
  const fr = getLanguage() === "fr";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) {
    return `${Math.round(ms / 1000)} s`;
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return fr ? `${days} j ${hours} h` : `${days}d ${hours}h`;
  }
  if (hours > 0) {
    const padded = minutes.toString().padStart(2, "0");
    return fr ? `${hours} h ${padded}` : `${hours}h ${padded}m`;
  }
  return `${minutes} min`;
}

export const formatMinutes = (ms: number) =>
  formatNumber(Math.round(ms / 60000));

// 3:45
export function formatTrackLength(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export const formatDate = (date: Date | string, pattern = "PP") =>
  format(new Date(date), pattern, { locale: getDateLocale() });

export const formatTimeAgo = (date: Date | string) =>
  formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
    locale: getDateLocale(),
  });

export function formatHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return format(date, "HH:mm");
}

// Monday first, in the current language
export function weekdayNames() {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const name = format(day, "EEEE", { locale: getDateLocale() });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

export const weekdayShort = (name: string) => name.slice(0, 3);

// Smallest image at least `size` px wide, or the biggest one
export function pickImage(
  images: SpotifyImage[] | undefined | null,
  size = 300,
): string | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((image) => (image.width ?? 0) >= size) ?? sorted.at(-1))
    ?.url;
}

export function initials(name: string | undefined) {
  if (!name) {
    return "?";
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const UNITS = {
  play: "unit.play",
  track: "unit.track",
  album: "unit.album",
  artist: "unit.artist",
  day: "unit.day",
  "active day": "unit.activeDay",
  "new track": "unit.newTrack",
  account: "unit.account",
  minute: "unit.minute",
  second: "unit.second",
} as const;

export type Unit = keyof typeof UNITS;

// "12 plays" / "12 écoutes"
export function pluralize(count: number, unit: Unit) {
  return translatePlural(UNITS[unit], count);
}
