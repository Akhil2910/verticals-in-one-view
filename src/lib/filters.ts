// Dashboard filters live in the URL (?v=…&status=…&p=this-month…), so a filtered view can be bookmarked or shared.
import { inDateRange, searchText, type Project } from "./data";
import { clientKey, fyOf, fyRange } from "./insights";

/** Relative periods: stored by name so a bookmarked "this month" stays current. */
export const PRESETS = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-quarter": "This quarter",
  "last-quarter": "Last quarter",
} as const;
export type Preset = keyof typeof PRESETS;

export type DashboardFilters = {
  v?: string | undefined; // vertical id
  status?: string | undefined;
  c?: string | undefined; // client name
  p?: Preset | undefined; // relative period; overrides fy and from/to
  fy?: string | undefined; // "2026-27"; overrides from/to
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
};

const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : undefined);
const date = (x: unknown) => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : undefined);

export function parseFilters(search: Record<string, unknown>): DashboardFilters {
  const p = typeof search["p"] === "string" && search["p"] in PRESETS ? (search["p"] as Preset) : undefined;
  const fy = !p && typeof search["fy"] === "string" && /^\d{4}-\d{2}$/.test(search["fy"]) ? search["fy"] : undefined;
  return {
    v: str(search["v"]),
    status: ["Ongoing", "Completed", "On hold"].includes(search["status"] as string) ? (search["status"] as string) : undefined,
    c: str(search["c"]),
    p,
    fy,
    from: p || fy ? undefined : date(search["from"]),
    to: p || fy ? undefined : date(search["to"]),
    q: str(search["q"]),
  };
}

const ymd = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
};

/** First and last day of a relative period, as of `today` (calendar months; quarters are Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar). */
export function presetRange(p: Preset, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const qStart = m - (m % 3);
  switch (p) {
    case "this-month":
      return { from: ymd(y, m, 1), to: ymd(y, m + 1, 0) };
    case "last-month":
      return { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) };
    case "last-3-months":
      return { from: ymd(y, m - 2, 1), to: ymd(y, m + 1, 0) };
    case "this-quarter":
      return { from: ymd(y, qStart, 1), to: ymd(y, qStart + 3, 0) };
    case "last-quarter":
      return { from: ymd(y, qStart - 3, 1), to: ymd(y, qStart, 0) };
  }
}

export const period = (f: DashboardFilters, today = new Date()) =>
  f.p ? presetRange(f.p, today) : f.fy ? fyRange(f.fy) : { from: f.from ?? "", to: f.to ?? "" };

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Human label for the selected period, e.g. "November 2026", "Q3 FY 2026-27 (Oct–Dec 2026)", "FY 2025-26". */
export function periodLabel(f: DashboardFilters, today = new Date()) {
  const { from, to } = period(f, today);
  if (!from && !to) return "All time";
  if (f.p === "this-month" || f.p === "last-month") return new Date(`${from}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  if (f.p === "this-quarter" || f.p === "last-quarter") {
    const q = [4, 1, 2, 3][Math.floor(Number(from.slice(5, 7)) / 3) % 4]; // Apr=Q1 … Jan=Q4
    const span = `${new Date(`${from}T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}–${new Date(`${to}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
    return `Q${q} FY ${fyOf(from)} (${span})`;
  }
  if (f.fy) return `FY ${f.fy}`;
  return `${from ? fmt(from) : "…"} – ${to ? fmt(to) : "…"}`;
}

/** Everything except status, so status counts can still show what each choice would give. */
export function applyFilters(projects: Project[], f: DashboardFilters, { ignoreStatus = false, today = new Date() } = {}) {
  const { from, to } = period(f, today);
  const q = f.q?.toLowerCase();
  const c = f.c ? clientKey(f.c) : null;
  return projects.filter(
    (p) =>
      (!f.v || p.vertical_id === f.v) &&
      (ignoreStatus || !f.status || p.status === f.status) &&
      (!c || clientKey(p.client_name) === c) &&
      inDateRange(p, from, to) &&
      (!q || searchText(p).includes(q)),
  );
}

export const activeFilterCount = (f: DashboardFilters) => [f.v, f.status, f.c, f.p || f.fy || f.from || f.to, f.q].filter(Boolean).length;
