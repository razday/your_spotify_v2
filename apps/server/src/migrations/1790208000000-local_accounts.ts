import { UserModel } from "../database/Models";
import { logger } from "../tools/logger";
import { startMigration } from "../tools/migrations";

export async function up() {
  startMigration("local accounts (username + password) with linked Spotify");

  // Usernames are now used to log in and must be unique (case insensitive)
  const taken = new Set<string>();
  for await (const user of UserModel.find({}, "username").sort({ _id: 1 })) {
    let username = user.username.trim() || "user";
    let suffix = 2;
    while (taken.has(username.toLowerCase())) {
      username = `${user.username.trim() || "user"}-${suffix}`;
      suffix += 1;
    }
    taken.add(username.toLowerCase());
    if (username !== user.username) {
      logger.warn(`Renaming user ${user.username} to ${username}`);
      await UserModel.updateOne({ _id: user._id }, { username });
    }
  }

  await UserModel.updateMany(
    { spotifyLinkExpired: { $exists: false } },
    { $set: { spotifyLinkExpired: false } },
  );
  await UserModel.updateMany(
    { spotifyAccount: { $exists: false } },
    { $set: { spotifyAccount: null } },
  );
  await UserModel.updateMany(
    { passwordHash: { $exists: false } },
    { $set: { passwordHash: null } },
  );
  // A linked account without refresh token cannot be synced anymore
  await UserModel.updateMany(
    { spotifyId: { $type: "string" }, refreshToken: { $in: [null, ""] } },
    { $set: { spotifyLinkExpired: true } },
  );

  // spotifyId was unique for every user, now only for users having one
  try {
    await UserModel.collection.dropIndex("spotifyId_1");
  } catch {
    // Index already gone
  }
  await UserModel.syncIndexes();
}

export async function down() {}
