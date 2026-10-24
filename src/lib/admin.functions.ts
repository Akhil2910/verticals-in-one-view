import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Only the admin can do this.");
}

const roleEnum = z.enum(["admin", "official", "vertical_head"]);

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role, vertical_id, full_name, email, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);
    return data;
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
        role: roleEnum,
        vertical_id: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (data.role === "vertical_head" && !data.vertical_id) throw new Error("Choose a vertical for this head.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
      vertical_id: data.role === "vertical_head" ? data.vertical_id : null,
      full_name: data.full_name,
      email: data.email,
    });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(rErr.message);
    }
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (data.role === "vertical_head" && !data.vertical_id) throw new Error("Choose a vertical for this head.");
    if (data.user_id === context.userId && data.role !== "admin") throw new Error("You cannot remove your own admin role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
      if (error) throw new Error(error.message);
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({
        full_name: data.full_name,
        role: data.role,
        vertical_id: data.role === "vertical_head" ? data.vertical_id : null,
      })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// First-time setup: only works while no admin exists yet.
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Setup is already complete.");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create admin");
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "admin",
      full_name: data.full_name,
      email: data.email,
    });
    if (rErr) throw new Error(rErr.message);
    return { ok: true };
  });
