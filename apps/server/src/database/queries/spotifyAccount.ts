import { Types } from "mongoose";

import {
  InfosModel,
  LibraryItemModel,
  SmartPlaylistModel,
  SpotifyAccountModel,
} from "../Models";
import { SpotifyAccount } from "../schemas/spotifyAccount";

const WITH_TOKENS = "+accessToken +refreshToken";

export const getAccountsOfUser = (owner: Types.ObjectId) =>
  SpotifyAccountModel.find({ owner }).sort({ primary: -1, linkedAt: 1 }).lean();

export const getAccountById = (id: Types.ObjectId, withTokens = false) =>
  SpotifyAccountModel.findById(id, withTokens ? WITH_TOKENS : undefined).lean();

export const getAccountBySpotifyId = (spotifyId: string) =>
  SpotifyAccountModel.findOne({ spotifyId }).lean();

export const getActiveAccounts = () =>
  SpotifyAccountModel.find({ status: "active" }, WITH_TOKENS)
    .sort({ _id: 1 })
    .lean();

// The account used for user wide actions (play, playlists, imports): the
// primary one when usable, otherwise any active one
export async function getUsableAccount(owner: Types.ObjectId) {
  const accounts = await SpotifyAccountModel.find(
    { owner, status: "active" },
    WITH_TOKENS,
  )
    .sort({ primary: -1, linkedAt: 1 })
    .lean();
  return accounts[0] ?? null;
}

export async function hasUsableAccount(owner: Types.ObjectId) {
  return (
    (await SpotifyAccountModel.exists({ owner, status: "active" })) !== null
  );
}

export interface LinkedAccountInfos {
  spotifyId: string;
  displayName: string | null;
  email: string | null;
  product: string | null;
  image: string | null;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
}

// Adds (or refreshes) a Spotify account of a user, the first one is primary
export async function upsertLinkedAccount(
  owner: Types.ObjectId,
  infos: LinkedAccountInfos,
) {
  const existing = await SpotifyAccountModel.findOne({
    spotifyId: infos.spotifyId,
  });
  const hasPrimary =
    (await SpotifyAccountModel.exists({ owner, primary: true })) !== null;

  if (existing) {
    existing.set({
      ...infos,
      refreshToken: infos.refreshToken ?? existing.refreshToken,
      status: "active",
      primary: existing.primary || !hasPrimary,
    });
    await existing.save();
    return existing;
  }
  return SpotifyAccountModel.create({
    ...infos,
    owner,
    status: "active",
    primary: !hasPrimary,
    // Start with the last 24 hours, Spotify only gives the 50 last plays
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 24,
  });
}

export const storeAccountTokens = (
  id: Types.ObjectId,
  tokens: { accessToken: string; expiresIn: number; refreshToken?: string },
) => SpotifyAccountModel.updateOne({ _id: id }, tokens);

export const markAccountExpired = (id: Types.ObjectId) =>
  SpotifyAccountModel.updateOne(
    { _id: id },
    { status: "expired", accessToken: null, refreshToken: null, expiresIn: 0 },
  );

export const untrackAccount = (id: Types.ObjectId) =>
  SpotifyAccountModel.updateOne(
    { _id: id },
    {
      status: "untracked",
      accessToken: null,
      refreshToken: null,
      expiresIn: 0,
      primary: false,
    },
  );

export async function setPrimaryAccount(
  owner: Types.ObjectId,
  id: Types.ObjectId,
) {
  await SpotifyAccountModel.updateMany({ owner }, { primary: false });
  await SpotifyAccountModel.updateOne({ _id: id, owner }, { primary: true });
}

// Makes sure a user with usable accounts keeps a primary one
export async function ensurePrimaryAccount(owner: Types.ObjectId) {
  if (
    await SpotifyAccountModel.exists({ owner, primary: true, status: "active" })
  ) {
    return;
  }
  const next = await SpotifyAccountModel.findOne({
    owner,
    status: "active",
  }).sort({ linkedAt: 1 });
  if (next) {
    await setPrimaryAccount(owner, next._id);
  }
}

// The history of the account is kept, it belongs to the user
export async function removeAccount(id: Types.ObjectId) {
  const account = await SpotifyAccountModel.findById(id).lean();
  if (account) {
    await LibraryItemModel.deleteMany({ account: account.spotifyId });
    await SmartPlaylistModel.deleteMany({ account: id });
  }
  return removeAccountOnly(id);
}

const removeAccountOnly = (id: Types.ObjectId) =>
  SpotifyAccountModel.deleteOne({ _id: id });

export async function removeAccountsOfUser(owner: Types.ObjectId) {
  await LibraryItemModel.deleteMany({ owner });
  await SmartPlaylistModel.deleteMany({ owner });
  return removeAllAccountsOf(owner);
}

const removeAllAccountsOf = (owner: Types.ObjectId) =>
  SpotifyAccountModel.deleteMany({ owner });

export const storeAccountSync = (
  id: Types.ObjectId,
  lastTimestamp: number,
  lastPlayAt: Date | null,
) =>
  SpotifyAccountModel.updateOne(
    { _id: id },
    {
      lastTimestamp,
      lastSyncAt: new Date(),
      ...(lastPlayAt ? { lastPlayAt } : {}),
    },
  );

export async function playsPerAccount(owner: Types.ObjectId) {
  const rows = await InfosModel.aggregate<{
    _id: string | null;
    plays: number;
  }>([
    { $match: { owner } },
    { $group: { _id: "$account", plays: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.plays]));
}

// What the client may know about an account
export function publicAccount(
  account: SpotifyAccount,
  plays: number | undefined,
  requiredScopes: string[],
) {
  return {
    id: account._id.toString(),
    spotifyId: account.spotifyId,
    displayName: account.displayName,
    email: account.email,
    product: account.product,
    image: account.image,
    status: account.status,
    primary: account.primary,
    lastSyncAt: account.lastSyncAt,
    lastPlayAt: account.lastPlayAt,
    linkedAt: account.linkedAt,
    plays: plays ?? 0,
    missingScopes: requiredScopes.filter((s) => !account.scopes.includes(s)),
  };
}
