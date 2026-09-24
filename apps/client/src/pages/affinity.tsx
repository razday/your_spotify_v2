import { useQuery } from "@tanstack/react-query";
import { Check, ListPlus, Users } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPercent, initials } from "@/lib/format";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import { selectAccounts } from "@/services/redux/modules/admin/selector";
import { setPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import { selectUser } from "@/services/redux/modules/user/selector";
import { useAppDispatch } from "@/services/redux/tools";
import { CollaborativeMode, SpotifyImage } from "@/services/types";

type Kind = "songs" | "artists" | "albums";

const fetchers = {
  songs: api.collaborativeBestSongs,
  artists: api.collaborativeBestArtists,
  albums: api.collaborativeBestAlbums,
};

const PERSON_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function AffinityPage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const dispatch = useAppDispatch();
  const me = useSelector(selectUser);
  const accounts = useSelector(selectAccounts).filter((a) => a.id !== me?._id);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<CollaborativeMode>(CollaborativeMode.MINIMA);
  const [kind, setKind] = useState<Kind>("songs");

  const query = useQuery({
    queryKey: [
      "affinity",
      kind,
      mode,
      selected,
      period.start.getTime(),
      period.end.getTime(),
    ],
    queryFn: () =>
      fetchers[kind](selected, period.start, period.end, mode).then(
        (r) => r.data,
      ),
    enabled: selected.length > 0,
  });

  const people = [
    { id: me?._id ?? "", username: `${me?.username ?? "You"} (you)` },
    ...accounts.filter((a) => selected.includes(a.id)),
  ];

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  const canPlaylist = me?.spotifyId && !me.spotifyLinkExpired;

  return (
    <>
      <PageHeader
        title="Affinity"
        description={`What you and your friends listen to in common · ${period.label}`}
        icon={<Users />}
      />

      <SectionCard
        title="Who do you want to compare with?"
        description="Pick one or more people">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are the only one on this instance for now.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
              const active = selected.includes(account.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => toggle(account.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                    active ? "border-primary bg-primary/10" : "hover:bg-muted",
                  )}>
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {initials(account.username)}
                    </AvatarFallback>
                  </Avatar>
                  {account.username}
                  {active && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {selected.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <TabsList>
                <TabsTrigger value="songs">Tracks</TabsTrigger>
                <TabsTrigger value="artists">Artists</TabsTrigger>
                <TabsTrigger value="albums">Albums</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={mode}
                onValueChange={(v) => v && setMode(v as CollaborativeMode)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value={CollaborativeMode.MINIMA}>
                      Shared
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ranked by the smallest share: loved by everyone
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value={CollaborativeMode.AVERAGE}>
                      Average
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ranked by the average share of everyone
                  </TooltipContent>
                </Tooltip>
              </ToggleGroup>
              {kind === "songs" && canPlaylist && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch(
                      setPlaylistContext({
                        type: "affinity",
                        userIds: selected,
                        nb: 50,
                        mode,
                        interval: {
                          start: period.start.getTime(),
                          end: period.end.getTime(),
                        },
                      }),
                    )
                  }>
                  <ListPlus />
                  Playlist
                </Button>
              )}
            </div>
          </div>

          <SectionCard
            title="In common"
            description={
              <span className="flex flex-wrap gap-3">
                {people.map((person, index) => (
                  <span key={person.id} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        background: PERSON_COLORS[index % PERSON_COLORS.length],
                      }}
                    />
                    {person.username}
                  </span>
                ))}
              </span>
            }>
            {query.isLoading ? (
              <ListSkeleton rows={8} />
            ) : !query.data || query.data.length === 0 ? (
              <EmptyState
                title="Nothing in common yet"
                description="Try a longer period or the Average mode."
              />
            ) : (
              <div className="flex flex-col">
                {query.data.map((raw, index) => {
                  const item = raw as unknown as Record<string, number> & {
                    track?: { id: string; name: string };
                    album?: {
                      id: string;
                      name: string;
                      images: SpotifyImage[];
                    };
                    artist: {
                      id: string;
                      name: string;
                      images: SpotifyImage[];
                    };
                  };
                  const title =
                    kind === "songs"
                      ? item.track?.name
                      : kind === "albums"
                        ? item.album?.name
                        : item.artist.name;
                  const images =
                    kind === "artists"
                      ? item.artist.images
                      : item.album?.images;
                  const to =
                    kind === "songs"
                      ? `/track/${item.track?.id}${periodSearch}`
                      : kind === "albums"
                        ? `/album/${item.album?.id}${periodSearch}`
                        : `/artist/${item.artist.id}${periodSearch}`;
                  return (
                    <Link
                      key={`${to}-${index}`}
                      to={to}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60">
                      <span className="w-6 text-center text-sm font-semibold text-muted-foreground tabular">
                        {index + 1}
                      </span>
                      <Cover
                        images={images}
                        rounded={kind === "artists"}
                        className="size-10"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {title}
                        </span>
                        {kind !== "artists" && (
                          <span className="truncate text-xs text-muted-foreground">
                            {item.artist.name}
                          </span>
                        )}
                      </div>
                      <div className="hidden w-48 flex-col gap-1 sm:flex">
                        {people.map((person, i) => {
                          const count = item[person.id] ?? 0;
                          const total = item[`total_${person.id}`] ?? 0;
                          const share = total > 0 ? count / total : 0;
                          return (
                            <Tooltip key={person.id}>
                              <TooltipTrigger asChild>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(100, Math.max(3, share * 800))}%`,
                                      background:
                                        PERSON_COLORS[i % PERSON_COLORS.length],
                                    }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {person.username}: {count} plays (
                                {formatPercent(share, 1)})
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
