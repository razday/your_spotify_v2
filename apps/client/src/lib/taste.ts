import { translate } from "@/lib/i18n";
import { ReleaseYear } from "@/services/apis/insights";

// People tend to love most the music released around their late teens
// (the "reminiscence bump"), so the weighted median release year of what
// someone listens to hints at when they were ~17.
const REMINISCENCE_AGE = 17;

export interface TasteSummary {
  medianYear: number;
  averageYear: number;
  musicalAge: number;
  estimatedBirthYear: number;
  // Share of plays of music released more than 10 years ago
  nostalgia: number;
  // Share of plays of music released during the last 2 years
  freshness: number;
  topDecade: { decade: number; plays: number } | null;
  decades: { decade: number; plays: number; durationMs: number }[];
  totalPlays: number;
}

export function summarizeTaste(
  years: ReleaseYear[],
  now = new Date(),
): TasteSummary | null {
  const totalPlays = years.reduce((sum, y) => sum + y.plays, 0);
  if (totalPlays === 0) {
    return null;
  }
  const currentYear = now.getFullYear();
  const sorted = [...years].sort((a, b) => a.year - b.year);

  let cumulated = 0;
  let medianYear = sorted[0]!.year;
  for (const year of sorted) {
    cumulated += year.plays;
    if (cumulated >= totalPlays / 2) {
      medianYear = year.year;
      break;
    }
  }

  const averageYear =
    sorted.reduce((sum, y) => sum + y.year * y.plays, 0) / totalPlays;
  const estimatedBirthYear = medianYear - REMINISCENCE_AGE;
  const musicalAge = Math.min(
    99,
    Math.max(REMINISCENCE_AGE, currentYear - estimatedBirthYear),
  );

  const playsWhere = (keep: (year: number) => boolean) =>
    sorted.filter((y) => keep(y.year)).reduce((sum, y) => sum + y.plays, 0);

  const decadesMap = new Map<number, { plays: number; durationMs: number }>();
  for (const year of sorted) {
    const decade = Math.floor(year.year / 10) * 10;
    const entry = decadesMap.get(decade) ?? { plays: 0, durationMs: 0 };
    entry.plays += year.plays;
    entry.durationMs += year.durationMs;
    decadesMap.set(decade, entry);
  }
  const decades = [...decadesMap.entries()]
    .map(([decade, value]) => ({ decade, ...value }))
    .sort((a, b) => a.decade - b.decade);
  const topDecade = decades.reduce<TasteSummary["topDecade"]>(
    (best, d) => (!best || d.plays > best.plays ? d : best),
    null,
  );

  return {
    medianYear,
    averageYear,
    musicalAge,
    estimatedBirthYear,
    nostalgia: playsWhere((y) => y <= currentYear - 10) / totalPlays,
    freshness: playsWhere((y) => y >= currentYear - 1) / totalPlays,
    topDecade,
    decades,
    totalPlays,
  };
}

export function tasteHeadline(summary: TasteSummary) {
  if (summary.freshness >= 0.6) {
    return translate("taste.headline.fresh");
  }
  if (summary.nostalgia >= 0.6) {
    return translate("taste.headline.oldSoul");
  }
  if (summary.nostalgia >= 0.35) {
    return translate("taste.headline.mixed");
  }
  return translate("taste.headline.modern");
}
