import {
  addDays,
  addHours,
  addMonths,
  format,
  startOfDay,
  startOfHour,
  startOfMonth,
} from "date-fns";

import { getDateLocale } from "@/lib/i18n";
import { DateId, Timesplit } from "@/services/types";

export interface SeriesPoint {
  key: string;
  date: Date;
  label: string;
  value: number;
  [extra: string]: number | string | Date;
}

const keyOfDateId = (id: DateId, timesplit: Timesplit) => {
  const month = (id.month ?? 1) - 1;
  switch (timesplit) {
    case Timesplit.hour:
      return new Date(id.year, month, id.day ?? 1, id.hour ?? 0).getTime();
    case Timesplit.month:
      return new Date(id.year, month, 1).getTime();
    default:
      return new Date(id.year, month, id.day ?? 1).getTime();
  }
};

const stepper = {
  [Timesplit.hour]: { floor: startOfHour, add: addHours, label: "HH:mm" },
  [Timesplit.day]: { floor: startOfDay, add: addDays, label: "MMM d" },
  [Timesplit.week]: { floor: startOfDay, add: addDays, label: "MMM d" },
  [Timesplit.month]: { floor: startOfMonth, add: addMonths, label: "MMM yy" },
  [Timesplit.year]: { floor: startOfMonth, add: addMonths, label: "yyyy" },
  [Timesplit.all]: { floor: startOfDay, add: addDays, label: "PP" },
};

// Every bucket between start and end, missing ones filled with 0
export function buildSeries<T extends { _id: DateId | null }>(
  rows: T[] | undefined,
  start: Date,
  end: Date,
  timesplit: Timesplit,
  values: (row: T) => Record<string, number>,
): SeriesPoint[] {
  const byKey = new Map<number, Record<string, number>>();
  for (const row of rows ?? []) {
    if (row._id) {
      byKey.set(keyOfDateId(row._id, timesplit), values(row));
    }
  }
  const { floor, add, label } = stepper[timesplit];
  const points: SeriesPoint[] = [];
  let emptyValues: Record<string, number> | null = null;
  for (
    let cursor = floor(start);
    cursor.getTime() <= end.getTime();
    cursor = add(cursor, 1)
  ) {
    const found = byKey.get(cursor.getTime());
    if (!found && !emptyValues) {
      const sample = byKey.values().next().value;
      emptyValues = Object.fromEntries(
        Object.keys(sample ?? { value: 0 }).map((k) => [k, 0]),
      );
    }
    const pointValues = found ?? emptyValues ?? { value: 0 };
    points.push({
      key: String(cursor.getTime()),
      date: cursor,
      label: format(cursor, label, { locale: getDateLocale() }),
      value: 0,
      ...pointValues,
    });
  }
  return points;
}

export const timesplitTooltipFormat: Record<Timesplit, string> = {
  [Timesplit.hour]: "PP HH:mm",
  [Timesplit.day]: "EEEE, PP",
  [Timesplit.week]: "PP",
  [Timesplit.month]: "MMMM yyyy",
  [Timesplit.year]: "yyyy",
  [Timesplit.all]: "PP",
};
