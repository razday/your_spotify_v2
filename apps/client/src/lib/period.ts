import {
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import { getDateLocale, MessageKey, translate, useLanguage } from "@/lib/i18n";
import { selectUser } from "@/services/redux/modules/user/selector";
import { Timesplit } from "@/services/types";

export type PresetKey =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "year"
  | "365d"
  | "all";

export const PRESETS: { key: PresetKey }[] = [
  { key: "today" },
  { key: "7d" },
  { key: "30d" },
  { key: "90d" },
  { key: "month" },
  { key: "year" },
  { key: "365d" },
  { key: "all" },
];

export const presetLabel = (key: PresetKey) =>
  translate(`period.${key}` as MessageKey);

export const DEFAULT_PRESET: PresetKey = "30d";

export interface Period {
  key: PresetKey | "custom";
  label: string;
  start: Date;
  end: Date;
  timesplit: Timesplit;
  // Same length right before, for comparisons
  previous: { start: Date; end: Date } | null;
}

export function timesplitForRange(start: Date, end: Date) {
  const days = differenceInCalendarDays(end, start);
  if (days <= 2) {
    return Timesplit.hour;
  }
  if (days <= 400) {
    return Timesplit.day;
  }
  return Timesplit.month;
}

// Rounded to the minute so query keys stay stable between renders
const currentMinute = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
};

export function resolvePreset(
  key: PresetKey,
  firstListenedAt: Date | null,
): { start: Date; end: Date } {
  const end = currentMinute();
  switch (key) {
    case "today":
      return { start: startOfDay(end), end };
    case "7d":
      return { start: startOfDay(subDays(end, 6)), end };
    case "30d":
      return { start: startOfDay(subDays(end, 29)), end };
    case "90d":
      return { start: startOfDay(subDays(end, 89)), end };
    case "month":
      return { start: startOfMonth(end), end };
    case "year":
      return { start: startOfYear(end), end };
    case "365d":
      return { start: startOfDay(subDays(end, 364)), end };
    case "all":
      return { start: startOfDay(firstListenedAt ?? subDays(end, 364)), end };
  }
}

export function buildPeriod(
  key: PresetKey | "custom",
  start: Date,
  end: Date,
  label: string,
): Period {
  const length = end.getTime() - start.getTime();
  return {
    key,
    label,
    start,
    end,
    timesplit: timesplitForRange(start, end),
    previous:
      key === "all"
        ? null
        : { start: new Date(start.getTime() - length), end: start },
  };
}

const isPreset = (value: string | null): value is PresetKey =>
  PRESETS.some((preset) => preset.key === value);

// The period lives in the URL (?period=30d or ?from=2024-01-01&to=2024-03-01)
// so that every view can be shared or bookmarked
export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const user = useSelector(selectUser);
  const firstListenedAt = user?.firstListenedAt
    ? new Date(user.firstListenedAt)
    : null;

  const language = useLanguage();
  const periodParam = params.get("period");
  const from = params.get("from");
  const to = params.get("to");
  const firstTime = firstListenedAt?.getTime() ?? null;

  const period = useMemo(() => {
    if (from && to) {
      const start = startOfDay(new Date(from));
      const end = endOfDay(new Date(to));
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return buildPeriod(
          "custom",
          start,
          end,
          `${format(start, "PP", { locale: getDateLocale() })} – ${format(end, "PP", { locale: getDateLocale() })}`,
        );
      }
    }
    const key = isPreset(periodParam) ? periodParam : DEFAULT_PRESET;
    const { start, end } = resolvePreset(
      key,
      firstTime !== null ? new Date(firstTime) : null,
    );
    return buildPeriod(key, start, end, presetLabel(key));
    // The minute changes the query keys on purpose (fresh data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, periodParam, firstTime, language, currentMinute().getTime()]);

  const setPreset = (key: PresetKey) => {
    const next = new URLSearchParams(params);
    next.delete("from");
    next.delete("to");
    if (key === DEFAULT_PRESET) {
      next.delete("period");
    } else {
      next.set("period", key);
    }
    setParams(next);
  };

  const setCustom = (start: Date, end: Date) => {
    const next = new URLSearchParams(params);
    next.delete("period");
    next.set("from", format(start, "yyyy-MM-dd"));
    next.set("to", format(end, "yyyy-MM-dd"));
    setParams(next);
  };

  return { period, setPreset, setCustom };
}

// Keeps the current period (and the guest token) when navigating
export function usePeriodSearch() {
  const [params] = useSearchParams();
  const kept = new URLSearchParams();
  for (const key of ["period", "from", "to", "token"]) {
    const value = params.get(key);
    if (value) {
      kept.set(key, value);
    }
  }
  const search = kept.toString();
  return search ? `?${search}` : "";
}
