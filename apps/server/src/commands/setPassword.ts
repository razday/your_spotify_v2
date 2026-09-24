import { connect, getUserByUsername, setUserPassword } from "../database";
import { logger } from "../tools/logger";
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../tools/password";

// node build/index.js --set-password <username> <password>
// Sets the password of an account, for accounts created before local
// accounts existed or when an admin forgot their password.
export function setPasswordCommand(
  username: string | undefined,
  password: string | undefined,
) {
  if (!username || !password) {
    logger.error("Usage: --set-password <username> <password>");
    process.exit(1);
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    logger.error(
      `The password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters long`,
    );
    process.exit(1);
  }

  const run = async () => {
    await connect();
    const user = await getUserByUsername(username);
    if (!user) {
      logger.error(`No user named ${username}`);
      process.exit(1);
    }
    await setUserPassword(user._id, await hashPassword(password));
    logger.info(`Password of ${user.username} updated`);
    process.exit(0);
  };
  run().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
