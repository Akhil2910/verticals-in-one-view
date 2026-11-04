import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Role } from "./types";

// Loaded inside handlers so the server-only modules never reach the browser bundle.
const server = async () => ({ ...(await import("@/server/db.server")), ...(await import("@/server/auth.server")) });

const roleEnum = z.enum(["admin", "official", "vertical_head"]);

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUser } = await server();
  await requireUser(["admin"]);
  return db()<{ user_id: string; role: Role; vertical_id: string | null; full_name: string | null; email: string; created_at: string }[]>`
    select id as user_id, role, vertical_id, full_name, email, created_at from users order by created_at`;
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
        role: roleEnum,
        vertical_id: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireUser, hashPassword } = await server();
    await requireUser(["admin"]);
    if (data.role === "vertical_head" && !data.vertical_id) throw new Error("Choose a vertical for this head.");
    try {
      await db()`
        insert into users (email, password_hash, full_name, role, vertical_id, must_change_password)
        values (${data.email}, ${await hashPassword(data.password)}, ${data.full_name}, ${data.role},
                ${data.role === "vertical_head" ? data.vertical_id : null}, true)`;
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new Error("A login with this email already exists.");
      throw e;
    }
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        full_name: z.string().trim().min(1).max(120),
        role: roleEnum,
        vertical_id: z.string().uuid().nullable(),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireUser, hashPassword, endAllSessions } = await server();
    const me = await requireUser(["admin"]);
    if (data.role === "vertical_head" && !data.vertical_id) throw new Error("Choose a vertical for this head.");
    if (data.user_id === me.id && data.role !== "admin") throw new Error("You cannot remove your own admin role.");
    await db()`
      update users set full_name = ${data.full_name}, role = ${data.role},
        vertical_id = ${data.role === "vertical_head" ? data.vertical_id : null}
      where id = ${data.user_id}`;
    if (data.password) {
      // A reset password is temporary: the person must choose their own at next sign-in.
      await db()`update users set password_hash = ${await hashPassword(data.password)}, must_change_password = ${data.user_id !== me.id} where id = ${data.user_id}`;
      if (data.user_id !== me.id) await endAllSessions(data.user_id);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    const me = await requireUser(["admin"]);
    if (data.user_id === me.id) throw new Error("You cannot delete your own account.");
    await db()`delete from users where id = ${data.user_id}`;
    return { ok: true };
  });

// First-time setup: only works while no admin exists yet.
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await server();
  const n = (await db()<{ n: number }[]>`select count(*)::int as n from users where role = 'admin'`)[0]?.n ?? 0;
  return { exists: n > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, hashPassword } = await server();
    const hash = await hashPassword(data.password);
    await db().begin(async (tx) => {
      // Serialises concurrent setup attempts so only one admin can be created here.
      await tx`lock table users in exclusive mode`;
      const n = (await tx<{ n: number }[]>`select count(*)::int as n from users where role = 'admin'`)[0]?.n ?? 0;
      if (n > 0) throw new Error("Setup is already complete.");
      await tx`insert into users (email, password_hash, full_name, role) values (${data.email}, ${hash}, ${data.full_name}, 'admin')`;
      // A fresh database starts with the eight placeholder verticals, as the Supabase version did.
      const v = (await tx<{ v: number }[]>`select count(*)::int as v from verticals`)[0]?.v ?? 0;
      if (v === 0) await tx`insert into verticals (name) select 'Vertical ' || i from generate_series(1, 8) i`;
    });
    return { ok: true };
  });
