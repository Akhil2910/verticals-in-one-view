// Server functions for sign-in, verticals and projects. Access rules that used to
// be Supabase RLS policies are enforced here:
// - admins and officials read everything; vertical heads only their own vertical
// - admins write anything; vertical heads write only their own vertical's projects
// - only admins change verticals
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Me } from "./data";
import type { Project, Vertical } from "./types";

// Loaded inside handlers so the server-only modules never reach the browser bundle.
const server = async () => ({ ...(await import("@/server/db.server")), ...(await import("@/server/auth.server")) });

const STATUS = z.string().refine((s) => ["Ongoing", "Completed", "On hold"].includes(s), "Unknown status");
const text = z.string().max(10_000).nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const money = z.number().min(0).max(1e13);

const projectInput = z.object({
  vertical_id: z.string().uuid(),
  name: z.string().trim().min(1).max(300),
  project_head: text,
  team_members: text,
  start_date: date,
  end_date: date,
  status: STATUS,
  progress_notes: text,
  physical_progress: z.number().min(0).max(100),
  physical_progress_not_applicable: z.boolean(),
  milestones_completed: text,
  milestones_pending: text,
  total_cost: money,
  amount_received: money,
  expenditure: money,
  amount_receivable: money,
  expected_completion: date,
  issues: text,
  other_info: text,
  participants: z.number().int().min(0).nullable(),
  client_name: z.string().trim().max(200).nullable().transform((s) => s || null),
  partner_vendors: z
    .array(z.object({ name: z.string().trim().min(1, "Every vendor needs a name.").max(200), scope: z.string().trim().max(500).nullable().transform((s) => s || null), amount: money.nullable() }))
    .max(50),
});

// ---------- Session ----------

export const getMe = createServerFn({ method: "GET" }).handler(async (): Promise<Me | null> => {
  const { currentUser } = await server();
  const u = await currentUser();
  if (!u) return null;
  return { userId: u.id, email: u.email, role: u.role, verticalId: u.vertical_id, name: u.full_name ?? u.email, mustChangePassword: u.must_change_password };
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { db, verifyPassword, hashPassword, isLegacyHash, startSession, checkRateLimit, recordFailure, clearFailures } = await server();
    checkRateLimit(data.email);
    const [u] = await db()<{ id: string; password_hash: string }[]>`select id, password_hash from users where lower(email) = ${data.email}`;
    if (!u || !(await verifyPassword(data.password, u.password_hash))) {
      recordFailure(data.email);
      throw new Error("Wrong email or password.");
    }
    clearFailures(data.email);
    // Passwords carried over from Supabase are re-stored in this app's own format on first use.
    if (isLegacyHash(u.password_hash)) await db()`update users set password_hash = ${await hashPassword(data.password)} where id = ${u.id}`;
    await startSession(u.id);
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await server();
  await endSession();
  return { ok: true };
});

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ current: z.string().min(1).max(200), next: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser, verifyPassword, hashPassword } = await server();
    const me = await requireUser();
    const [u] = await db()<{ password_hash: string }[]>`select password_hash from users where id = ${me.id}`;
    if (!u || !(await verifyPassword(data.current, u.password_hash))) throw new Error("Your current password is wrong.");
    if (data.current === data.next) throw new Error("Choose a password different from the current one.");
    await db()`update users set password_hash = ${await hashPassword(data.next)}, must_change_password = false where id = ${me.id}`;
    return { ok: true };
  });

// ---------- Verticals ----------

export const listVerticals = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUser } = await server();
  await requireUser();
  return db()<Vertical[]>`select id, name, created_at from verticals order by name`;
});

export const createVertical = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    await requireUser(["admin"]);
    try {
      await db()`insert into verticals (name) values (${data.name})`;
    } catch (e) {
      throw friendly(e);
    }
    return { ok: true };
  });

export const renameVertical = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    await requireUser(["admin"]);
    try {
      await db()`update verticals set name = ${data.name} where id = ${data.id}`;
    } catch (e) {
      throw friendly(e);
    }
    return { ok: true };
  });

export const deleteVertical = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    await requireUser(["admin"]);
    try {
      await db()`delete from verticals where id = ${data.id}`;
    } catch (e) {
      throw friendly(e);
    }
    return { ok: true };
  });

// ---------- Projects ----------

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUser } = await server();
  const me = await requireUser();
  return me.role === "vertical_head"
    ? db()<Project[]>`select * from projects where vertical_id = ${me.vertical_id} order by updated_at desc`
    : db()<Project[]>`select * from projects order by updated_at desc`;
});

export const getProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    const me = await requireUser();
    const [p] = await db()<Project[]>`select * from projects where id = ${data.id}`;
    if (!p || (me.role === "vertical_head" && p.vertical_id !== me.vertical_id)) throw new Error("Project not found.");
    return p;
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    const me = await requireUser(["admin", "vertical_head"]);
    if (me.role === "vertical_head" && data.vertical_id !== me.vertical_id) throw new Error("You can only add projects to your own vertical.");
    const [row] = await db()<{ id: string }[]>`
      insert into projects ${db()({ ...data, partner_vendors: db().json(data.partner_vendors), updated_by: me.id, updated_by_name: me.full_name ?? me.email })}
      returning id`;
    return row;
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), values: projectInput }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    const me = await requireUser(["admin", "vertical_head"]);
    const [p] = await db()<{ vertical_id: string }[]>`select vertical_id from projects where id = ${data.id}`;
    if (!p) throw new Error("Project not found.");
    if (me.role === "vertical_head" && (p.vertical_id !== me.vertical_id || data.values.vertical_id !== me.vertical_id))
      throw new Error("You can only edit projects in your own vertical.");
    await db()`
      update projects set ${db()({ ...data.values, partner_vendors: db().json(data.values.partner_vendors), updated_by: me.id, updated_by_name: me.full_name ?? me.email })}, updated_at = now()
      where id = ${data.id}`;
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireUser } = await server();
    const me = await requireUser(["admin", "vertical_head"]);
    const [p] = await db()<{ vertical_id: string }[]>`select vertical_id from projects where id = ${data.id}`;
    if (!p) throw new Error("Project not found.");
    if (me.role === "vertical_head" && p.vertical_id !== me.vertical_id) throw new Error("You can only delete projects in your own vertical.");
    await db()`delete from projects where id = ${data.id}`;
    return { ok: true };
  });

/** Turns Postgres constraint errors into messages people can act on. */
function friendly(e: unknown) {
  const code = (e as { code?: string }).code;
  if (code === "23505") return new Error("That name is already in use.");
  if (code === "23503") return new Error("This vertical has projects. Move or delete them first.");
  return e instanceof Error ? e : new Error(String(e));
}
