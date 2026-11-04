// Derived figures for the dashboard. Pure functions of the project list, so they're easy to test.
import { yetToReceive, type Project } from "./data";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The date a project is meant to finish: expected completion if given, else the proposed end date. */
export const dueDate = (p: Pick<Project, "expected_completion" | "end_date">) => p.expected_completion ?? p.end_date;

export type Attention = {
  overdue: Project[];
  duesOnCompleted: Project[];
  onHold: Project[];
  withIssues: Project[];
  stale: Project[];
  dueSoon: Project[];
};

/** Things an official should look at, as of `today`. */
export function attention(projects: Project[], today = new Date(), staleDays = 30, soonDays = 60): Attention {
  const t = iso(today);
  const soon = iso(new Date(today.getTime() + soonDays * DAY));
  const staleBefore = new Date(today.getTime() - staleDays * DAY).toISOString();
  const open = projects.filter((p) => p.status !== "Completed");
  const byDue = (a: Project, b: Project) => (dueDate(a) ?? "").localeCompare(dueDate(b) ?? "");
  return {
    overdue: open.filter((p) => p.status === "Ongoing" && dueDate(p) && dueDate(p)! < t).sort(byDue),
    duesOnCompleted: projects.filter((p) => p.status === "Completed" && yetToReceive(p) > 0).sort((a, b) => yetToReceive(b) - yetToReceive(a)),
    onHold: projects.filter((p) => p.status === "On hold"),
    withIssues: open.filter((p) => isMeaningful(p.issues)),
    stale: open.filter((p) => p.updated_at < staleBefore).sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    dueSoon: open.filter((p) => p.status === "Ongoing" && dueDate(p) && dueDate(p)! >= t && dueDate(p)! <= soon).sort(byDue),
  };
}

/** Free-text fields often hold "NA", "-", "nil" etc. Those don't count as an issue. */
export const isMeaningful = (s: string | null) => !!s && !/^\s*(n\/?a|nil|none|no|-+|—|\.)?\s*$/i.test(s);

/** Indian financial year (April–March) containing a date, e.g. "2026-27". */
export function fyOf(date: string) {
  const y = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** From–to dates for a financial year label like "2026-27". */
export function fyRange(fy: string) {
  const start = Number(fy.slice(0, 4));
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

/** Financial years that any project runs in, newest first. */
export function financialYears(projects: Project[], today = new Date()) {
  const set = new Set<string>([fyOf(iso(today))]);
  for (const p of projects) for (const d of [p.start_date, p.end_date, p.expected_completion]) if (d) set.add(fyOf(d));
  return [...set].sort().reverse();
}

/** Projects started and participants trained per month (by commencement date), oldest first.
 *  Months with no activity in between are included as zeros so the time axis stays even. */
export function monthlyTrend(projects: Project[], range: { from?: string; to?: string } = {}) {
  const m = new Map<string, { month: string; started: number; completed: number; participants: number }>();
  for (const p of projects) {
    if (!p.start_date) continue;
    if ((range.from && p.start_date < range.from) || (range.to && p.start_date > range.to)) continue;
    const key = p.start_date.slice(0, 7);
    const row = m.get(key) ?? { month: key, started: 0, completed: 0, participants: 0 };
    row.started++;
    if (p.status === "Completed") row.completed++;
    row.participants += p.participants ?? 0;
    m.set(key, row);
  }
  const keys = [...m.keys()].sort();
  if (keys.length === 0) return [];
  const out = [];
  for (let [y, mo] = keys[0]!.split("-").map(Number) as [number, number]; ; mo === 12 ? (y++, (mo = 1)) : mo++) {
    const key = `${y}-${String(mo).padStart(2, "0")}`;
    out.push(m.get(key) ?? { month: key, started: 0, completed: 0, participants: 0 });
    if (key === keys.at(-1)) return out;
  }
}

/** "2026-04" → "Apr 26" */
export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

/** Distinct client names, spelled as first entered, A–Z. Case and extra spaces don't make a new client. */
export function distinctClients(projects: Pick<Project, "client_name">[]) {
  const m = new Map<string, string>();
  for (const p of projects) {
    const name = p.client_name?.trim().replace(/\s+/g, " ");
    if (name && !m.has(name.toLowerCase())) m.set(name.toLowerCase(), name);
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b));
}

/** Same normalisation, for comparing a project's client with a selected one. */
export const clientKey = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export const totalParticipants = (projects: Project[]) => projects.reduce((a, p) => a + (p.participants ?? 0), 0);
