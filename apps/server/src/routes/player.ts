import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { getAccountById } from "../database/queries/spotifyAccount";
import { SpotifyAPI } from "../tools/apis/spotifyApi";
import { logged, validate } from "../tools/middleware";
import {
  getPlayers,
  invalidatePlayer,
  toDevice,
  toItems,
} from "../tools/player";
import { LoggedRequest } from "../tools/types";

export const router = Router();

router.get("/", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  res.status(200).send(await getPlayers(user._id));
});

const accountParams = z.object({ accountId: z.string() });

// The active account, only when it belongs to the logged user
async function ownedAccount(req: LoggedRequest) {
  const { accountId } = validate(req.params, accountParams);
  if (!Types.ObjectId.isValid(accountId)) {
    return null;
  }
  const account = await getAccountById(new Types.ObjectId(accountId));
  if (
    !account ||
    account.status !== "active" ||
    account.owner.toString() !== req.user._id.toString()
  ) {
    return null;
  }
  return account;
}

const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play"), deviceId: z.string().optional() }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("next") }),
  z.object({ type: z.literal("previous") }),
  z.object({ type: z.literal("seek"), positionMs: z.number().min(0) }),
  z.object({ type: z.literal("volume"), volume: z.number().min(0).max(100) }),
  z.object({ type: z.literal("shuffle"), state: z.boolean() }),
  z.object({
    type: z.literal("repeat"),
    state: z.enum(["off", "context", "track"]),
  }),
  z.object({
    type: z.literal("transfer"),
    deviceId: z.string(),
    play: z.boolean(),
  }),
  z.object({
    type: z.literal("queue"),
    uri: z.string().regex(/^spotify:(track|episode):[A-Za-z0-9]+$/),
  }),
]);

// Spotify errors (no active device, premium required, missing scope...) are
// translated by the error handler of the app
router.post("/:accountId/command", logged, async (req, res) => {
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  const command = validate(req.body, commandSchema);
  const id = account._id.toString();
  try {
    await SpotifyAPI.forAccount(id).playerCommand(command);
  } finally {
    invalidatePlayer(id);
  }
  res.status(204).end();
});

router.get("/:accountId/devices", logged, async (req, res) => {
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  const devices = await SpotifyAPI.forAccount(account._id.toString()).devices();
  res.status(200).send(devices.map(toDevice));
});

router.get("/:accountId/queue", logged, async (req, res) => {
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  const queue = await SpotifyAPI.forAccount(account._id.toString()).queue();
  res.status(200).send(await toItems(queue.slice(0, 20)));
});
