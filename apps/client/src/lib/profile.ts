import { formatDecimal } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { HeatmapCell, Overview } from "@/services/apis/insights";

export interface ProfileTrait {
  key: string;
  emoji: string;
  title: string;
  description: string;
}

const share = (cells: HeatmapCell[], keep: (c: HeatmapCell) => boolean) => {
  const total = cells.reduce((sum, c) => sum + c.durationMs, 0);
  if (total === 0) {
    return 0;
  }
  return cells.filter(keep).reduce((sum, c) => sum + c.durationMs, 0) / total;
};

// A few playful traits derived from when and how you listen
export function listeningProfile(
  cells: HeatmapCell[],
  overview: Overview | undefined,
): ProfileTrait[] {
  const traits: ProfileTrait[] = [];
  if (cells.length === 0) {
    return traits;
  }

  const night = share(cells, (c) => c.hour >= 22 || c.hour < 4);
  const morning = share(cells, (c) => c.hour >= 5 && c.hour < 10);
  const weekend = share(cells, (c) => c.weekday >= 6);

  if (night >= 0.25) {
    traits.push({
      key: "night",
      emoji: "🦉",
      title: translate("trait.night.title"),
      description: translate("trait.night.description", {
        percent: Math.round(night * 100),
      }),
    });
  } else if (morning >= 0.25) {
    traits.push({
      key: "morning",
      emoji: "🌅",
      title: translate("trait.morning.title"),
      description: translate("trait.morning.description", {
        percent: Math.round(morning * 100),
      }),
    });
  } else {
    traits.push({
      key: "day",
      emoji: "☀️",
      title: translate("trait.day.title"),
      description: translate("trait.day.description"),
    });
  }

  // 2 weekend days out of 7 is ~29% when listening evenly
  if (weekend >= 0.4) {
    traits.push({
      key: "weekend",
      emoji: "🎉",
      title: translate("trait.weekend.title"),
      description: translate("trait.weekend.description", {
        percent: Math.round(weekend * 100),
      }),
    });
  } else if (weekend <= 0.18) {
    traits.push({
      key: "weekday",
      emoji: "💼",
      title: translate("trait.weekday.title"),
      description: translate("trait.weekday.description"),
    });
  }

  if (overview && overview.plays > 20) {
    const variety = overview.uniqueTracks / overview.plays;
    const newShare = overview.newTracks / Math.max(1, overview.uniqueTracks);
    if (newShare >= 0.4) {
      traits.push({
        key: "explorer",
        emoji: "🧭",
        title: translate("trait.explorer.title"),
        description: translate("trait.explorer.description", {
          percent: Math.round(newShare * 100),
        }),
      });
    } else if (variety <= 0.3) {
      traits.push({
        key: "loyal",
        emoji: "🔁",
        title: translate("trait.loyal.title"),
        description: translate("trait.loyal.description", {
          times: formatDecimal(1 / variety),
        }),
      });
    } else {
      traits.push({
        key: "balanced",
        emoji: "⚖️",
        title: translate("trait.balanced.title"),
        description: translate("trait.balanced.description"),
      });
    }
    if (overview.longestStreak.days >= 14) {
      traits.push({
        key: "streak",
        emoji: "🔥",
        title: translate("trait.streak.title"),
        description: translate("trait.streak.description", {
          days: overview.longestStreak.days,
        }),
      });
    }
  }

  return traits;
}
