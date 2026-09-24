import { getWithDefault } from "../../tools/env";
import { AlbumModel, ArtistModel, InfosModel, TrackModel } from "../Models";
import { User } from "../schemas/user";

// Every query here only uses aggregation features available in MongoDB 4.4:
// CPUs without AVX cannot run MongoDB 5.0+.

const DAY_MS = 24 * 60 * 60 * 1000;

export const timezoneOf = (user: User) =>
  user.settings.timezone ?? getWithDefault("TIMEZONE", "Europe/Paris");

export const periodMatch = (user: User, start: Date, end: Date) => ({
  owner: user._id,
  blacklistedBy: { $exists: false },
  played_at: { $gt: start, $lt: end },
});

export const dayString = (timezone: string) => ({
  $dateToString: { format: "%Y-%m-%d", date: "$played_at", timezone },
});

const lightTrack = (track: any) =>
  track && {
    id: track.id,
    name: track.name,
    album: track.album,
    artists: track.artists,
    duration_ms: track.duration_ms,
    explicit: track.explicit,
  };

const lightAlbum = (album: any) =>
  album && {
    id: album.id,
    name: album.name,
    images: album.images,
    release_date: album.release_date,
    album_type: album.album_type,
  };

export const lightArtist = (artist: any) =>
  artist && { id: artist.id, name: artist.name, images: artist.images };

export async function tracksWithAlbumAndArtist(trackIds: string[]) {
  const tracks = await TrackModel.find({ id: { $in: trackIds } }).lean();
  const albums = await AlbumModel.find({
    id: { $in: tracks.map((t) => t.album) },
  }).lean();
  const artists = await ArtistModel.find({
    id: { $in: tracks.flatMap((t) => (t.artists[0] ? [t.artists[0]] : [])) },
  }).lean();
  const albumsById = new Map(albums.map((a) => [a.id, a]));
  const artistsById = new Map(artists.map((a) => [a.id, a]));
  return new Map(
    tracks.map((track) => [
      track.id,
      {
        track: lightTrack(track),
        album: lightAlbum(albumsById.get(track.album)),
        artist: lightArtist(artistsById.get(track.artists[0] ?? "")),
      },
    ]),
  );
}

// Consecutive days in a sorted list of "YYYY-MM-DD"
export function computeStreaks(days: string[], end: Date, timezone: string) {
  let longest = {
    days: 0,
    start: null as string | null,
    end: null as string | null,
  };
  let runStart: string | null = null;
  let runLength = 0;
  let previous: number | null = null;
  for (const day of days) {
    const time = Date.parse(`${day}T00:00:00Z`);
    if (previous !== null && time - previous === DAY_MS) {
      runLength += 1;
    } else {
      runStart = day;
      runLength = 1;
    }
    if (runLength > longest.days) {
      longest = { days: runLength, start: runStart, end: day };
    }
    previous = time;
  }

  // Current streak: ends today or yesterday (the day may not be over)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    end,
  );
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  let current = 0;
  const set = new Set(days);
  let cursor = set.has(today) ? todayTime : todayTime - DAY_MS;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
    current += 1;
    cursor -= DAY_MS;
  }
  return { longest, current };
}

export async function getOverview(user: User, start: Date, end: Date) {
  const timezone = timezoneOf(user);
  const [facets] = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              plays: { $sum: 1 },
              durationMs: { $sum: "$durationMs" },
            },
          },
        ],
        tracks: [{ $group: { _id: "$id" } }, { $count: "count" }],
        artists: [{ $group: { _id: "$primaryArtistId" } }, { $count: "count" }],
        albums: [{ $group: { _id: "$albumId" } }, { $count: "count" }],
        days: [
          {
            $group: {
              _id: dayString(timezone),
              plays: { $sum: 1 },
              durationMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        hours: [
          {
            $group: {
              _id: { $hour: { date: "$played_at", timezone } },
              durationMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { durationMs: -1 } },
          { $limit: 1 },
        ],
      },
    },
  ]);

  // First listen ever of each artist/track, to count what is new in the period
  const firstListens = async (field: string) => {
    const [result] = await InfosModel.aggregate([
      { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
      { $group: { _id: `$${field}`, first: { $min: "$played_at" } } },
      { $match: { first: { $gt: start, $lt: end } } },
      { $count: "count" },
    ]);
    return result?.count ?? 0;
  };

  const days: { _id: string; plays: number; durationMs: number }[] =
    facets.days;
  const busiest = days.reduce<(typeof days)[number] | null>(
    (best, day) => (!best || day.durationMs > best.durationMs ? day : best),
    null,
  );
  const totals = facets.totals[0] ?? { plays: 0, durationMs: 0 };
  const streaks = computeStreaks(
    days.map((d) => d._id),
    end,
    timezone,
  );

  return {
    plays: totals.plays as number,
    durationMs: totals.durationMs as number,
    uniqueTracks: (facets.tracks[0]?.count ?? 0) as number,
    uniqueArtists: (facets.artists[0]?.count ?? 0) as number,
    uniqueAlbums: (facets.albums[0]?.count ?? 0) as number,
    activeDays: days.length,
    busiestDay: busiest
      ? {
          date: busiest._id,
          plays: busiest.plays,
          durationMs: busiest.durationMs,
        }
      : null,
    favoriteHour: (facets.hours[0]?._id ?? null) as number | null,
    newArtists: await firstListens("primaryArtistId"),
    newTracks: await firstListens("id"),
    longestStreak: streaks.longest,
    currentStreak: streaks.current,
  };
}

export async function getHeatmap(user: User, start: Date, end: Date) {
  const timezone = timezoneOf(user);
  const result = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: {
          // 1 = Monday ... 7 = Sunday
          weekday: { $isoDayOfWeek: { date: "$played_at", timezone } },
          hour: { $hour: { date: "$played_at", timezone } },
        },
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
  ]);
  return result.map((cell) => ({
    weekday: cell._id.weekday as number,
    hour: cell._id.hour as number,
    plays: cell.plays as number,
    durationMs: cell.durationMs as number,
  }));
}

export async function getCalendar(user: User, start: Date, end: Date) {
  const timezone = timezoneOf(user);
  const result = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: dayString(timezone),
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return result.map((day) => ({
    date: day._id as string,
    plays: day.plays as number,
    durationMs: day.durationMs as number,
  }));
}

export async function getReleaseYears(user: User, start: Date, end: Date) {
  // Group per track first so each album is looked up once per track
  const perTrack = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: { track: "$id", album: "$albumId" },
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
    {
      $lookup: {
        from: "albums",
        localField: "_id.album",
        foreignField: "id",
        as: "album",
      },
    },
    { $unwind: "$album" },
    {
      $project: {
        track: "$_id.track",
        plays: 1,
        durationMs: 1,
        year: {
          $convert: {
            input: { $substrBytes: ["$album.release_date", 0, 4] },
            to: "int",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    { $match: { year: { $gt: 1900 } } },
  ]);

  const years = new Map<
    number,
    {
      plays: number;
      durationMs: number;
      top: { track: string; plays: number } | null;
    }
  >();
  for (const row of perTrack) {
    const year = years.get(row.year) ?? { plays: 0, durationMs: 0, top: null };
    year.plays += row.plays;
    year.durationMs += row.durationMs;
    if (!year.top || row.plays > year.top.plays) {
      year.top = { track: row.track, plays: row.plays };
    }
    years.set(row.year, year);
  }

  const details = await tracksWithAlbumAndArtist(
    [...years.values()].flatMap((y) => (y.top ? [y.top.track] : [])),
  );

  return [...years.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, value]) => ({
      year,
      plays: value.plays,
      durationMs: value.durationMs,
      top: value.top
        ? { ...details.get(value.top.track), plays: value.top.plays }
        : null,
    }));
}

export async function getComposition(user: User, start: Date, end: Date) {
  const perTrack = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: { track: "$id", album: "$albumId" },
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
    {
      $lookup: {
        from: "tracks",
        localField: "_id.track",
        foreignField: "id",
        as: "track",
      },
    },
    {
      $lookup: {
        from: "albums",
        localField: "_id.album",
        foreignField: "id",
        as: "album",
      },
    },
    {
      $project: {
        plays: 1,
        durationMs: 1,
        explicit: { $first: "$track.explicit" },
        trackDuration: { $first: "$track.duration_ms" },
        albumType: { $first: "$album.album_type" },
      },
    },
  ]);

  const albumTypes = new Map<string, number>();
  const lengths = new Map<string, number>();
  let explicit = 0;
  let clean = 0;
  for (const row of perTrack) {
    const type = row.albumType ?? "unknown";
    albumTypes.set(type, (albumTypes.get(type) ?? 0) + row.plays);
    if (row.explicit) {
      explicit += row.plays;
    } else {
      clean += row.plays;
    }
    const minutes = (row.trackDuration ?? 0) / 60000;
    const bucket =
      minutes < 2
        ? "< 2 min"
        : minutes < 3
          ? "2-3 min"
          : minutes < 4
            ? "3-4 min"
            : minutes < 5
              ? "4-5 min"
              : "5 min +";
    lengths.set(bucket, (lengths.get(bucket) ?? 0) + row.plays);
  }

  return {
    albumTypes: [...albumTypes.entries()].map(([type, plays]) => ({
      type,
      plays,
    })),
    explicit: { explicit, clean },
    trackLengths: ["< 2 min", "2-3 min", "3-4 min", "4-5 min", "5 min +"].map(
      (bucket) => ({ bucket, plays: lengths.get(bucket) ?? 0 }),
    ),
  };
}

// Artists and tracks listened to for the first time ever during the period
export async function getDiscoveries(
  user: User,
  start: Date,
  end: Date,
  nb: number,
) {
  const discover = (field: string) =>
    InfosModel.aggregate([
      { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
      {
        $group: {
          _id: `$${field}`,
          first: { $min: "$played_at" },
          plays: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$played_at", start] },
                    { $lt: ["$played_at", end] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { first: { $gt: start, $lt: end } } },
      { $sort: { plays: -1, first: -1 } },
      { $facet: { total: [{ $count: "count" }], items: [{ $limit: nb }] } },
    ]);

  const [[artistResult], [trackResult]] = await Promise.all([
    discover("primaryArtistId"),
    discover("id"),
  ]);

  const artistItems: { _id: string; first: Date; plays: number }[] =
    artistResult?.items ?? [];
  const trackItems: { _id: string; first: Date; plays: number }[] =
    trackResult?.items ?? [];

  const artists = await ArtistModel.find({
    id: { $in: artistItems.map((a) => a._id) },
  }).lean();
  const artistsById = new Map(artists.map((a) => [a.id, a]));
  const tracks = await tracksWithAlbumAndArtist(trackItems.map((t) => t._id));

  return {
    totalArtists: (artistResult?.total[0]?.count ?? 0) as number,
    totalTracks: (trackResult?.total[0]?.count ?? 0) as number,
    artists: artistItems
      .filter((a) => artistsById.has(a._id))
      .map((a) => ({
        artist: lightArtist(artistsById.get(a._id)),
        firstListenedAt: a.first,
        plays: a.plays,
      })),
    tracks: trackItems
      .filter((t) => tracks.has(t._id))
      .map((t) => ({
        ...tracks.get(t._id),
        firstListenedAt: t.first,
        plays: t.plays,
      })),
  };
}

// Tracks played the most times within a single day
export async function getRepeats(
  user: User,
  start: Date,
  end: Date,
  nb: number,
) {
  const timezone = timezoneOf(user);
  const rows = await InfosModel.aggregate([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: { day: dayString(timezone), track: "$id" },
        plays: { $sum: 1 },
      },
    },
    { $match: { plays: { $gt: 1 } } },
    { $sort: { plays: -1, "_id.day": -1 } },
    { $limit: nb },
  ]);
  const tracks = await tracksWithAlbumAndArtist(
    rows.map((row) => row._id.track),
  );
  return rows
    .filter((row) => tracks.has(row._id.track))
    .map((row) => ({
      ...tracks.get(row._id.track),
      day: row._id.day as string,
      plays: row.plays as number,
    }));
}

export type TimelineItemType = "artist" | "album" | "track";

const timelineField: Record<TimelineItemType, string> = {
  artist: "primaryArtistId",
  album: "albumId",
  track: "id",
};

// Listening of one artist/album/track over its whole history
export async function getItemTimeline(
  user: User,
  type: TimelineItemType,
  id: string,
) {
  const timezone = timezoneOf(user);
  const [facets] = await InfosModel.aggregate([
    {
      $match: {
        owner: user._id,
        [timelineField[type]]: id,
        blacklistedBy: { $exists: false },
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              plays: { $sum: 1 },
              durationMs: { $sum: "$durationMs" },
              first: { $min: "$played_at" },
              last: { $max: "$played_at" },
              days: { $addToSet: dayString(timezone) },
            },
          },
          {
            $project: {
              plays: 1,
              durationMs: 1,
              first: 1,
              last: 1,
              days: { $size: "$days" },
            },
          },
        ],
        months: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$played_at",
                  timezone,
                },
              },
              plays: { $sum: 1 },
              durationMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        hours: [
          {
            $group: {
              _id: { $hour: { date: "$played_at", timezone } },
              plays: { $sum: 1 },
            },
          },
        ],
        weekdays: [
          {
            $group: {
              _id: { $isoDayOfWeek: { date: "$played_at", timezone } },
              plays: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const totals = facets.totals[0];
  return {
    plays: (totals?.plays ?? 0) as number,
    durationMs: (totals?.durationMs ?? 0) as number,
    daysListened: (totals?.days ?? 0) as number,
    first: (totals?.first ?? null) as Date | null,
    last: (totals?.last ?? null) as Date | null,
    months: facets.months.map((m: any) => ({
      month: m._id as string,
      plays: m.plays as number,
      durationMs: m.durationMs as number,
    })),
    hours: facets.hours.map((h: any) => ({
      hour: h._id as number,
      plays: h.plays as number,
    })),
    weekdays: facets.weekdays.map((w: any) => ({
      weekday: w._id as number,
      plays: w.plays as number,
    })),
  };
}
