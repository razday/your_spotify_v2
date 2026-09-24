import { InfosModel, SpotifyAccountModel, UserModel } from "../database/Models";
import { logger } from "../tools/logger";
import { startMigration } from "../tools/migrations";

// Scopes granted by the accounts linked before they were stored
const OLD_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
  "user-modify-playback-state",
  "playlist-modify-private",
  "playlist-modify-public",
];

export async function up() {
  startMigration("several Spotify accounts per user");

  // Read raw documents: the Spotify fields are not in the user schema anymore
  const users = await UserModel.collection
    .find({ spotifyId: { $type: "string" } })
    .toArray();

  for (const user of users) {
    if (await SpotifyAccountModel.exists({ spotifyId: user.spotifyId })) {
      continue;
    }
    const usable = Boolean(user.refreshToken) && !user.spotifyLinkExpired;
    await SpotifyAccountModel.create({
      owner: user._id,
      spotifyId: user.spotifyId,
      displayName: user.spotifyAccount?.displayName ?? null,
      email: user.spotifyAccount?.email ?? null,
      product: user.spotifyAccount?.product ?? null,
      accessToken: usable ? (user.accessToken ?? null) : null,
      refreshToken: usable ? (user.refreshToken ?? null) : null,
      expiresIn: usable ? (user.expiresIn ?? 0) : 0,
      scopes: OLD_SCOPES,
      status: usable ? "active" : "expired",
      primary: true,
      lastTimestamp: user.lastTimestamp ?? 0,
    });
    // Every play so far comes from this account
    await InfosModel.updateMany(
      { owner: user._id, account: { $exists: false } },
      { $set: { account: user.spotifyId } },
    );
    logger.info(`Moved the Spotify account of ${user.username}`);
  }

  await UserModel.collection.updateMany(
    {},
    {
      $unset: {
        spotifyId: "",
        spotifyAccount: "",
        spotifyLinkExpired: "",
        accessToken: "",
        refreshToken: "",
        expiresIn: "",
        lastTimestamp: "",
      },
    },
  );
  await UserModel.collection.updateMany(
    { "settings.language": { $exists: false } },
    { $set: { "settings.language": "en" } },
  );
  try {
    await UserModel.collection.dropIndex("spotifyId_1");
  } catch {
    // Already gone
  }
  await SpotifyAccountModel.syncIndexes();
}

export async function down() {}
