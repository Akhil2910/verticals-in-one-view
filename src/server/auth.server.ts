// Email/password sign-in with server-side sessions in Postgres.
// Server-only: import with `await import("@/server/auth.server")` inside handlers.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { db } from "./db.server";
import type { Role } from "@/lib/types";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "nium_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  vertical_id: string | null;
  must_change_password: boolean;
};

/** Stored as `scrypt$<salt hex>$<hash hex>`. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** True for hashes carried over from Supabase (`bcrypt$<$2a$… hash>`); signIn upgrades them to scrypt. */
export const isLegacyHash = (stored: string) => stored.startsWith("bcrypt$");

export async function verifyPassword(password: string, stored: string) {
  if (isLegacyHash(stored)) {
    const { default: bcrypt } = await import("bcryptjs");
    return bcrypt.compare(password, stored.slice("bcrypt$".length));
  }
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db()`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expires.toISOString()})`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const token = getCookie(COOKIE);
  if (token) await db()`delete from sessions where token_hash = ${sha256(token)}`;
  deleteCookie(COOKIE, { path: "/" });
}

/** Ends every session of a user, e.g. after the admin resets their password. */
export async function endAllSessions(userId: string) {
  await db()`delete from sessions where user_id = ${userId}`;
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const [u] = await db()<SessionUser[]>`
    select u.id, u.email, u.full_name, u.role, u.vertical_id, u.must_change_password
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return u ?? null;
}

export async function requireUser(roles?: Role[]) {
  const u = await currentUser();
  if (!u) throw new Error("Please sign in again.");
  if (roles && !roles.includes(u.role)) throw new Error("You don't have permission to do this.");
  return u;
}

// Simple in-memory brake on password guessing: 10 failures per email per 15 minutes.
// Fine for the single app server this deploys to.
const failures = new Map<string, { count: number; since: number }>();
const WINDOW = 15 * 60_000;

export function checkRateLimit(email: string) {
  const f = failures.get(email);
  if (f && Date.now() - f.since < WINDOW && f.count >= 10) throw new Error("Too many attempts. Try again in 15 minutes.");
}
export function recordFailure(email: string) {
  const f = failures.get(email);
  if (!f || Date.now() - f.since >= WINDOW) failures.set(email, { count: 1, since: Date.now() });
  else f.count++;
}
export function clearFailures(email: string) {
  failures.delete(email);
}
