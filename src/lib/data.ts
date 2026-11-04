import { queryOptions } from "@tanstack/react-query";
import { getMe, getProject, listProjects, listVerticals } from "./api.functions";
import type { Project, Role, Vertical } from "./types";

export type { Project, ProjectInput, Role, Vertical } from "./types";

export type Me = {
  userId: string;
  email: string;
  role: Role | null;
  verticalId: string | null;
  name: string;
  mustChangePassword: boolean;
};

export const fetchMe = (): Promise<Me | null> => getMe();

export const verticalsQuery = queryOptions({
  queryKey: ["verticals"],
  queryFn: (): Promise<Vertical[]> => listVerticals(),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: (): Promise<Project[]> => listProjects(),
});

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: (): Promise<Project> => getProject({ data: { id } }),
  });

export const inr = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Short Indian-style amounts: ₹1.2 Cr, ₹45 L, ₹12K. Pair with `inr` in a title for the exact figure. */
export const inrCompact = (n: number, digits = 1) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${+(n / 1e7).toFixed(digits)} Cr`;
  if (a >= 1e5) return `₹${+(n / 1e5).toFixed(digits)} L`;
  if (a >= 1e3) return `₹${+(n / 1e3).toFixed(digits)}K`;
  return `₹${n}`;
};

/** Totals shared by the summary panel, vertical cards and reports. */
export const totals = (ps: Project[]) =>
  ps.reduce(
    (a, p) => ({
      count: a.count + 1,
      ongoing: a.ongoing + (p.status === "Ongoing" ? 1 : 0),
      completed: a.completed + (p.status === "Completed" ? 1 : 0),
      onHold: a.onHold + (p.status === "On hold" ? 1 : 0),
      cost: a.cost + Number(p.total_cost),
      received: a.received + Number(p.amount_received),
      pending: a.pending + yetToReceive(p),
      expenditure: a.expenditure + Number(p.expenditure),
    }),
    { count: 0, ongoing: 0, completed: 0, onHold: 0, cost: 0, received: 0, pending: 0, expenditure: 0 },
  );

/** Everything a search box should match: name, head, team, client and partner vendors. */
export const searchText = (p: Project) =>
  [p.name, p.project_head, p.team_members, p.client_name, ...(p.partner_vendors ?? []).map((v) => v.name)].filter(Boolean).join(" ").toLowerCase();

/** Whole-number percentage, 0 when the base is 0. */
export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

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
