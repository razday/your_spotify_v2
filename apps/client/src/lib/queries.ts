import { QueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

import { api } from "@/services/apis/api";
import { TimelineItemType } from "@/services/apis/insights";
import { selectPublicToken } from "@/services/redux/modules/user/selector";
import { Timesplit } from "@/services/types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

interface Range {
  start: Date;
  end: Date;
}

const rangeKey = ({ start, end }: Range) => [start.getTime(), end.getTime()];

// The public token changes whose data is shown, it is part of every key
function useScope() {
  return useSelector(selectPublicToken) ?? "me";
}

const data = <T>(promise: Promise<{ data: T }>) => promise.then((r) => r.data);

export function useOverview(range: Range | null) {
  const scope = useScope();
  return useQuery({
    queryKey: ["overview", scope, ...(range ? rangeKey(range) : [])],
    queryFn: () => data(api.overview(range!.start, range!.end)),
    enabled: range !== null,
  });
}

export function useTimePer(range: Range, timesplit: Timesplit) {
  const scope = useScope();
  return useQuery({
    queryKey: ["timePer", scope, ...rangeKey(range), timesplit],
    queryFn: () => data(api.timePer(range.start, range.end, timesplit)),
  });
}

export function useSongsPer(range: Range, timesplit: Timesplit) {
  const scope = useScope();
  return useQuery({
    queryKey: ["songsPer", scope, ...rangeKey(range), timesplit],
    queryFn: () => data(api.songsPer(range.start, range.end, timesplit)),
  });
}

export function useDifferentArtistsPer(range: Range, timesplit: Timesplit) {
  const scope = useScope();
  return useQuery({
    queryKey: ["differentArtistsPer", scope, ...rangeKey(range), timesplit],
    queryFn: () =>
      data(api.differentArtistsPer(range.start, range.end, timesplit)),
  });
}

export function useFeatRatio(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["featRatio", scope, ...rangeKey(range)],
    queryFn: () => data(api.featRatio(range.start, range.end, Timesplit.all)),
  });
}

export function useTopTracks(range: Range, nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["topTracks", scope, ...rangeKey(range), nb],
    queryFn: () => data(api.getBestSongs(range.start, range.end, nb, 0)),
  });
}

export function useTopArtists(range: Range, nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["topArtists", scope, ...rangeKey(range), nb],
    queryFn: () => data(api.getBestArtists(range.start, range.end, nb, 0)),
  });
}

export function useTopAlbums(range: Range, nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["topAlbums", scope, ...rangeKey(range), nb],
    queryFn: () => data(api.getBestAlbums(range.start, range.end, nb, 0)),
  });
}

const PAGE_SIZE = 20;

type TopKind = "tracks" | "artists" | "albums";

const topFetchers = {
  tracks: api.getBestSongs,
  artists: api.getBestArtists,
  albums: api.getBestAlbums,
} as const;

export function useInfiniteTop<K extends TopKind>(kind: K, range: Range) {
  const scope = useScope();
  const fetcher = topFetchers[kind] as (
    start: Date,
    end: Date,
    nb: number,
    offset: number,
  ) => ReturnType<(typeof topFetchers)[K]>;
  return useInfiniteQuery({
    queryKey: ["infiniteTop", kind, scope, ...rangeKey(range)],
    queryFn: ({ pageParam }) =>
      fetcher(range.start, range.end, PAGE_SIZE, pageParam).then(
        (r) => r.data as Awaited<ReturnType<(typeof topFetchers)[K]>>["data"],
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
  });
}

export function useHistory(range: Range | null) {
  const scope = useScope();
  return useInfiniteQuery({
    queryKey: ["history", scope, ...(range ? rangeKey(range) : ["all"])],
    queryFn: ({ pageParam }) =>
      data(api.getTracks(range?.start, range?.end, PAGE_SIZE, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
  });
}

export function useRecentTracks(nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["recent", scope, nb],
    queryFn: () => data(api.getTracks(undefined, undefined, nb, 0)),
    refetchInterval: 120_000,
  });
}

export function useHeatmap(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["heatmap", scope, ...rangeKey(range)],
    queryFn: () => data(api.heatmap(range.start, range.end)),
  });
}

export function useCalendar(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["calendar", scope, ...rangeKey(range)],
    queryFn: () => data(api.calendar(range.start, range.end)),
  });
}

export function useReleaseYears(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["releaseYears", scope, ...rangeKey(range)],
    queryFn: () => data(api.releaseYears(range.start, range.end)),
  });
}

export function useComposition(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["composition", scope, ...rangeKey(range)],
    queryFn: () => data(api.composition(range.start, range.end)),
  });
}

export function useDiscoveries(range: Range, nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["discoveries", scope, ...rangeKey(range), nb],
    queryFn: () => data(api.discoveries(range.start, range.end, nb)),
  });
}

export function useRepeats(range: Range, nb: number) {
  const scope = useScope();
  return useQuery({
    queryKey: ["repeats", scope, ...rangeKey(range), nb],
    queryFn: () => data(api.repeats(range.start, range.end, nb)),
  });
}

export function useSessions(range: Range) {
  const scope = useScope();
  return useQuery({
    queryKey: ["sessions", scope, ...rangeKey(range)],
    queryFn: () => data(api.getLongestSessions(range.start, range.end)),
  });
}

export function useItemTimeline(type: TimelineItemType, id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["itemTimeline", scope, type, id],
    queryFn: () => data(api.itemTimeline(type, id)),
  });
}

export function useArtistStats(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["artistStats", scope, id],
    queryFn: () => data(api.getArtistStats(id)),
  });
}

export function useAlbumStats(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["albumStats", scope, id],
    queryFn: () => data(api.getAlbumStats(id)),
  });
}

export function useTrackStats(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["trackStats", scope, id],
    queryFn: () => data(api.getTrackStats(id)),
  });
}

export function useItemRank(type: TimelineItemType, id: string) {
  const scope = useScope();
  const fetchers = {
    artist: api.getArtistRank,
    album: api.getAlbumRank,
    track: api.getTrackRank,
  };
  return useQuery({
    queryKey: ["rank", scope, type, id],
    queryFn: () => data(fetchers[type](id)),
  });
}

export function useSearch(term: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["search", scope, term],
    queryFn: () => data(api.search(term)),
    enabled: term.trim().length >= 2,
    staleTime: 5 * 60_000,
  });
}
