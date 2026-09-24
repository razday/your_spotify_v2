import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = "scrypt";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(key);
    });
  });
}

// Stored as "scrypt$<salt>$<hash>", both base64
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt);
  return `${PREFIX}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [prefix, salt, hash] = stored.split("$");
  if (prefix !== PREFIX || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"));
  return key.length === expected.length && timingSafeEqual(key, expected);
}
