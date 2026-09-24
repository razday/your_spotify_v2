import { History, ListPlus, Repeat2, Sparkle, Telescope } from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { TrackActions } from "@/components/stats/item-actions";
import { PageHeader } from "@/components/stats/page-header";
import { RankedRow } from "@/components/stats/ranked-row";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { StatCard } from "@/components/stats/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import {
  useDiscoveries,
  useForgotten,
  useOverview,
  useRepeats,
} from "@/lib/queries";
import { canUseSpotify } from "@/lib/spotify";
import { setPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { useAppDispatch } from "@/services/redux/tools";

const FORGOTTEN_DAYS = 90;

export default function DiscoveriesPage() {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const discoveries = useDiscoveries(period, 24);
  const repeats = useRepeats(period, 12);
  const overview = useOverview(period);
  const forgotten = useForgotten(FORGOTTEN_DAYS, 12);
  const d = discoveries.data;
  const o = overview.data;
  const f = forgotten.data;

  const rediscover = () => {
    if (!f) return;
    dispatch(
      setPlaylistContext({
        type: "specific",
        songIds: f.tracks.map((item) => item.track.id),
      }),
    );
  };

  return (
    <>
      <PageHeader
        title={t("discoveries.title")}
        description={`${t("discoveries.description")} · ${period.label}`}
        icon={<Telescope />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("discoveries.newArtists")}
          icon={<Sparkle />}
          loading={!d}
          value={d ? formatNumber(d.totalArtists) : ""}
          hint={
            o && o.uniqueArtists > 0 && d
              ? t("discoveries.shareArtists", {
                  percent: Math.round((d.totalArtists / o.uniqueArtists) * 100),
                })
              : undefined
          }
        />
        <StatCard
          label={t("discoveries.newTracks")}
          icon={<Sparkle />}
          accent="chart-2"
          loading={!d}
          value={d ? formatNumber(d.totalTracks) : ""}
          hint={
            o && o.uniqueTracks > 0 && d
              ? t("discoveries.shareTracks", {
                  percent: Math.round((d.totalTracks / o.uniqueTracks) * 100),
                })
              : undefined
          }
        />
        <StatCard
          label={t("discoveries.obsessions")}
          icon={<Repeat2 />}
          accent="chart-5"
          loading={!repeats.data}
          value={repeats.data ? formatNumber(repeats.data.length) : ""}
          hint={t("discoveries.obsessionsHint")}
        />
      </div>

      <SectionCard
        title={t("discoveries.newArtists")}
        description={t("discoveries.newArtistsDescription")}>
        {!d ? (
          <ListSkeleton rows={3} rounded />
        ) : d.artists.length === 0 ? (
          <EmptyState
            title={t("discoveries.noNewArtist")}
            description={t("discoveries.noNewArtistHint")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {d.artists.map((item) => (
              <Link
                key={item.artist.id}
                to={`/artist/${item.artist.id}${periodSearch}`}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-muted/60">
                <Cover
                  images={item.artist.images}
                  rounded
                  className="aspect-square w-full max-w-32 shadow-sm transition-transform group-hover:scale-[1.03]"
                />
                <span className="w-full truncate text-sm font-medium">
                  {item.artist.name}
                </span>
                <span className="-mt-1.5 text-xs text-muted-foreground">
                  {pluralize(item.plays, "play")} ·{" "}
                  {t("discoveries.since", {
                    date: formatDate(item.firstListenedAt, "d MMM"),
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t("discoveries.newTracks")}
          description={t("discoveries.newTracksDescription")}>
          {!d ? (
            <ListSkeleton rows={6} />
          ) : d.tracks.length === 0 ? (
            <EmptyState title={t("discoveries.noNewTrack")} />
          ) : (
            <div className="flex flex-col">
              {d.tracks.slice(0, 12).map((item) => (
                <RankedRow
                  key={item.track.id}
                  images={item.album?.images}
                  title={item.track.name}
                  subtitle={item.artist?.name}
                  to={`/track/${item.track.id}${periodSearch}`}
                  value={pluralize(item.plays, "play")}
                  secondary={t("discoveries.first", {
                    date: formatDate(item.firstListenedAt, "d MMM"),
                  })}
                  actions={
                    <TrackActions
                      trackId={item.track.id}
                      albumId={item.album?.id}
                      artistId={item.artist?.id}
                    />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title={t("discoveries.onRepeat")}
          description={t("discoveries.onRepeatDescription")}>
          {!repeats.data ? (
            <ListSkeleton rows={6} />
          ) : repeats.data.length === 0 ? (
            <EmptyState
              title={t("discoveries.nothingOnRepeat")}
              description={t("discoveries.nothingOnRepeatHint")}
            />
          ) : (
            <div className="flex flex-col">
              {repeats.data.map((item) => (
                <RankedRow
                  key={`${item.track.id}-${item.day}`}
                  images={item.album?.images}
                  title={item.track.name}
                  subtitle={item.artist?.name}
                  to={`/track/${item.track.id}${periodSearch}`}
                  value={
                    <Badge variant="secondary" className="tabular">
                      ×{item.plays}
                    </Badge>
                  }
                  secondary={formatDate(item.day, "PP")}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={t("discoveries.forgotten")}
        description={t("discoveries.forgottenDescription", {
          days: FORGOTTEN_DAYS,
        })}
        action={
          f && f.tracks.length > 0 && canUseSpotify(user, isPublic) ? (
            <Button variant="outline" size="sm" onClick={rediscover}>
              <ListPlus />
              {t("playlist.rediscover")}
            </Button>
          ) : (
            <History className="size-4 text-muted-foreground" />
          )
        }>
        {!f ? (
          <ListSkeleton rows={4} />
        ) : f.artists.length === 0 && f.tracks.length === 0 ? (
          <EmptyState
            title={t("discoveries.forgottenNone")}
            description={t("discoveries.forgottenNoneHint")}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col">
              {f.artists.map((item) => (
                <RankedRow
                  key={item.artist.id}
                  rounded
                  images={item.artist.images}
                  title={item.artist.name}
                  subtitle={t("discoveries.lastTime", {
                    date: formatDate(item.lastListenedAt, "PP"),
                  })}
                  value={pluralize(item.plays, "play")}
                  to={`/artist/${item.artist.id}${periodSearch}`}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {f.tracks.map((item) => (
                <RankedRow
                  key={item.track.id}
                  images={item.album?.images}
                  title={item.track.name}
                  subtitle={`${item.artist?.name ?? ""} · ${t(
                    "discoveries.lastTime",
                    { date: formatDate(item.lastListenedAt, "PP") },
                  )}`}
                  value={pluralize(item.plays, "play")}
                  to={`/track/${item.track.id}${periodSearch}`}
                  actions={
                    <TrackActions
                      trackId={item.track.id}
                      albumId={item.album?.id}
                      artistId={item.artist?.id}
                    />
                  }
                />
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}
