import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api } from "@/services/apis/api";
import {
  AccountPlayer,
  PlayerCommand,
  PlayerState,
} from "@/services/apis/player";

import { translate as t } from "./i18n";
import { queryClient } from "./queries";

const PLAYER_KEY = ["player"];

const PLAYING_MS = 5_000;
const IDLE_MS = 30_000;

// Polled only while the tab is visible (TanStack pauses in the background),
// fast while something plays, slowly otherwise
function refetchInterval(players: AccountPlayer[] | undefined) {
  if (!players || players.length === 0) {
    return IDLE_MS;
  }
  if (players.every((p) => p.error === "SCOPE_MISSING")) {
    return false;
  }
  const playing = players.filter((p) => p.state?.isPlaying && p.state.item);
  if (playing.length === 0) {
    return IDLE_MS;
  }
  // Right after the current track ends, to show the next one quickly
  const untilEnd = Math.min(
    ...playing.map((p) => {
      const state = p.state!;
      const elapsed = state.progressMs + (Date.now() - state.fetchedAt);
      return state.item!.durationMs - elapsed;
    }),
  );
  return Math.max(1_000, Math.min(PLAYING_MS, untilEnd + 800));
}

export function usePlayers(enabled: boolean) {
  return useQuery({
    queryKey: PLAYER_KEY,
    queryFn: () => api.players().then((r) => r.data),
    enabled,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => refetchInterval(query.state.data),
  });
}

export function refreshPlayers(delayMs = 700) {
  // Spotify needs a moment before its state shows a command
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: PLAYER_KEY }).catch(() => {});
  }, delayMs);
}

// The progress of the track, moved locally between two polls
export function useProgress(state: PlayerState | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const playing = Boolean(state?.isPlaying);
  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [playing]);

  if (!state?.item) {
    return 0;
  }
  const elapsed = playing ? Math.max(0, now - state.fetchedAt) : 0;
  return Math.min(state.item.durationMs, state.progressMs + elapsed);
}

interface SpotifyErrorBody {
  code?: string;
  reason?: string;
}

// The message for a failed playback request
export function playerErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: SpotifyErrorBody } })?.response
    ?.data;
  if (data?.reason === "NO_ACTIVE_DEVICE") {
    return t("play.noDevice");
  }
  if (data?.reason === "PREMIUM_REQUIRED") {
    return t("play.premium");
  }
  if (data?.code === "SPOTIFY_SCOPE_MISSING") {
    return t("play.scope");
  }
  if (data?.code === "SPOTIFY_RATE_LIMITED") {
    return t("player.rateLimited");
  }
  return t("play.error");
}

// What a command changes, shown before Spotify confirms it
function optimistic(state: PlayerState, command: PlayerCommand): PlayerState {
  const now = Date.now();
  const progressMs = state.isPlaying
    ? state.progressMs + (now - state.fetchedAt)
    : state.progressMs;
  switch (command.type) {
    case "play":
      return { ...state, isPlaying: true, progressMs, fetchedAt: now };
    case "pause":
      return { ...state, isPlaying: false, progressMs, fetchedAt: now };
    case "seek":
      return { ...state, progressMs: command.positionMs, fetchedAt: now };
    case "shuffle":
      return { ...state, shuffle: command.state };
    case "repeat":
      return { ...state, repeat: command.state };
    case "volume":
      return state.device
        ? { ...state, device: { ...state.device, volume: command.volume } }
        : state;
    default:
      return state;
  }
}

export function usePlayerCommand() {
  return useMutation({
    mutationFn: ({
      accountId,
      command,
    }: {
      accountId: string;
      command: PlayerCommand;
    }) => api.playerCommand(accountId, command),
    onMutate: async ({ accountId, command }) => {
      await queryClient.cancelQueries({ queryKey: PLAYER_KEY });
      queryClient.setQueryData<AccountPlayer[]>(PLAYER_KEY, (players) =>
        players?.map((player) =>
          player.accountId === accountId && player.state
            ? { ...player, state: optimistic(player.state, command) }
            : player,
        ),
      );
    },
    onError: (error) => {
      toast.error(playerErrorMessage(error));
    },
    onSuccess: (_, { command }) => {
      if (command.type === "queue") {
        toast.success(t("player.queued"));
      }
    },
    onSettled: () => refreshPlayers(),
  });
}

// The account a track should be queued on: the one playing, else the first
export async function addToQueue(trackId: string) {
  try {
    const players = await queryClient.fetchQuery({
      queryKey: PLAYER_KEY,
      queryFn: () => api.players().then((r) => r.data),
      staleTime: 3_000,
    });
    const target =
      players.find((p) => p.state?.isPlaying) ??
      players.find((p) => p.state?.device) ??
      players[0];
    if (!target) {
      toast.error(t("play.error"));
      return;
    }
    await api.playerCommand(target.accountId, {
      type: "queue",
      uri: `spotify:track:${trackId}`,
    });
    toast.success(t("player.queued"));
    refreshPlayers();
  } catch (e) {
    toast.error(playerErrorMessage(e));
  }
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
