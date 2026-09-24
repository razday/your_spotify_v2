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

export interface PresetDefinition {
  key: PresetKey;
  label: string;
  short: string;
}

export const PRESETS: PresetDefinition[] = [
  { key: "today", label: "Today", short: "Today" },
  { key: "7d", label: "Last 7 days", short: "7 days" },
  { key: "30d", label: "Last 30 days", short: "30 days" },
  { key: "90d", label: "Last 3 months", short: "3 months" },
  { key: "month", label: "This month", short: "This month" },
  { key: "year", label: "This year", short: "This year" },
  { key: "365d", label: "Last 12 months", short: "12 months" },
  { key: "all", label: "All time", short: "All time" },
];

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
          `${format(start, "PP")} – ${format(end, "PP")}`,
        );
      }
    }
    const key = isPreset(periodParam) ? periodParam : DEFAULT_PRESET;
    const preset = PRESETS.find((p) => p.key === key)!;
    const { start, end } = resolvePreset(
      key,
      firstTime !== null ? new Date(firstTime) : null,
    );
    return buildPeriod(key, start, end, preset.label);
    // The minute changes the query keys on purpose (fresh data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, periodParam, firstTime, currentMinute().getTime()]);

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
