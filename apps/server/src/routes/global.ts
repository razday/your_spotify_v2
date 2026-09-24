import { Router } from "express";
import { z } from "zod";

import { getGlobalPreferences, updateGlobalPreferences } from "../database";
import { admin, logged, validate } from "../tools/middleware";
import {
  getSpotifyAppInfo,
  resetSpotifyApp,
  saveSpotifyApp,
} from "../tools/oauth/spotifyApp";

export const router = Router();

router.get("/preferences", async (req, res) => {
  const preferences = await getGlobalPreferences();
  res.status(200).send(preferences);
});

const updateGlobalPreferencesSchema = z.object({
  allowRegistrations: z.boolean().optional(),
  allowAffinity: z.boolean().optional(),
});

router.post("/preferences", logged, admin, async (req, res) => {
  const modifications = validate(req.body, updateGlobalPreferencesSchema);

  const newPrefs = await updateGlobalPreferences(modifications);
  res.status(200).send(newPrefs);
});

router.get("/spotify-app", logged, admin, async (_, res) => {
  res.status(200).send(await getSpotifyAppInfo());
});

const spotifyAppSchema = z.object({
  clientId: z.string().trim().min(10).max(64),
  // Omitted to keep the current secret of the same app
  clientSecret: z.string().trim().min(10).max(64).optional(),
});

router.put("/spotify-app", logged, admin, async (req, res) => {
  const { clientId, clientSecret } = validate(req.body, spotifyAppSchema);
  const result = await saveSpotifyApp(clientId, clientSecret);
  if (!result.ok) {
    res.status(400).send({ code: result.code });
    return;
  }
  res.status(200).send(await getSpotifyAppInfo());
});

router.delete("/spotify-app", logged, admin, async (_, res) => {
  await resetSpotifyApp();
  res.status(200).send(await getSpotifyAppInfo());
});
