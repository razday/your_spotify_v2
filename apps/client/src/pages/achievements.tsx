import {
  Award,
  CalendarCheck,
  Clock3,
  Disc3,
  Flame,
  Headphones,
  History,
  Lock,
  MicVocal,
  Moon,
  Music2,
  Repeat2,
  Sunrise,
  Timer,
  Heart,
} from "lucide-react";
import { ReactNode } from "react";

import { PageHeader } from "@/components/stats/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { MessageKey, translate as t } from "@/lib/i18n";
import { useAchievements } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { AchievementMetrics } from "@/services/apis/insights";

interface AchievementDefinition {
  id: string;
  icon: ReactNode;
  value: (metrics: AchievementMetrics) => number;
  thresholds: number[];
}

const hours = (ms: number) => Math.floor(ms / 3_600_000);

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "plays",
    icon: <Headphones />,
    value: (m) => m.plays,
    thresholds: [100, 500, 1000, 5000, 10000, 50000],
  },
  {
    id: "hours",
    icon: <Clock3 />,
    value: (m) => hours(m.durationMs),
    thresholds: [10, 50, 100, 500, 1000, 2500],
  },
  {
    id: "artists",
    icon: <MicVocal />,
    value: (m) => m.artists,
    thresholds: [25, 100, 250, 500, 1000],
  },
  {
    id: "tracks",
    icon: <Music2 />,
    value: (m) => m.tracks,
    thresholds: [100, 500, 1000, 2500, 5000, 10000],
  },
  {
    id: "albums",
    icon: <Disc3 />,
    value: (m) => m.albums,
    thresholds: [50, 200, 500, 1000, 2500],
  },
  {
    id: "streak",
    icon: <Flame />,
    value: (m) => m.longestStreak,
    thresholds: [3, 7, 30, 100, 365],
  },
  {
    id: "activeDays",
    icon: <CalendarCheck />,
    value: (m) => m.activeDays,
    thresholds: [7, 30, 100, 365, 1000],
  },
  {
    id: "fan",
    icon: <Heart />,
    value: (m) => m.maxArtistPlaysInDay,
    thresholds: [10, 25, 50, 100],
  },
  {
    id: "repeat",
    icon: <Repeat2 />,
    value: (m) => m.maxTrackPlaysInDay,
    thresholds: [5, 10, 20, 50],
  },
  {
    id: "bigDay",
    icon: <Timer />,
    value: (m) => hours(m.maxDayDurationMs),
    thresholds: [3, 6, 10, 15],
  },
  {
    id: "night",
    icon: <Moon />,
    value: (m) => m.nightPlays,
    thresholds: [50, 250, 1000, 5000],
  },
  {
    id: "morning",
    icon: <Sunrise />,
    value: (m) => m.morningPlays,
    thresholds: [50, 250, 1000, 5000],
  },
  {
    id: "decades",
    icon: <History />,
    value: (m) => m.decades,
    thresholds: [3, 5, 7, 9],
  },
];

// Colors of the tiers, from the first level to the last one
const TIERS = [
  "from-amber-700 to-orange-400 text-white",
  "from-slate-400 to-slate-200 text-slate-900",
  "from-yellow-500 to-amber-300 text-yellow-950",
  "from-emerald-500 to-teal-300 text-emerald-950",
  "from-sky-500 to-indigo-400 text-white",
  "from-fuchsia-500 to-violet-500 text-white",
];

function levelOf(value: number, thresholds: number[]) {
  return thresholds.filter((threshold) => value >= threshold).length;
}

export default function AchievementsPage() {
  const metrics = useAchievements();
  const m = metrics.data;

  const unlocked = m
    ? ACHIEVEMENTS.filter((a) => levelOf(a.value(m), a.thresholds) > 0).length
    : 0;

  return (
    <>
      <PageHeader
        title={t("achievements.title")}
        description={
          m
            ? `${t("achievements.description")} · ${t("achievements.unlocked", {
                count: unlocked,
                total: ACHIEVEMENTS.length,
              })}`
            : t("achievements.description")
        }
        icon={<Award />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {ACHIEVEMENTS.map((achievement) => {
          if (!m) {
            return (
              <Skeleton key={achievement.id} className="h-44 rounded-xl" />
            );
          }
          const value = achievement.value(m);
          const level = levelOf(value, achievement.thresholds);
          const max = achievement.thresholds.length;
          const next = achievement.thresholds[level];
          const previous = level > 0 ? achievement.thresholds[level - 1]! : 0;
          const progress = next
            ? Math.min(1, (value - previous) / (next - previous))
            : 1;
          const locked = level === 0;
          return (
            <Card key={achievement.id} className="gap-4 p-5">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm [&_svg]:size-6",
                    locked
                      ? "from-muted to-muted text-muted-foreground"
                      : TIERS[Math.min(level, TIERS.length) - 1],
                  )}>
                  {locked ? <Lock /> : achievement.icon}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {t(`achievement.${achievement.id}.title` as MessageKey)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(
                      `achievement.${achievement.id}.description` as MessageKey,
                    )}
                  </span>
                </div>
                <span className="text-2xl font-bold tabular">
                  {formatNumber(value)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1">
                  {achievement.thresholds.map((threshold, index) => (
                    <div
                      key={threshold}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        index < level ? "bg-primary" : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("achievements.level", { level, max })}</span>
                  <span>
                    {next
                      ? `${t("achievements.next", { value: formatNumber(next) })} · ${Math.round(progress * 100)}%`
                      : t("achievements.maxed")}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
