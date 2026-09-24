import { ArtistModel, InfosModel } from "../Models";
import { User } from "../schemas/user";
import {
  computeStreaks,
  dayString,
  getReleaseYears,
  lightArtist,
  periodMatch,
  timezoneOf,
  tracksWithAlbumAndArtist,
} from "./insights";

// Artists and tracks that were loved but have not been played for a while
export async function getForgotten(user: User, sinceDays: number, nb: number) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const forgotten = (field: string, minPlays: number) =>
    InfosModel.aggregate([
      { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
      {
        $group: {
          _id: `$${field}`,
          plays: { $sum: 1 },
          durationMs: { $sum: "$durationMs" },
          last: { $max: "$played_at" },
        },
      },
      { $match: { last: { $lt: since }, plays: { $gte: minPlays } } },
      { $sort: { plays: -1 } },
      { $limit: nb },
    ]);

  const [artistRows, trackRows] = await Promise.all([
    forgotten("primaryArtistId", 5),
    forgotten("id", 3),
  ]);
  const artists = await ArtistModel.find({
    id: { $in: artistRows.map((r) => r._id) },
  }).lean();
  const artistsById = new Map(artists.map((a) => [a.id, a]));
  const tracks = await tracksWithAlbumAndArtist(trackRows.map((r) => r._id));

  const stats = (row: { plays: number; durationMs: number; last: Date }) => ({
    plays: row.plays,
    durationMs: row.durationMs,
    lastListenedAt: row.last,
  });
  return {
    artists: artistRows
      .filter((r) => artistsById.has(r._id))
      .map((r) => ({
        artist: lightArtist(artistsById.get(r._id)),
        ...stats(r),
      })),
    tracks: trackRows
      .filter((r) => tracks.has(r._id))
      .map((r) => ({ ...tracks.get(r._id), ...stats(r) })),
  };
}

// Numbers the achievements are computed from, over the whole history
export async function getAchievementMetrics(user: User) {
  const timezone = timezoneOf(user);
  const [facets] = await InfosModel.aggregate([
    { $match: { owner: user._id, blacklistedBy: { $exists: false } } },
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
        artists: [{ $group: { _id: "$primaryArtistId" } }, { $count: "count" }],
        tracks: [{ $group: { _id: "$id" } }, { $count: "count" }],
        albums: [{ $group: { _id: "$albumId" } }, { $count: "count" }],
        days: [{ $group: { _id: dayString(timezone) } }, { $sort: { _id: 1 } }],
        artistDay: [
          {
            $group: {
              _id: { day: dayString(timezone), artist: "$primaryArtistId" },
              plays: { $sum: 1 },
            },
          },
          { $sort: { plays: -1 } },
          { $limit: 1 },
        ],
        trackDay: [
          {
            $group: {
              _id: { day: dayString(timezone), track: "$id" },
              plays: { $sum: 1 },
            },
          },
          { $sort: { plays: -1 } },
          { $limit: 1 },
        ],
        hours: [
          {
            $group: {
              _id: { $hour: { date: "$played_at", timezone } },
              plays: { $sum: 1 },
            },
          },
        ],
        bestDay: [
          {
            $group: {
              _id: dayString(timezone),
              durationMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { durationMs: -1 } },
          { $limit: 1 },
        ],
      },
    },
  ]);

  const years = await getReleaseYears(user, new Date(0), new Date());
  const decades = new Set(years.map((y) => Math.floor(y.year / 10))).size;
  const hours: { _id: number; plays: number }[] = facets.hours;
  const playsBetween = (from: number, to: number) =>
    hours
      .filter((h) => h._id >= from && h._id < to)
      .reduce((sum, h) => sum + h.plays, 0);
  const days: { _id: string }[] = facets.days;
  const streaks = computeStreaks(
    days.map((d) => d._id),
    new Date(),
    timezone,
  );

  return {
    plays: (facets.totals[0]?.plays ?? 0) as number,
    durationMs: (facets.totals[0]?.durationMs ?? 0) as number,
    artists: (facets.artists[0]?.count ?? 0) as number,
    tracks: (facets.tracks[0]?.count ?? 0) as number,
    albums: (facets.albums[0]?.count ?? 0) as number,
    activeDays: days.length,
    longestStreak: streaks.longest.days,
    currentStreak: streaks.current,
    maxArtistPlaysInDay: (facets.artistDay[0]?.plays ?? 0) as number,
    maxTrackPlaysInDay: (facets.trackDay[0]?.plays ?? 0) as number,
    maxDayDurationMs: (facets.bestDay[0]?.durationMs ?? 0) as number,
    nightPlays: playsBetween(0, 5),
    morningPlays: playsBetween(5, 9),
    decades,
  };
}

// Listening of every user over a period, and how close each one is to the
// current user: cosine similarity of the plays per artist
export async function getLeaderboard(me: User, start: Date, end: Date) {
  const rows = await InfosModel.aggregate([
    {
      $match: {
        blacklistedBy: { $exists: false },
        played_at: { $gt: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { owner: "$owner", artist: "$primaryArtistId" },
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
  ]);

  const perUser = new Map<
    string,
    { plays: number; durationMs: number; artists: Map<string, number> }
  >();
  for (const row of rows) {
    const owner = row._id.owner.toString();
    const entry = perUser.get(owner) ?? {
      plays: 0,
      durationMs: 0,
      artists: new Map<string, number>(),
    };
    entry.plays += row.plays;
    entry.durationMs += row.durationMs;
    entry.artists.set(row._id.artist, row.plays);
    perUser.set(owner, entry);
  }

  const norm = (vector: Map<string, number>) =>
    Math.sqrt([...vector.values()].reduce((sum, v) => sum + v * v, 0));
  const mine = perUser.get(me._id.toString());
  const compatibility = (other: Map<string, number>) => {
    if (!mine || mine.artists.size === 0 || other.size === 0) {
      return null;
    }
    let dot = 0;
    for (const [artist, plays] of mine.artists) {
      dot += plays * (other.get(artist) ?? 0);
    }
    return dot / (norm(mine.artists) * norm(other));
  };
  const topArtistOf = (artists: Map<string, number>) =>
    [...artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const topIds = [...perUser.values()].flatMap((entry) => {
    const id = topArtistOf(entry.artists);
    return id ? [id] : [];
  });
  const artists = await ArtistModel.find({ id: { $in: topIds } }).lean();
  const artistsById = new Map(artists.map((a) => [a.id, a]));

  return [...perUser.entries()]
    .map(([owner, entry]) => {
      const top = topArtistOf(entry.artists);
      return {
        userId: owner,
        plays: entry.plays,
        durationMs: entry.durationMs,
        artists: entry.artists.size,
        topArtist: top ? (lightArtist(artistsById.get(top)) ?? null) : null,
        compatibility:
          owner === me._id.toString() ? null : compatibility(entry.artists),
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs);
}

// Share of plays per genre, genres come from MusicBrainz (tools/genres)
export async function getGenres(
  user: User,
  start: Date,
  end: Date,
  nb: number,
) {
  const perArtist = await InfosModel.aggregate<{
    _id: string;
    plays: number;
    durationMs: number;
  }>([
    { $match: periodMatch(user, start, end) },
    {
      $group: {
        _id: "$primaryArtistId",
        plays: { $sum: 1 },
        durationMs: { $sum: "$durationMs" },
      },
    },
  ]);
  const artists = await ArtistModel.find(
    { id: { $in: perArtist.map((a) => a._id) } },
    { id: 1, name: 1, images: 1, genres: 1 },
  ).lean();
  const artistsById = new Map(artists.map((a) => [a.id, a]));

  const genres = new Map<
    string,
    {
      plays: number;
      durationMs: number;
      artists: { id: string; plays: number }[];
    }
  >();
  let totalPlays = 0;
  let coveredPlays = 0;
  for (const row of perArtist) {
    totalPlays += row.plays;
    const artistGenres = artistsById.get(row._id)?.genres ?? [];
    if (artistGenres.length === 0) {
      continue;
    }
    coveredPlays += row.plays;
    for (const genre of artistGenres) {
      const entry = genres.get(genre) ?? {
        plays: 0,
        durationMs: 0,
        artists: [],
      };
      entry.plays += row.plays;
      entry.durationMs += row.durationMs;
      entry.artists.push({ id: row._id, plays: row.plays });
      genres.set(genre, entry);
    }
  }

  return {
    totalPlays,
    coveredPlays,
    genres: [...genres.entries()]
      .sort((a, b) => b[1].plays - a[1].plays)
      .slice(0, nb)
      .map(([genre, entry]) => ({
        genre,
        plays: entry.plays,
        durationMs: entry.durationMs,
        topArtists: entry.artists
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 3)
          .map((a) => lightArtist(artistsById.get(a.id))),
      })),
  };
}
