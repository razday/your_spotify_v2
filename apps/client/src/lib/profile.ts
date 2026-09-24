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
      title: "Night owl",
      description: `${Math.round(night * 100)}% of your listening happens between 10 PM and 4 AM.`,
    });
  } else if (morning >= 0.25) {
    traits.push({
      key: "morning",
      emoji: "🌅",
      title: "Early bird",
      description: `${Math.round(morning * 100)}% of your listening happens between 5 and 10 AM.`,
    });
  } else {
    traits.push({
      key: "day",
      emoji: "☀️",
      title: "Daytime listener",
      description: "Most of your music plays during the day.",
    });
  }

  // 2 weekend days out of 7 is ~29% when listening evenly
  if (weekend >= 0.4) {
    traits.push({
      key: "weekend",
      emoji: "🎉",
      title: "Weekend warrior",
      description: `${Math.round(weekend * 100)}% of your listening happens on weekends.`,
    });
  } else if (weekend <= 0.18) {
    traits.push({
      key: "weekday",
      emoji: "💼",
      title: "Weekday soundtrack",
      description: "Music is part of your week, less of your weekends.",
    });
  }

  if (overview && overview.plays > 20) {
    const variety = overview.uniqueTracks / overview.plays;
    const newShare = overview.newTracks / Math.max(1, overview.uniqueTracks);
    if (newShare >= 0.4) {
      traits.push({
        key: "explorer",
        emoji: "🧭",
        title: "Explorer",
        description: `${Math.round(newShare * 100)}% of the tracks you played were new to you.`,
      });
    } else if (variety <= 0.3) {
      traits.push({
        key: "loyal",
        emoji: "🔁",
        title: "On repeat",
        description: `You play each track ${(1 / variety).toFixed(1)} times on average.`,
      });
    } else {
      traits.push({
        key: "balanced",
        emoji: "⚖️",
        title: "Balanced diet",
        description: "A healthy mix of favorites and new songs.",
      });
    }
    if (overview.longestStreak.days >= 14) {
      traits.push({
        key: "streak",
        emoji: "🔥",
        title: "Never skips a day",
        description: `${overview.longestStreak.days} days in a row with music.`,
      });
    }
  }

  return traits;
}
