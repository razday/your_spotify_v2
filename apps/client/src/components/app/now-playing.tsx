import { useQuery } from "@tanstack/react-query";
import {
  AudioLines,
  Car,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Laptop,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Speaker,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { initials } from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import {
  formatClock,
  usePlayerCommand,
  usePlayers,
  useProgress,
} from "@/lib/player";
import { hasActiveAccount } from "@/lib/spotify";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import {
  AccountPlayer,
  PlayerCommand,
  PlayerItem,
  RepeatState,
} from "@/services/apis/player";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";

const NEXT_REPEAT: Record<RepeatState, RepeatState> = {
  off: "context",
  context: "track",
  track: "off",
};

function DeviceIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, typeof Laptop> = {
    computer: Laptop,
    smartphone: Smartphone,
    tablet: Smartphone,
    speaker: Speaker,
    tv: Tv,
    castvideo: Tv,
    castaudio: Speaker,
    avr: Speaker,
    stb: Tv,
    audiodongle: Speaker,
    gameconsole: Gamepad2,
    automobile: Car,
  };
  const Icon = icons[type.toLowerCase()] ?? Speaker;
  return <Icon className={className} />;
}

const accountLabel = (player: AccountPlayer) =>
  player.displayName ?? player.spotifyId;

// Animated bars while something plays
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-[3px] rounded-full bg-primary",
            playing ? "animate-equalizer" : "h-1",
          )}
          style={playing ? { animationDelay: `${bar * 0.18}s` } : undefined}
        />
      ))}
    </span>
  );
}

function ItemTitle({
  item,
  onNavigate,
}: {
  item: PlayerItem;
  onNavigate: () => void;
}) {
  const title = <span className="truncate">{item.name}</span>;
  return (
    <div className="flex min-w-0 flex-col">
      {item.known ? (
        <Link
          to={`/track/${item.id}`}
          onClick={onNavigate}
          className="truncate font-semibold hover:underline">
          {title}
        </Link>
      ) : (
        <span className="truncate font-semibold">{title}</span>
      )}
      <span className="truncate text-sm text-muted-foreground">
        {item.type === "episode"
          ? item.show
          : item.artists.map((artist, index) => (
              <span key={artist.id}>
                {index > 0 && ", "}
                {artist.known ? (
                  <Link
                    to={`/artist/${artist.id}`}
                    onClick={onNavigate}
                    className="hover:text-foreground hover:underline">
                    {artist.name}
                  </Link>
                ) : (
                  artist.name
                )}
              </span>
            ))}
      </span>
    </div>
  );
}

function ControlButton({
  label,
  active,
  disabled,
  onClick,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-9 text-muted-foreground hover:text-foreground",
        active && "text-primary hover:text-primary",
        className,
      )}>
      {children}
    </Button>
  );
}

function Queue({ accountId, open }: { accountId: string; open: boolean }) {
  const queue = useQuery({
    queryKey: ["player-queue", accountId],
    queryFn: () => api.playerQueue(accountId).then((r) => r.data),
    enabled: open,
    staleTime: 5_000,
  });
  if (queue.isLoading) {
    return <p className="py-2 text-xs text-muted-foreground">…</p>;
  }
  const items = (queue.data ?? []).slice(0, 6);
  if (items.length === 0) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        {t("player.queueEmpty")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 pt-2">
      {items.map((item, index) => (
        <div key={`${item.id}-${index}`} className="flex items-center gap-2">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="size-8 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="size-8 shrink-0 rounded bg-muted" />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium">{item.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {item.type === "episode"
                ? item.show
                : item.artists.map((a) => a.name).join(", ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Devices({
  player,
  onTransfer,
}: {
  player: AccountPlayer;
  onTransfer: (deviceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const devices = useQuery({
    queryKey: ["player-devices", player.accountId],
    queryFn: () => api.playerDevices(player.accountId).then((r) => r.data),
    enabled: open,
    staleTime: 5_000,
  });
  const current = player.state?.device;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 max-w-[55%] gap-1.5 px-2 text-xs text-primary">
          <DeviceIcon type={current?.type ?? "speaker"} className="size-3.5" />
          <span className="truncate">
            {current ? current.name : t("player.devices")}
          </span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>{t("player.devices")}</DropdownMenuLabel>
        {devices.isLoading && <DropdownMenuItem disabled>…</DropdownMenuItem>}
        {devices.data?.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {t("player.noDevices")}
          </p>
        )}
        {devices.data?.map((device) => (
          <DropdownMenuItem
            key={device.id ?? device.name}
            disabled={!device.id || device.isRestricted || device.isActive}
            onSelect={() => device.id && onTransfer(device.id)}
            className={cn(device.isActive && "text-primary")}>
            <DeviceIcon type={device.type} />
            <span className="truncate">{device.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlayerPanel({
  player,
  onNavigate,
}: {
  player: AccountPlayer;
  onNavigate: () => void;
}) {
  const command = usePlayerCommand();
  const state = player.state;
  const item = state?.item ?? null;
  const progress = useProgress(state);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  const send = (next: PlayerCommand) =>
    command.mutate({ accountId: player.accountId, command: next });

  // Without Premium, Spotify refuses every command
  const controls = player.premium !== false && state?.device != null;
  const disallowed = (action: string) =>
    !controls || Boolean(state?.disallows.includes(action));

  if (!state || !item) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Music2 className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{t("player.nothing")}</p>
        <p className="text-xs text-muted-foreground">
          {player.error === "RATE_LIMITED"
            ? t("player.rateLimited")
            : player.error === "ERROR"
              ? t("player.error")
              : t("player.nothingHint")}
        </p>
      </div>
    );
  }

  const volumeValue = volume ?? state.device?.volume ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-muted">
            <Music2 className="size-10 text-muted-foreground" />
          </div>
        )}
        <a
          href={`https://open.spotify.com/${item.type}/${item.id}`}
          target="_blank"
          rel="noreferrer"
          title={t("common.openSpotify")}
          className="absolute top-2 right-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm hover:bg-black/70">
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <ItemTitle item={item} onNavigate={onNavigate} />

      <div className="flex flex-col gap-1">
        <Slider
          value={[seeking ?? progress]}
          max={item.durationMs}
          step={1000}
          disabled={disallowed("seeking")}
          onValueChange={([value]) => setSeeking(value ?? 0)}
          onValueCommit={([value]) => {
            setSeeking(null);
            send({ type: "seek", positionMs: value ?? 0 });
          }}
          aria-label={t("player.seek")}
        />
        <div className="flex justify-between text-[11px] text-muted-foreground tabular">
          <span>{formatClock(seeking ?? progress)}</span>
          <span>{formatClock(item.durationMs)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ControlButton
          label={t("player.shuffle")}
          active={state.shuffle}
          disabled={disallowed("toggling_shuffle")}
          onClick={() => send({ type: "shuffle", state: !state.shuffle })}>
          <Shuffle className="size-4" />
        </ControlButton>
        <ControlButton
          label={t("player.previous")}
          disabled={disallowed("skipping_prev")}
          onClick={() => send({ type: "previous" })}>
          <SkipBack className="size-5 fill-current" />
        </ControlButton>
        <Button
          size="icon"
          className="size-11 rounded-full"
          title={state.isPlaying ? t("player.pause") : t("player.play")}
          aria-label={state.isPlaying ? t("player.pause") : t("player.play")}
          disabled={disallowed(state.isPlaying ? "pausing" : "resuming")}
          onClick={() => send({ type: state.isPlaying ? "pause" : "play" })}>
          {state.isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 translate-x-px fill-current" />
          )}
        </Button>
        <ControlButton
          label={t("player.next")}
          disabled={disallowed("skipping_next")}
          onClick={() => send({ type: "next" })}>
          <SkipForward className="size-5 fill-current" />
        </ControlButton>
        <ControlButton
          label={
            state.repeat === "track"
              ? t("player.repeatOne")
              : t("player.repeat")
          }
          active={state.repeat !== "off"}
          disabled={
            disallowed("toggling_repeat_context") &&
            disallowed("toggling_repeat_track")
          }
          onClick={() =>
            send({ type: "repeat", state: NEXT_REPEAT[state.repeat] })
          }>
          {state.repeat === "track" ? (
            <Repeat1 className="size-4" />
          ) : (
            <Repeat className="size-4" />
          )}
        </ControlButton>
      </div>

      <div className="flex items-center gap-2">
        {state.device?.supportsVolume && controls ? (
          <>
            {volumeValue === 0 ? (
              <VolumeX className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Volume2 className="size-4 shrink-0 text-muted-foreground" />
            )}
            <Slider
              value={[volumeValue]}
              max={100}
              step={1}
              className="w-24"
              onValueChange={([value]) => setVolume(value ?? 0)}
              onValueCommit={([value]) => {
                setVolume(null);
                send({ type: "volume", volume: value ?? 0 });
              }}
              aria-label={t("player.volume")}
            />
          </>
        ) : (
          <span />
        )}
        <span className="ml-auto" />
        <Devices
          player={player}
          onTransfer={(deviceId) =>
            send({ type: "transfer", deviceId, play: state.isPlaying })
          }
        />
      </div>

      {player.premium === false && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          {t("player.premium")}
        </p>
      )}

      <Collapsible open={queueOpen} onOpenChange={setQueueOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-between px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ListMusic className="size-3.5" />
              {t("player.upNext")}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                queueOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Queue accountId={player.accountId} open={queueOpen} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function AccountSwitcher({
  players,
  selected,
  onSelect,
}: {
  players: AccountPlayer[];
  selected: string;
  onSelect: (accountId: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {players.map((player) => (
        <button
          key={player.accountId}
          type="button"
          onClick={() => onSelect(player.accountId)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors hover:bg-muted",
            player.accountId === selected && "border-primary bg-primary/10",
          )}>
          <span className="relative">
            <Avatar className="size-5">
              {player.image && <AvatarImage src={player.image} alt="" />}
              <AvatarFallback className="text-[9px]">
                {initials(accountLabel(player))}
              </AvatarFallback>
            </Avatar>
            {player.state?.isPlaying && (
              <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border border-background bg-primary" />
            )}
          </span>
          <span className="max-w-24 truncate">{accountLabel(player)}</span>
        </button>
      ))}
    </div>
  );
}

export function NowPlaying() {
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const enabled = !isPublic && hasActiveAccount(user);
  const players = usePlayers(enabled);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  if (!enabled || !players.data || players.data.length === 0) {
    return null;
  }

  const list = players.data;
  const scopeMissing = list.every((p) => p.error === "SCOPE_MISSING");
  // The account chosen in the switcher, else the one playing (sorted first)
  const player = list.find((p) => p.accountId === chosen) ?? list[0]!;
  const item = player.state?.item;
  const playing = Boolean(player.state?.isPlaying);
  const othersPlaying = list.filter(
    (p) => p.accountId !== player.accountId && p.state?.isPlaying,
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 max-w-56 gap-2 px-1.5",
            !item && "px-2",
            playing && "border-primary/40",
          )}
          aria-label={t("player.open")}>
          {item?.image ? (
            <img
              src={item.image}
              alt=""
              className="size-5 shrink-0 rounded-sm object-cover"
            />
          ) : scopeMissing ? (
            <AudioLines className="size-4 text-muted-foreground" />
          ) : (
            <Music2 className="size-4 text-muted-foreground" />
          )}
          {item && (
            <span className="hidden min-w-0 truncate text-xs font-medium lg:inline">
              {item.name}
            </span>
          )}
          {item && <Equalizer playing={playing} />}
          {othersPlaying > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
              +{othersPlaying}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3">
        {scopeMissing ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AudioLines className="size-8 text-muted-foreground" />
            <p className="text-sm">{t("player.scope")}</p>
            <Button size="sm" asChild onClick={() => setOpen(false)}>
              <Link to="/settings/account">{t("accounts.relink")}</Link>
            </Button>
          </div>
        ) : (
          <>
            {list.length > 1 && (
              <AccountSwitcher
                players={list}
                selected={player.accountId}
                onSelect={setChosen}
              />
            )}
            {player.error === "SCOPE_MISSING" ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm">{t("player.scope")}</p>
                <Button size="sm" asChild onClick={() => setOpen(false)}>
                  <Link to="/settings/account">{t("accounts.relink")}</Link>
                </Button>
              </div>
            ) : (
              <PlayerPanel player={player} onNavigate={() => setOpen(false)} />
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
