import { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import {
  createUser,
  getPasswordHash,
  getUserByUsername,
  getUserCount,
  getUserFromField,
  setUserPassword,
} from "../database";
import { AttemptLimiter } from "../tools/attemptLimiter";
import { logger } from "../tools/logger";
import {
  admin,
  logged,
  validate,
  withGlobalPreferences,
} from "../tools/middleware";
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from "../tools/password";
import { createSession } from "../tools/session";
import { GlobalPreferencesRequest, LoggedRequest } from "../tools/types";
import { toBoolean } from "../tools/zod";

export const router = Router();

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 64;

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH);
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH);

// Failed logins per IP + username, and registrations per IP
const failedLogins = new AttemptLimiter(10, 15 * 60 * 1000);
const registrations = new AttemptLimiter(5, 60 * 60 * 1000);

function tooManyAttempts(res: Response, retryAfter: number) {
  res.status(429).send({ code: "TOO_MANY_ATTEMPTS", retryAfter });
}

const clientKey = (req: Request) => req.ip ?? "unknown";

const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  remember: z.preprocess(toBoolean, z.boolean()).optional(),
});

router.post("/register", withGlobalPreferences, async (req, res) => {
  const { globalPreferences } = req as GlobalPreferencesRequest;
  const { username, password, remember } = validate(req.body, registerSchema);

  const nbUsers = await getUserCount();
  // The very first account can always be created, it becomes the admin
  if (nbUsers > 0 && !globalPreferences.allowRegistrations) {
    res.status(403).send({ code: "REGISTRATIONS_DISABLED" });
    return;
  }

  const key = clientKey(req);
  const retryAfter = registrations.retryAfterSeconds(key);
  if (retryAfter > 0) {
    tooManyAttempts(res, retryAfter);
    return;
  }

  if (await getUserByUsername(username)) {
    res.status(409).send({ code: "USERNAME_TAKEN" });
    return;
  }

  registrations.record(key);
  const user = await createUser(
    username,
    nbUsers === 0,
    await hashPassword(password),
  );
  logger.info(`New account registered: ${username}`);
  await createSession(req, res, user._id.toString(), remember ?? false);
  res.status(204).end();
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(USERNAME_MAX_LENGTH),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  remember: z.preprocess(toBoolean, z.boolean()).optional(),
});

router.post("/login", async (req, res) => {
  const { username, password, remember } = validate(req.body, loginSchema);

  const key = `${clientKey(req)}|${username.toLowerCase()}`;
  const retryAfter = failedLogins.retryAfterSeconds(key);
  if (retryAfter > 0) {
    tooManyAttempts(res, retryAfter);
    return;
  }

  const user = await getUserByUsername(username, true);
  const valid =
    user?.passwordHash != null &&
    (await verifyPassword(password, user.passwordHash));
  if (!user || !valid) {
    failedLogins.record(key);
    res.status(401).send({ code: "INVALID_CREDENTIALS" });
    return;
  }

  failedLogins.reset(key);
  await createSession(req, res, user._id.toString(), remember ?? false);
  res.status(204).end();
});

const changePasswordSchema = z.object({
  currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
  newPassword: passwordSchema,
});

router.put("/password", logged, async (req, res) => {
  const { user } = req as LoggedRequest;
  const { currentPassword, newPassword } = validate(
    req.body,
    changePasswordSchema,
  );

  // Accounts created before local accounts existed have no password yet
  const currentHash = await getPasswordHash(user._id);
  if (currentHash) {
    if (
      !currentPassword ||
      !(await verifyPassword(currentPassword, currentHash))
    ) {
      res.status(403).send({ code: "WRONG_PASSWORD" });
      return;
    }
  }

  await setUserPassword(user._id, await hashPassword(newPassword));
  res.status(204).end();
});

const adminSetPasswordParams = z.object({ id: z.string() });
const adminSetPasswordBody = z.object({ newPassword: passwordSchema });

router.put("/password/:id", logged, admin, async (req, res) => {
  const { id } = validate(req.params, adminSetPasswordParams);
  const { newPassword } = validate(req.body, adminSetPasswordBody);

  if (!Types.ObjectId.isValid(id)) {
    res.status(404).end();
    return;
  }
  const target = await getUserFromField("_id", new Types.ObjectId(id), false);
  if (!target) {
    res.status(404).end();
    return;
  }
  await setUserPassword(target._id, await hashPassword(newPassword));
  logger.info(`Password of ${target.username} was reset by an admin`);
  res.status(204).end();
});
