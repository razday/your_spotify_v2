import {
  Crown,
  Disc3,
  ListPlus,
  Loader2,
  MicVocal,
  Music2,
} from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import {
  AlbumActions,
  ArtistActions,
  TrackActions,
} from "@/components/stats/item-actions";
import { PageHeader } from "@/components/stats/page-header";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnVisible } from "@/hooks/use-in-view";
import { formatDuration, formatPercent, pluralize } from "@/lib/format";
import { MessageKey, translate as t } from "@/lib/i18n";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useInfiniteTop } from "@/lib/queries";
import { canUseSpotify } from "@/lib/spotify";
import { cn } from "@/lib/utils";
import { setPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { useAppDispatch } from "@/services/redux/tools";
import { SpotifyImage } from "@/services/types";

type Kind = "tracks" | "artists" | "albums";

interface Row {
  id: string;
  title: string;
  subtitle?: string;
  images: SpotifyImage[] | undefined;
  to: string;
  plays: number;
  durationMs: number;
  totalPlays: number;
  actions: ReactNode;
}

const meta: Record<
  Kind,
  { title: MessageKey; icon: ReactNode; description: MessageKey }
> = {
  tracks: {
    title: "tops.tracks",
    icon: <Music2 />,
    description: "tops.tracksDescription",
  },
  artists: {
    title: "tops.artists",
    icon: <MicVocal />,
    description: "tops.artistsDescription",
  },
  albums: {
    title: "tops.albums",
    icon: <Disc3 />,
    description: "tops.albumsDescription",
  },
};

function useRows(kind: Kind, periodSearch: string) {
  const { period } = usePeriod();
  const query = useInfiniteTop(kind, period);
  const pages = (query.data?.pages ?? []) as unknown[][];
  const rows: Row[] = pages.flat().map((raw) => {
    const item = raw as {
      count: number;
      duration_ms: number;
      total_count: number;
      track?: { id: string; name: string; album: string; artists: string[] };
      album?: { id: string; name: string; images: SpotifyImage[] };
      artist: { id: string; name: string; images: SpotifyImage[] };
      differents?: number;
    };
    if (kind === "tracks" && item.track) {
      return {
        id: item.track.id,
        title: item.track.name,
        subtitle: item.artist.name,
        images: item.album?.images,
        to: `/track/${item.track.id}${periodSearch}`,
        plays: item.count,
        durationMs: item.duration_ms,
        totalPlays: item.total_count,
        actions: (
          <TrackActions
            trackId={item.track.id}
            albumId={item.album?.id}
            artistId={item.artist.id}
          />
        ),
      };
    }
    if (kind === "albums" && item.album) {
      return {
        id: item.album.id,
        title: item.album.name,
        subtitle: item.artist.name,
        images: item.album.images,
        to: `/album/${item.album.id}${periodSearch}`,
        plays: item.count,
        durationMs: item.duration_ms,
        totalPlays: item.total_count,
        actions: <AlbumActions albumId={item.album.id} />,
      };
    }
    return {
      id: item.artist.id,
      title: item.artist.name,
      subtitle:
        item.differents !== undefined
          ? pluralize(item.differents, "track")
          : undefined,
      images: item.artist.images,
      to: `/artist/${item.artist.id}${periodSearch}`,
      plays: item.count,
      durationMs: item.duration_ms,
      totalPlays: item.total_count,
      actions: <ArtistActions artistId={item.artist.id} />,
    };
  });
  return { query, rows };
}

const podiumStyles = [
  "sm:order-2 sm:-mt-4",
  "sm:order-1 sm:mt-6",
  "sm:order-3 sm:mt-10",
];

function Podium({ rows, rounded }: { rows: Row[]; rounded: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.slice(0, 3).map((row, index) => (
        <Link
          key={row.id}
          to={row.to}
          className={cn("group", podiumStyles[index])}>
          <Card className="relative items-center gap-3 overflow-hidden p-5 text-center transition-shadow group-hover:shadow-lg">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/12 to-transparent" />
            <div className="relative">
              <Cover
                images={row.images}
                rounded={rounded}
                size={300}
                className="size-32 shadow-md transition-transform group-hover:scale-[1.03] md:size-36"
              />
              <span
                className={cn(
                  "absolute -right-2 -bottom-2 flex size-9 items-center justify-center rounded-full border-4 border-card text-sm font-bold",
                  index === 0 && "bg-chart-4 text-black",
                  index === 1 && "bg-muted-foreground/60 text-white",
                  index === 2 && "bg-chart-5/80 text-white",
                )}>
                {index === 0 ? <Crown className="size-4" /> : index + 1}
              </span>
            </div>
            <div className="relative flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold">{row.title}</span>
              {row.subtitle && (
                <span className="truncate text-sm text-muted-foreground">
                  {row.subtitle}
                </span>
              )}
              <span className="mt-1 text-xs text-muted-foreground tabular">
                {pluralize(row.plays, "play")} ·{" "}
                {formatDuration(row.durationMs)}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function TopPage({ kind }: { kind: Kind }) {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const { query, rows } = useRows(kind, periodSearch);
  const sentinel = useOnVisible<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage().catch(() => {});
    }
  }, Boolean(query.hasNextPage));

  const rounded = kind === "artists";
  const topShare = rows[0] ? rows[0].plays : 1;
  const canPlaylist = kind === "tracks" && canUseSpotify(user, isPublic);

  return (
    <>
      <PageHeader
        title={t(meta[kind].title)}
        description={`${t(meta[kind].description)} · ${period.label}`}
        icon={meta[kind].icon}
        actions={
          canPlaylist && rows.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch(
                  setPlaylistContext({
                    type: "top",
                    nb: 50,
                    interval: {
                      start: period.start.getTime(),
                      end: period.end.getTime(),
                    },
                  }),
                )
              }>
              <ListPlus />
              {t("playlist.saveTop")}
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <SectionCard title="Loading">
          <ListSkeleton rows={8} rounded={rounded} />
        </SectionCard>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Podium rows={rows} rounded={rounded} />
          <SectionCard
            title={t("tops.ranking")}
            description={t("tops.total", {
              plays: pluralize(rows[0]?.totalPlays ?? 0, "play"),
            })}
            contentClassName="px-2 sm:px-4">
            <div className="flex flex-col">
              {rows.map((row, index) => (
                <RankedRow
                  key={`${row.id}-${index}`}
                  rank={index + 1}
                  rounded={rounded}
                  images={row.images}
                  title={row.title}
                  subtitle={row.subtitle}
                  to={row.to}
                  share={row.plays / topShare}
                  value={pluralize(row.plays, "play")}
                  secondary={`${formatDuration(row.durationMs)} · ${formatPercent(
                    row.totalPlays > 0 ? row.plays / row.totalPlays : 0,
                    1,
                  )}`}
                  actions={row.actions}
                />
              ))}
            </div>
            <div ref={sentinel} className="flex justify-center py-4">
              {query.isFetchingNextPage && (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}

export const TopTracksPage = () => <TopPage kind="tracks" />;
export const TopArtistsPage = () => <TopPage kind="artists" />;
export const TopAlbumsPage = () => <TopPage kind="albums" />;
