import { Types } from "mongoose";

import {
  deleteAllInfosFromUserId,
  deleteAllOrphanTracks,
  deleteUser as dbDeleteUser,
} from "../database";
import { removeAccountsOfUser } from "../database/queries/spotifyAccount";
import { longWriteDbLock } from "./lock";
import { logger } from "./logger";

export const deleteUser = async (userId: string) => {
  logger.info(`Deleting user ${userId}`);
  await longWriteDbLock.lock();
  await deleteAllInfosFromUserId(userId);
  await dbDeleteUser(userId);
  await removeAccountsOfUser(new Types.ObjectId(userId));
  await deleteAllOrphanTracks();
  longWriteDbLock.unlock();
};
