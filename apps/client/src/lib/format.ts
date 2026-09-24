import { format, formatDistanceToNowStrict } from "date-fns";

import { SpotifyImage } from "@/services/types";

const numberFormat = new Intl.NumberFormat();
const compactFormat = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatNumber = (value: number) => numberFormat.format(value);

export const formatCompact = (value: number) => compactFormat.format(value);

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

// 2h 05m, 45 min, 30 s
export function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) {
    return `${Math.round(ms / 1000)} s`;
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes} min`;
}

export const formatHours = (ms: number) =>
  `${formatNumber(Math.round(ms / 3600000))} h`;

export const formatMinutes = (ms: number) =>
  formatNumber(Math.round(ms / 60000));

// 3:45
export function formatTrackLength(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export const formatDate = (date: Date | string, pattern = "PP") =>
  format(new Date(date), pattern);

export const formatTimeAgo = (date: Date | string) =>
  formatDistanceToNowStrict(new Date(date), { addSuffix: true });

export function formatHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return format(date, "HH:mm");
}

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

export function pluralize(count: number, word: string, plural = `${word}s`) {
  return `${formatNumber(count)} ${count === 1 ? word : plural}`;
}
