import { Router } from "express";
import { z } from "zod";

import {
  getCalendar,
  getComposition,
  getDiscoveries,
  getHeatmap,
  getItemTimeline,
  getOverview,
  getReleaseYears,
  getRepeats,
} from "../database/queries/insights";
import {
  getAchievementMetrics,
  getForgotten,
  getGenres,
  getLeaderboard,
} from "../database/queries/social";
import {
  affinityAllowed,
  isLoggedOrGuest,
  logged,
  validate,
} from "../tools/middleware";
import { LoggedRequest } from "../tools/types";
import { toDate, toNumber } from "../tools/zod";

export const router = Router();

const interval = z.object({
  start: z.preprocess(toDate, z.date()),
  end: z.preprocess(
    toDate,
    z.date().default(() => new Date()),
  ),
});

const intervalWithLimit = interval.extend({
  nb: z.preprocess(toNumber, z.number().int().min(1).max(50)).default(20),
});

router.get("/overview", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getOverview(user, start, end));
});

router.get("/heatmap", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getHeatmap(user, start, end));
});

router.get("/calendar", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getCalendar(user, start, end));
});

router.get("/release-years", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getReleaseYears(user, start, end));
});

router.get("/composition", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getComposition(user, start, end));
});

router.get("/discoveries", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end, nb } = validate(req.query, intervalWithLimit);
  res.status(200).send(await getDiscoveries(user, start, end, nb));
});

router.get("/repeats", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end, nb } = validate(req.query, intervalWithLimit);
  res.status(200).send(await getRepeats(user, start, end, nb));
});

const timelineSchema = z.object({
  type: z.enum(["artist", "album", "track"]),
  id: z.string().min(1).max(64),
});

router.get("/item-timeline", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { type, id } = validate(req.query, timelineSchema);
  res.status(200).send(await getItemTimeline(user, type, id));
});

const forgottenSchema = z.object({
  days: z.preprocess(toNumber, z.number().int().min(30).max(3650)).default(90),
  nb: z.preprocess(toNumber, z.number().int().min(1).max(50)).default(20),
});

router.get("/forgotten", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { days, nb } = validate(req.query, forgottenSchema);
  res.status(200).send(await getForgotten(user, days, nb));
});

router.get("/achievements", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  res.status(200).send(await getAchievementMetrics(user));
});

router.get("/genres", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end, nb } = validate(req.query, intervalWithLimit);
  res.status(200).send(await getGenres(user, start, end, nb));
});

// Social: every user of the instance, only when the admin allows it
router.get("/leaderboard", logged, affinityAllowed, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { start, end } = validate(req.query, interval);
  res.status(200).send(await getLeaderboard(user, start, end));
});
