import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, FolderKanban, IndianRupee, Search, type LucideIcon } from "lucide-react";
import { verticalStyle } from "@/lib/vertical-style";
import { fmtDate, inr, inrCompact, pct, searchText, totals, yetToReceive, progressNotApplicable, type Project, type Vertical } from "@/lib/data";

export const STATUSES = ["Ongoing", "Completed", "On hold"] as const;

// One colour per status, used by badges, dots, cards and charts alike.
export const STATUS_STYLE: Record<string, { badge: string; dot: string; text: string; color: string }> = {
  Ongoing: { badge: "bg-ongoing/10 text-foreground ring-ongoing/30", dot: "bg-ongoing", text: "text-ongoing", color: "var(--ongoing)" },
  Completed: { badge: "bg-completed/10 text-foreground ring-completed/35", dot: "bg-completed", text: "text-completed", color: "var(--completed)" },
  "On hold": { badge: "bg-onhold/10 text-foreground ring-onhold/30", dot: "bg-onhold", text: "text-onhold", color: "var(--onhold)" },
};

export function StatusBadge({ s }: { s: string }) {
  const st = STATUS_STYLE[s] ?? STATUS_STYLE["Ongoing"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${st.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {s}
    </span>
  );
}

/** Consistent top of every page: small eyebrow, serif title, one-line description, actions on the right. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</div>}
        <h1 className="mt-1 text-3xl font-bold leading-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap items-end gap-2">{children}</div>}
    </div>
  );
}

export function SectionTitle({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        {Icon && <span className="flex h-7 w-7 items-center justify-center self-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>}
        {title}
      </h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Received vs yet-to-receive as one bar; the full bar is the total project cost. */
export function FundsBar({ received, pending, className = "h-2" }: { received: number; pending: number; className?: string }) {
  const whole = received + pending;
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-muted ${className}`} title={`Received ${inr(received)} · Yet to receive ${inr(pending)}`}>
      <div className="bg-received" style={{ width: `${pct(received, whole)}%` }} />
      <div className="bg-due" style={{ width: `${whole ? 100 - pct(received, whole) : 0}%` }} />
    </div>
  );
}

/** Summary panel: project counts on the left, money on the right. */
export function Stats({ projects }: { projects: Project[] }) {
  const t = totals(projects);
  const statusRows = [
    ["Ongoing", t.ongoing],
    ["Completed", t.completed],
    ["On hold", t.onHold],
  ] as const;
  return (
    <section className="print-break grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="border-b p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"><FolderKanban className="h-3.5 w-3.5" /></span>
          Projects &amp; programmes
        </div>
        <div className="mt-2 flex items-end gap-6">
          <div className="font-serif text-5xl font-semibold leading-none text-primary tabular-nums">{t.count}</div>
          <dl className="grid flex-1 grid-cols-3 gap-3">
            {statusRows.map(([label, n]) => (
              <div key={label}>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[label]!.dot}`} />
                  {label}
                </dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
          {statusRows.map(([label, n]) => <div key={label} className={STATUS_STYLE[label]!.dot} style={{ width: `${pct(n, t.count)}%` }} />)}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-due/15 text-[#0b7a8e]"><IndianRupee className="h-3.5 w-3.5" /></span>
            Total project cost
          </div>
          <div className="text-xs text-muted-foreground">{pct(t.received, t.cost)}% received</div>
        </div>
        <div className="mt-2 font-serif text-4xl font-semibold leading-none text-primary tabular-nums" title={inr(t.cost)}>{inrCompact(t.cost, 2)}</div>
        <FundsBar received={t.received} pending={t.pending} className="mt-4 h-2.5" />
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Money label="Received" value={t.received} dot="bg-received" />
          <Money label="Yet to receive" value={t.pending} dot="bg-due" />
          <Money label="Expenditure" value={t.expenditure} dot="bg-spent" />
        </dl>
      </div>
    </section>
  );
}

function Money({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums" title={inr(value)}>{inrCompact(value, 2)}</dd>
    </div>
  );
}

/** One card per vertical: what it has, how far along, how much money has come in. */
export function VerticalCards({ verticals, projects, styleFrom }: { verticals: Vertical[]; projects: Project[]; /** Full list, so colours stay put when `verticals` is filtered. */ styleFrom?: Vertical[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {verticals.map((v) => {
        const t = totals(projects.filter((p) => p.vertical_id === v.id));
        const { color, Icon } = verticalStyle(v, styleFrom ?? verticals);
        return (
          <Link
            key={v.id}
            to="/app/verticals/$id"
            params={{ id: v.id }}
            style={{ "--vc": color } as React.CSSProperties}
            className="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-4 pt-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-[var(--vc)]" />
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--vc)_14%,transparent)] text-[var(--vc)]"><Icon className="h-[18px] w-[18px]" /></span>
              <h3 className="min-w-0 flex-1 font-serif text-base font-semibold leading-snug">{v.name}</h3>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--vc)]" />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t.count} project{t.count === 1 ? "" : "s"}</span>
              {t.ongoing > 0 && <span>{t.ongoing} ongoing</span>}
              {t.completed > 0 && <span>{t.completed} completed</span>}
              {t.onHold > 0 && <span className="inline-flex items-center gap-1 text-foreground"><span className="h-1.5 w-1.5 rounded-full bg-onhold" />{t.onHold} on hold</span>}
            </div>
            <div className="mt-auto pt-4">
              {t.count === 0 ? (
                <div className="text-xs text-muted-foreground">No projects recorded yet</div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold tabular-nums text-foreground" title={inr(t.cost)}>{inrCompact(t.cost, 2)}</span>
                    <span className="text-muted-foreground">{pct(t.received, t.cost)}% received</span>
                  </div>
                  <FundsBar received={t.received} pending={t.pending} className="mt-1.5 h-1.5" />
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const selectCls = "h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm";


type SortKey = "name" | "vertical" | "status" | "progress" | "cost" | "due" | "updated";
const SORTS: Record<SortKey, (p: Project) => string | number> = {
  name: (p) => p.name.toLowerCase(),
  vertical: (p) => p.vertical_id, // replaced by the vertical name inside the table
  status: (p) => p.status,
  progress: (p) => Number(p.physical_progress),
  cost: (p) => Number(p.total_cost),
  due: (p) => yetToReceive(p), // "Funds received" column sorts by the amount still due
  updated: (p) => p.updated_at,
};

export function ProjectsTable({
  projects,
  verticals,
  showVertical = true,
  showFilters = true,
  clients = [],
}: {
  projects: Project[];
  verticals: Vertical[];
  showVertical?: boolean;
  /** Off where a page-level filter bar already narrows the list. */
  showFilters?: boolean;
  /** Client names for the table's own client filter (shown when non-empty). */
  clients?: string[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vert, setVert] = useState("");
  const [client, setClient] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updated", dir: -1 });
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  const rows = useMemo(() => {
    const list = projects.filter(
      (p) =>
        (!q || searchText(p).includes(q.toLowerCase())) &&
        (!status || p.status === status) &&
        (!vert || p.vertical_id === vert) &&
        (!client || (p.client_name ?? "").trim().toLowerCase() === client.toLowerCase()),
    );
    const val = sort.key === "vertical" ? (p: Project) => vName(p.vertical_id) : SORTS[sort.key];
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
    });
  }, [projects, q, status, vert, client, sort]);
  const navigate = useNavigate();
  const head = (key: SortKey, label: string, cls = "") => (
    <th className={`px-4 py-2.5 font-semibold ${cls}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" ? 1 : -1 }))}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground ${sort.key === key ? "text-foreground" : ""}`}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className={`no-print flex-wrap items-center gap-2 border-b bg-muted/30 p-3 ${showFilters ? "flex" : "hidden"}`}>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search project, client, vendor…" aria-label="Search the project list" value={q} onChange={(e) => setQ(e.target.value)} className={`${selectCls} w-full pl-8`} />
        </div>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {clients.length > 0 && (
          <select className={selectCls} value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
            <option value="">All clients</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(q || status || vert || client) && (
          <button type="button" onClick={() => { setQ(""); setStatus(""); setVert(""); setClient(""); }} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
        {showVertical && (
          <select className={selectCls} value={vert} onChange={(e) => setVert(e.target.value)}>
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} of {projects.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              {head("name", "Project / Programme")}
              {showVertical && head("vertical", "Vertical")}
              {head("status", "Status")}
              {head("progress", "Physical progress", "w-40")}
              {head("cost", "Total cost", "text-right")}
              {head("due", "Funds received", "w-44")}
              {head("updated", "Updated")}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{projects.length ? "No projects match these filters." : "No projects yet."}</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} onClick={() => navigate({ to: "/app/projects/$id", params: { id: p.id } })} className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/40">
                <td className="min-w-72 max-w-md px-4 py-3">
                  <Link to="/app/projects/$id" params={{ id: p.id }} className="font-medium text-foreground hover:text-primary hover:underline">{p.name}</Link>
                  {(p.client_name || p.project_head) && (
                    <div className="text-xs text-muted-foreground">
                      {p.client_name && <span className="font-medium text-foreground/80">{p.client_name}</span>}
                      {p.client_name && p.project_head && " · "}
                      {p.project_head}
                    </div>
                  )}
                </td>
                {showVertical && <td className="px-4 py-3 text-muted-foreground">{vName(p.vertical_id)}</td>}
                <td className="px-4 py-3"><StatusBadge s={p.status} /></td>
                <td className="px-4 py-3">
                  {progressNotApplicable(p, vName(p.vertical_id)) ? (
                    <span className="text-xs text-muted-foreground">Not applicable</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${Number(p.physical_progress)}%` }} /></div>
                      <span className="w-9 text-right text-xs tabular-nums">{Number(p.physical_progress)}%</span>
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{inr(p.total_cost)}</td>
                <td className="px-4 py-3">
                  <FundsBar received={Number(p.amount_received)} pending={yetToReceive(p)} className="h-1.5" />
                  <div className="mt-1 text-xs tabular-nums text-muted-foreground">{pct(Number(p.amount_received), Number(p.total_cost))}% · {inrCompact(yetToReceive(p), 2)} due</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The 16 points of the circular, grouped the same way as the entry form. */
export function ProjectDetail({ p, verticalName, heading }: { p: Project; verticalName: string; heading?: React.ReactNode }) {
  const groups: [string, [string, React.ReactNode][]][] = [
    ["Basic details", [
      ["1. Name of the Project / Programme", p.name],
      ["2. Name of the Vertical", verticalName],
      ["Client / Department", p.client_name],
      ...(/capacity/i.test(verticalName) ? [["Number of participants", p.participants == null ? null : String(p.participants)] as [string, React.ReactNode]] : []),
      ["3. Project Head / Team Members", p.project_head || p.team_members ? <>{p.project_head ?? "—"}{p.team_members ? <div className="text-muted-foreground">{p.team_members}</div> : null}</> : null],
      ["4. Commencement → proposed / completed date", p.start_date || p.end_date ? `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}` : null],
    ]],
    ["Status & progress", [
      ["5. Current status / progress", <><StatusBadge s={p.status} />{p.progress_notes ? <div className="mt-1.5 whitespace-pre-wrap">{p.progress_notes}</div> : null}</>],
      ["6. Physical work completed", progressNotApplicable(p, verticalName) ? "Not applicable" : `${Number(p.physical_progress)}%`],
      ["7. Key activities / milestones completed", p.milestones_completed],
      ["8. Activities / milestones pending", p.milestones_pending],
      ["14. Expected date of completion", p.expected_completion ? fmtDate(p.expected_completion) : null],
    ]],
    ["Financials", [
      ["9. Total Project Cost / Sanctioned Amount", inr(p.total_cost)],
      ["10. Amount received", inr(p.amount_received)],
      ["11. Amount yet to be received", inr(yetToReceive(p))],
      ["12. Expenditure incurred", inr(p.expenditure)],
      ["13. Amount receivable", inr(p.amount_receivable)],
      ["Partner vendors", p.partner_vendors?.length ? <VendorTable vendors={p.partner_vendors} /> : null],
    ]],
    ["Other", [
      ["15. Major issues / constraints / pending matters", p.issues],
      ["16. Any other relevant information", p.other_info],
    ]],
  ];
  return (
    <article className="print-break overflow-hidden rounded-xl border bg-card shadow-sm print:rounded-none print:shadow-none">
      {heading && <header className="border-b bg-muted/40 px-5 py-3">{heading}</header>}
      {groups.map(([title, rows]) => (
        <section key={title} className="border-b last:border-b-0">
          <h3 className="bg-muted/20 px-5 pt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand">{title}</h3>
          <dl className="divide-y px-5">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="whitespace-pre-wrap">{v || <span className="text-muted-foreground">—</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <footer className="border-t px-5 py-2 text-xs text-muted-foreground">
        Last updated {new Date(p.updated_at).toLocaleString("en-IN")} {p.updated_by_name ? `by ${p.updated_by_name}` : ""}
      </footer>
    </article>
  );
}

function VendorTable({ vendors }: { vendors: Project["partner_vendors"] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {vendors.map((v, i) => (
          <tr key={i} className="border-b last:border-b-0">
            <td className="py-1 pr-3 align-top font-medium">{v.name}</td>
            <td className="py-1 pr-3 align-top text-muted-foreground">{v.scope ?? "—"}</td>
            <td className="whitespace-nowrap py-1 text-right align-top tabular-nums">{v.amount == null ? "—" : inr(v.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
