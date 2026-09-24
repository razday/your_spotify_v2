import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import {
  ensurePrimaryAccount,
  getAccountById,
  getAccountsOfUser,
  playsPerAccount,
  publicAccount,
  removeAccount,
  setPrimaryAccount,
  untrackAccount,
} from "../database/queries/spotifyAccount";
import { logger } from "../tools/logger";
import { isLoggedOrGuest, logged, validate } from "../tools/middleware";
import { credentials } from "../tools/oauth/credentials";
import { LoggedRequest } from "../tools/types";

export const router = Router();

export const REQUIRED_SCOPES = credentials.spotify.scopes.split(" ");

export async function listAccounts(owner: Types.ObjectId) {
  const [accounts, plays] = await Promise.all([
    getAccountsOfUser(owner),
    playsPerAccount(owner),
  ]);
  return accounts.map((account) =>
    publicAccount(account, plays.get(account.spotifyId), REQUIRED_SCOPES),
  );
}

router.get("/", isLoggedOrGuest, async (req, res) => {
  const { user } = req as LoggedRequest;
  res.status(200).send(await listAccounts(user._id));
});

const idParams = z.object({ id: z.string() });

// The account, only when it belongs to the logged user
async function ownedAccount(req: LoggedRequest) {
  const { id } = validate(req.params, idParams);
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const account = await getAccountById(new Types.ObjectId(id));
  if (!account || account.owner.toString() !== req.user._id.toString()) {
    return null;
  }
  return account;
}

router.post("/:id/primary", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  if (account.status !== "active") {
    res.status(409).send({ code: "ACCOUNT_NOT_ACTIVE" });
    return;
  }
  await setPrimaryAccount(user._id, account._id);
  res.status(200).send(await listAccounts(user._id));
});

// Stops syncing the account but keeps it, with its history and profile link
router.post("/:id/untrack", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  await untrackAccount(account._id);
  await ensurePrimaryAccount(user._id);
  logger.info(`[${user.username}]: stopped tracking ${account.spotifyId}`);
  res.status(200).send(await listAccounts(user._id));
});

// Forgets the account, the plays it brought stay in the history
router.delete("/:id", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const account = await ownedAccount(req as LoggedRequest);
  if (!account) {
    res.status(404).end();
    return;
  }
  await removeAccount(account._id);
  await ensurePrimaryAccount(user._id);
  logger.info(`[${user.username}]: removed ${account.spotifyId}`);
  res.status(200).send(await listAccounts(user._id));
});
