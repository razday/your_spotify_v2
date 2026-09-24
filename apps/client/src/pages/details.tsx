import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Headphones,
  Loader2,
  Play,
  Trophy,
} from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { DetailHero, Pill } from "@/components/stats/detail-hero";
import { ArtistActions, TrackActions } from "@/components/stats/item-actions";
import { ItemInsights } from "@/components/stats/item-insights";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  formatDuration,
  formatTimeAgo,
  formatTrackLength,
  pluralize,
} from "@/lib/format";
import { translate as tr } from "@/lib/i18n";
import { usePeriodSearch } from "@/lib/period";
import {
  useAlbumStats,
  useArtistStats,
  useItemRank,
  useItemTimeline,
  useTrackStats,
} from "@/lib/queries";
import { canUseSpotify } from "@/lib/spotify";
import { TimelineItemType } from "@/services/apis/insights";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { playTrack } from "@/services/redux/modules/user/thunk";
import { useAppDispatch } from "@/services/redux/tools";
import { Album, Artist, Track } from "@/services/types";

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function StatsPills({ type, id }: { type: TimelineItemType; id: string }) {
  const timeline = useItemTimeline(type, id);
  const rank = useItemRank(type, id);
  const t = timeline.data;
  return (
    <>
      {rank.data && (
        <Pill highlight>
          <Trophy />
          {tr("details.rankAllTime", { rank: rank.data.index + 1 })}
        </Pill>
      )}
      {t && (
        <>
          <Pill>
            <Headphones />
            {pluralize(t.plays, "play")}
          </Pill>
          <Pill>
            <Clock3 />
            {formatDuration(t.durationMs)}
          </Pill>
          <Pill>
            <CalendarDays />
            {pluralize(t.daysListened, "day")}
          </Pill>
        </>
      )}
    </>
  );
}

function FirstLast({ type, id }: { type: TimelineItemType; id: string }) {
  const t = useItemTimeline(type, id).data;
  if (!t?.first || !t.last) {
    return null;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="gap-1 p-5">
        <span className="text-sm text-muted-foreground">
          {tr("details.firstListened")}
        </span>
        <span className="text-lg font-semibold">
          {formatDate(t.first, "PPP")}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(t.first)}
        </span>
      </Card>
      <Card className="gap-1 p-5">
        <span className="text-sm text-muted-foreground">
          {tr("details.lastListened")}
        </span>
        <span className="text-lg font-semibold">
          {formatDate(t.last, "PPP")}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(t.last)}
        </span>
      </Card>
    </div>
  );
}

function SpotifyButton({ type, id }: { type: string; id: string }) {
  return (
    <Button variant="outline" asChild>
      <a
        href={`https://open.spotify.com/${type}/${id}`}
        target="_blank"
        rel="noreferrer">
        <ExternalLink />
        {tr("common.spotify")}
      </a>
    </Button>
  );
}

function NeverListened({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <EmptyState
        title={tr("details.neverTitle")}
        description={tr("details.neverDescription")}
      />
    </>
  );
}

export function ArtistPage() {
  const { id = "" } = useParams();
  const periodSearch = usePeriodSearch();
  const stats = useArtistStats(id);
  const timeline = useItemTimeline("artist", id);

  if (!stats.data) {
    return <Loading />;
  }
  if ("code" in stats.data) {
    return <NeverListened>{null}</NeverListened>;
  }
  const { artist, mostListened, albumMostListened } = stats.data;
  const topCount = mostListened[0]?.count ?? 1;

  return (
    <>
      <DetailHero
        kind={tr("details.artist")}
        title={artist.name}
        images={artist.images}
        rounded
        pills={<StatsPills type="artist" id={id} />}
        actions={
          <>
            <SpotifyButton type="artist" id={id} />
            <ArtistActions artistId={id} />
          </>
        }
      />
      <FirstLast type="artist" id={id} />
      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title={tr("details.mostPlayed")}>
          <div className="flex flex-col">
            {mostListened.map((item, index) => (
              <RankedRow
                key={item._id}
                rank={index + 1}
                images={item.track.album.images}
                title={item.track.name}
                subtitle={item.track.album.name}
                to={`/track/${item.track.id}${periodSearch}`}
                share={item.count / topCount}
                value={pluralize(item.count, "play")}
                actions={
                  <TrackActions
                    trackId={item.track.id}
                    albumId={item.track.album.id}
                  />
                }
              />
            ))}
          </div>
        </SectionCard>
        <SectionCard className="lg:col-span-2" title={tr("details.albums")}>
          <div className="grid grid-cols-2 gap-3">
            {albumMostListened.slice(0, 6).map((item) => (
              <Link
                key={item.album.id}
                to={`/album/${item.album.id}${periodSearch}`}
                className="group flex min-w-0 flex-col gap-1.5">
                <Cover
                  images={item.album.images}
                  className="aspect-square w-full transition-transform group-hover:scale-[1.03]"
                />
                <span className="truncate text-sm font-medium">
                  {item.album.name}
                </span>
                <span className="-mt-1 text-xs text-muted-foreground">
                  {pluralize(item.count, "play")}
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
      <ItemInsights timeline={timeline.data} />
    </>
  );
}

interface AlbumStats {
  album: Album;
  artists: Artist[];
  tracks: { _id: string; count: number; track: Track }[];
}

export function AlbumPage() {
  const { id = "" } = useParams();
  const periodSearch = usePeriodSearch();
  const stats = useAlbumStats(id);
  const timeline = useItemTimeline("album", id);

  if (!stats.data) {
    return <Loading />;
  }
  const data = stats.data as unknown as AlbumStats | { code: string };
  if ("code" in data) {
    return <NeverListened>{null}</NeverListened>;
  }
  const { album, artists, tracks } = data;
  const topCount = tracks[0]?.count ?? 1;

  return (
    <>
      <DetailHero
        kind={
          album.album_type === "single"
            ? tr("details.single")
            : tr("details.album")
        }
        title={album.name}
        images={album.images}
        subtitle={
          <span>
            {artists.map((artist, index) => (
              <span key={artist.id}>
                {index > 0 && ", "}
                <Link
                  to={`/artist/${artist.id}${periodSearch}`}
                  className="font-medium text-foreground hover:underline">
                  {artist.name}
                </Link>
              </span>
            ))}
            {album.release_date && ` · ${album.release_date.slice(0, 4)}`}
          </span>
        }
        pills={<StatsPills type="album" id={id} />}
        actions={<SpotifyButton type="album" id={id} />}
      />
      <FirstLast type="album" id={id} />
      <SectionCard
        title={tr("details.tracksPlayed")}
        description={pluralize(tracks.length, "track")}>
        {tracks.length === 0 ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col">
            {tracks.map((item, index) => (
              <RankedRow
                key={item._id}
                rank={index + 1}
                images={album.images}
                title={item.track.name}
                subtitle={formatTrackLength(item.track.duration_ms)}
                to={`/track/${item.track.id}${periodSearch}`}
                share={item.count / topCount}
                value={pluralize(item.count, "play")}
                actions={
                  <TrackActions
                    trackId={item.track.id}
                    artistId={item.track.artists[0]}
                  />
                }
              />
            ))}
          </div>
        )}
      </SectionCard>
      <ItemInsights timeline={timeline.data} />
    </>
  );
}

export function TrackPage() {
  const { id = "" } = useParams();
  const periodSearch = usePeriodSearch();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const stats = useTrackStats(id);
  const timeline = useItemTimeline("track", id);

  if (!stats.data) {
    return <Loading />;
  }
  if ("code" in stats.data) {
    return <NeverListened>{null}</NeverListened>;
  }
  const { track, artist, album, recentHistory } = stats.data;
  const canPlay = canUseSpotify(user, isPublic);

  return (
    <>
      <DetailHero
        kind={
          track.explicit
            ? `${tr("details.track")} · ${tr("details.explicit")}`
            : tr("details.track")
        }
        title={track.name}
        images={album.images}
        subtitle={
          <span>
            <Link
              to={`/artist/${artist.id}${periodSearch}`}
              className="font-medium text-foreground hover:underline">
              {artist.name}
            </Link>
            {" · "}
            <Link
              to={`/album/${album.id}${periodSearch}`}
              className="hover:underline">
              {album.name}
            </Link>
            {" · "}
            {formatTrackLength(track.duration_ms)}
          </span>
        }
        pills={<StatsPills type="track" id={id} />}
        actions={
          <>
            {canPlay && (
              <Button
                onClick={() => dispatch(playTrack(track.id)).catch(() => {})}>
                <Play />
                {tr("details.play")}
              </Button>
            )}
            <SpotifyButton type="track" id={id} />
          </>
        }
      />
      <FirstLast type="track" id={id} />
      <ItemInsights timeline={timeline.data} />
      <SectionCard title={tr("details.recentPlays")}>
        <div className="flex flex-col">
          {recentHistory.map((play) => (
            <div
              key={play._id}
              className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-muted/60">
              <span>{formatDate(play.played_at, "EEEE PPP")}</span>
              <span className="text-muted-foreground tabular">
                {formatDate(play.played_at, "HH:mm")}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
