import {
  Ban,
  Disc3,
  ExternalLink,
  ListPlus,
  MicVocal,
  MoreHorizontal,
  Play,
  Undo2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translate as t } from "@/lib/i18n";
import { usePeriodSearch } from "@/lib/period";
import { canUseSpotify } from "@/lib/spotify";
import { setPlaylistContext } from "@/services/redux/modules/playlist/reducer";
import {
  selectBlacklistedArtists,
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import {
  blacklistArtist,
  playTrack,
  unblacklistArtist,
} from "@/services/redux/modules/user/thunk";
import { useAppDispatch } from "@/services/redux/tools";

const spotifyUrl = (type: string, id: string) =>
  `https://open.spotify.com/${type}/${id}`;

function useCanUseSpotify() {
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  return canUseSpotify(user, isPublic);
}

function Trigger() {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground opacity-70 group-hover:opacity-100 data-[state=open]:opacity-100"
        onClick={(event) => event.stopPropagation()}>
        <MoreHorizontal className="size-4" />
        <span className="sr-only">{t("actions.label")}</span>
      </Button>
    </DropdownMenuTrigger>
  );
}

interface TrackActionsProps {
  trackId: string;
  albumId?: string;
  artistId?: string;
}

export function TrackActions({
  trackId,
  albumId,
  artistId,
}: TrackActionsProps) {
  const dispatch = useAppDispatch();
  const spotifyUsable = useCanUseSpotify();
  const periodSearch = usePeriodSearch();

  return (
    <DropdownMenu>
      <Trigger />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {spotifyUsable && (
          <>
            <DropdownMenuItem
              onSelect={() => dispatch(playTrack(trackId)).catch(() => {})}>
              <Play />
              {t("actions.play")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                dispatch(
                  setPlaylistContext({ type: "specific", songIds: [trackId] }),
                )
              }>
              <ListPlus />
              {t("actions.addToPlaylist")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {artistId && (
          <DropdownMenuItem asChild>
            <Link to={`/artist/${artistId}${periodSearch}`}>
              <MicVocal />
              {t("actions.goArtist")}
            </Link>
          </DropdownMenuItem>
        )}
        {albumId && (
          <DropdownMenuItem asChild>
            <Link to={`/album/${albumId}${periodSearch}`}>
              <Disc3 />
              {t("actions.goAlbum")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a
            href={spotifyUrl("track", trackId)}
            target="_blank"
            rel="noreferrer">
            <ExternalLink />
            {t("common.openSpotify")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ArtistActions({ artistId }: { artistId: string }) {
  const dispatch = useAppDispatch();
  const spotifyUsable = useCanUseSpotify();
  const isPublic = useSelector(selectIsPublic);
  const blacklisted = useSelector(selectBlacklistedArtists).includes(artistId);

  return (
    <DropdownMenu>
      <Trigger />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {spotifyUsable && (
          <DropdownMenuItem
            onSelect={() =>
              dispatch(
                setPlaylistContext({ type: "top-artist", artistId, nb: 30 }),
              )
            }>
            <ListPlus />
            {t("actions.artistPlaylist")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a
            href={spotifyUrl("artist", artistId)}
            target="_blank"
            rel="noreferrer">
            <ExternalLink />
            {t("common.openSpotify")}
          </a>
        </DropdownMenuItem>
        {!isPublic && (
          <>
            <DropdownMenuSeparator />
            {blacklisted ? (
              <DropdownMenuItem
                onSelect={() =>
                  dispatch(unblacklistArtist(artistId)).catch(() => {})
                }>
                <Undo2 />
                {t("actions.include")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  dispatch(blacklistArtist(artistId)).catch(() => {})
                }>
                <Ban />
                {t("actions.exclude")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AlbumActions({ albumId }: { albumId: string }) {
  return (
    <DropdownMenu>
      <Trigger />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <a
            href={spotifyUrl("album", albumId)}
            target="_blank"
            rel="noreferrer">
            <ExternalLink />
            {t("common.openSpotify")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
