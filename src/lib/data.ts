import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Vertical = Database["public"]["Tables"]["verticals"]["Row"];
export type Role = Database["public"]["Enums"]["app_role"];

export type Me = {
  userId: string;
  email: string;
  role: Role | null;
  verticalId: string | null;
  name: string;
};

export async function fetchMe(): Promise<Me | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: r } = await supabase
    .from("user_roles")
    .select("role, vertical_id, full_name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    role: r?.role ?? null,
    verticalId: r?.vertical_id ?? null,
    name: r?.full_name ?? data.user.email ?? "",
  };
}

export const verticalsQuery = queryOptions({
  queryKey: ["verticals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("verticals").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

export const inr = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const yetToReceive = (p: Pick<Project, "total_cost" | "amount_received">) =>
  Math.max(0, Number(p.total_cost) - Number(p.amount_received));

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export const isCapacityBuilding = (name: string) => name === "Training & Capacity Building";

export const progressNotApplicable = (p: Pick<Project, "physical_progress_not_applicable">, verticalName: string) =>
  isCapacityBuilding(verticalName) && p.physical_progress_not_applicable;

export const homeFor = (role: Role | null) =>
  role === "admin" ? "/app/dashboard" : role === "official" ? "/app/dashboard" : role === "vertical_head" ? "/app/vertical" : "/";

/** Project period (commencement → proposed/completed date) overlaps the selected from–to range. */
export const inDateRange = (p: Pick<Project, "start_date" | "end_date">, from: string, to: string) => {
  if (!from && !to) return true;
  const start = p.start_date ?? p.end_date;
  const end = p.end_date ?? p.start_date;
  if (!start || !end) return false;
  return (!to || start <= to) && (!from || end >= from);
};
