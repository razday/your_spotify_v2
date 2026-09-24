import { Router } from "express";
import { z } from "zod";

import {
  LibraryScopeMissingError,
  librarySummary,
  likedIds,
  likePlayedTracks,
  removeFromLibrary,
  saveToLibrary,
  syncLibraryOfUser,
} from "../tools/library";
import { isLoggedOrGuest, logged, validate } from "../tools/middleware";
import { LoggedRequest } from "../tools/types";

export const router = Router();

router.get("/ids", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  res.status(200).send(await likedIds(user._id));
});

router.get("/summary", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  res.status(200).send(await librarySummary(user));
});

const changeSchema = z.object({
  type: z.enum(["track", "album"]),
  ids: z
    .array(z.string().regex(/^[A-Za-z0-9]+$/))
    .min(1)
    .max(200),
  saved: z.boolean(),
});

router.post("/change", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { type, ids, saved } = validate(req.body, changeSchema);
  try {
    await (saved
      ? saveToLibrary(user._id, type, ids)
      : removeFromLibrary(user._id, type, ids));
  } catch (e) {
    if (e instanceof LibraryScopeMissingError) {
      res.status(409).send({ code: "SPOTIFY_SCOPE_MISSING" });
      return;
    }
    throw e;
  }
  res.status(200).send(await likedIds(user._id));
});

const likePlayedSchema = z.object({
  minPlays: z.number().int().min(2).max(1000),
});

router.post("/like-played", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { minPlays } = validate(req.body, likePlayedSchema);
  try {
    const liked = await likePlayedTracks(user, minPlays);
    res.status(200).send({ liked });
  } catch (e) {
    if (e instanceof LibraryScopeMissingError) {
      res.status(409).send({ code: "SPOTIFY_SCOPE_MISSING" });
      return;
    }
    throw e;
  }
});

router.post("/sync", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  await syncLibraryOfUser(user._id);
  res.status(204).end();
});
