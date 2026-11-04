import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, Building2, CalendarClock, Clock, Gauge, IndianRupee, MessageSquareWarning, PauseCircle, Users, type LucideIcon } from "lucide-react";
import { verticalStyle } from "@/lib/vertical-style";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { fmtDate, inr, inrCompact, pct, progressNotApplicable, yetToReceive, type Project, type Vertical } from "@/lib/data";
import { clientKey, distinctClients, dueDate, monthLabel, monthlyTrend, totalParticipants, type Attention } from "@/lib/insights";
import { FundsBar, StatusBadge } from "./projects";

/** Second row of headline figures: the ones the summary panel doesn't cover. */
export function InsightStrip({ projects, verticals, attention }: { projects: Project[]; verticals: Vertical[]; attention: Attention }) {
  const ongoing = projects.filter((p) => p.status === "Ongoing");
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "";
  const measured = ongoing.filter((p) => !progressNotApplicable(p, vName(p.vertical_id)));
  const avgProgress = measured.length ? Math.round(measured.reduce((a, p) => a + Number(p.physical_progress), 0) / measured.length) : null;
  const dueOnDone = attention.duesOnCompleted.reduce((a, p) => a + yetToReceive(p), 0);
  const reporting = new Set(projects.map((p) => p.vertical_id)).size;
  const items: [string, string, string, LucideIcon, string][] = [
    ["Participants trained", totalParticipants(projects).toLocaleString("en-IN"), "across training programmes", Users, "bg-spent/10 text-spent"],
    ["Average progress", avgProgress === null ? "—" : `${avgProgress}%`, `of ${measured.length} ongoing project${measured.length === 1 ? "" : "s"}`, Gauge, "bg-ongoing/10 text-ongoing"],
    ["Due on completed work", inrCompact(dueOnDone, 2), `${attention.duesOnCompleted.length} project${attention.duesOnCompleted.length === 1 ? "" : "s"} awaiting payment`, IndianRupee, "bg-due/15 text-[#9a6700]"],
    ["Verticals reporting", `${reporting} of ${verticals.length}`, verticals.length - reporting ? `${verticals.length - reporting} have no projects in this view` : "all verticals have projects", Building2, "bg-completed/10 text-[#0d7a53]"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([k, v, sub, Icon, tone]) => (
        <div key={k} className="flex gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-0.5 font-serif text-2xl font-semibold tabular-nums text-foreground">{v}</div>
            <div className="text-[11px] text-muted-foreground">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

type TabKey = keyof Attention;
const TABS: { key: TabKey; label: string; icon: typeof Clock; tone: string; empty: string }[] = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, tone: "text-onhold", empty: "No ongoing project is past its completion date." },
  { key: "dueSoon", label: "Due in 60 days", icon: CalendarClock, tone: "text-ongoing", empty: "Nothing is due to finish in the next 60 days." },
  { key: "duesOnCompleted", label: "Payment due", icon: IndianRupee, tone: "text-[#9a6700]", empty: "Every completed project has been paid in full." },
  { key: "onHold", label: "On hold", icon: PauseCircle, tone: "text-onhold", empty: "No project is on hold." },
  { key: "withIssues", label: "Issues raised", icon: MessageSquareWarning, tone: "text-[#9a6700]", empty: "No open project reports an issue." },
  { key: "stale", label: "Not updated 30+ days", icon: Clock, tone: "text-muted-foreground", empty: "Every open project was updated in the last 30 days." },
];

/** Tabs of projects that need someone to act, each with the one fact that explains why. */
export function AttentionPanel({ attention, verticals }: { attention: Attention; verticals: Vertical[] }) {
  const first = TABS.find((t) => attention[t.key].length)?.key ?? "overdue";
  const [tab, setTab] = useState<TabKey>(first);
  const current = TABS.find((t) => t.key === tab)!;
  const list = attention[tab];
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";

  const fact = (p: Project) => {
    switch (tab) {
      case "overdue":
      case "dueSoon":
        return <span className={tab === "overdue" ? "font-medium text-foreground" : "text-muted-foreground"}>Due {fmtDate(dueDate(p))}</span>;
      case "duesOnCompleted":
        return <span className="font-medium tabular-nums">{inr(yetToReceive(p))} due</span>;
      case "stale":
        return <span>Updated {fmtDate(p.updated_at)}</span>;
      case "withIssues":
        return <span className="line-clamp-2 text-muted-foreground">{p.issues}</span>;
      default:
        return <span className="line-clamp-2 text-muted-foreground">{p.progress_notes || p.issues || "—"}</span>;
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex gap-1 overflow-x-auto border-b bg-muted/30 p-1.5 [scrollbar-width:none]" role="tablist">
        {TABS.map((t) => {
          const n = attention[t.key].length;
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${on ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className={`h-3.5 w-3.5 ${n ? t.tone : ""}`} />
              {t.label}
              <span className={`rounded-full px-1.5 tabular-nums ${n ? "bg-muted text-foreground" : "text-muted-foreground"}`}>{n}</span>
            </button>
          );
        })}
      </div>
      {list.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{current.empty}</p>
      ) : (
        <ul className="max-h-80 divide-y overflow-y-auto">
          {list.map((p) => (
            <li key={p.id}>
              <Link to="/app/projects/$id" params={{ id: p.id }} className="grid gap-1 px-5 py-2.5 text-sm transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="truncate">{vName(p.vertical_id)}</span><StatusBadge s={p.status} /></div>
                </div>
                <div className="text-xs sm:text-right">{fact(p)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const trendConfig = {
  started: { label: "Projects started", color: "var(--ongoing)" },
  participants: { label: "Participants trained", color: "var(--spent)" },
} satisfies ChartConfig;

/**
 * Two small charts on the same month axis: projects started, and participants trained.
 * Two measures of different scale get a chart each - never one chart with two y-axes.
 */
export function TrendChart({ projects, range }: { projects: Project[]; range?: { from: string; to: string } }) {
  const data = monthlyTrend(projects, range).map((d) => ({ ...d, label: monthLabel(d.month) }));
  if (data.length === 0) return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No projects started in this period.</div>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MonthBars data={data} dataKey="started" title="Projects started" />
      <MonthBars data={data} dataKey="participants" title="Participants trained" />
    </div>
  );
}

function MonthBars({ data, dataKey, title }: { data: { label: string; started: number; participants: number }[]; dataKey: "started" | "participants"; title: string }) {
  const total = data.reduce((a, d) => a + d[dataKey], 0);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: trendConfig[dataKey].color }} />
          {title}
        </span>
        <span className="tabular-nums text-muted-foreground">{total.toLocaleString("en-IN")} in total</span>
      </div>
      <ChartContainer config={trendConfig} className="aspect-auto h-52 w-full">
        <BarChart data={data} margin={{ left: 0, right: 4, top: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--input)" }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function TopProjects({ projects, verticals, n = 5 }: { projects: Project[]; verticals: Vertical[]; n?: number }) {
  const top = [...projects].filter((p) => Number(p.total_cost) > 0).sort((a, b) => Number(b.total_cost) - Number(a.total_cost)).slice(0, n);
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  if (top.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No project costs recorded in this view.</p>;
  return (
    <ol className="space-y-3">
      {top.map((p, i) => (
        <li key={p.id}>
          <Link to="/app/projects/$id" params={{ id: p.id }} className="group block">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium group-hover:text-primary group-hover:underline">{p.name}</span>
              <span className="shrink-0 font-semibold tabular-nums" title={inr(p.total_cost)}>{inrCompact(Number(p.total_cost), 2)}</span>
            </div>
            <div className="ml-6 mt-1 flex items-center gap-2">
              <FundsBar received={Number(p.amount_received)} pending={yetToReceive(p)} className="h-1.5" />
              <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">{pct(Number(p.amount_received), Number(p.total_cost))}% received</span>
            </div>
            <div className="ml-6 text-[11px] text-muted-foreground">{vName(p.vertical_id)}</div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function RecentActivity({ projects, verticals, n = 6 }: { projects: Project[]; verticals: Vertical[]; n?: number }) {
  const recent = [...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, n);
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  if (recent.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No activity in this view.</p>;
  return (
    <ul className="space-y-3">
      {recent.map((p) => (
        <li key={p.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: verticalStyle({ id: p.vertical_id, name: vName(p.vertical_id) }, verticals).color }} />
          <div className="min-w-0 text-sm">
            <Link to="/app/projects/$id" params={{ id: p.id }} className="block truncate font-medium hover:text-primary hover:underline">{p.name}</Link>
            <div className="text-xs text-muted-foreground">
              {ago(p.updated_at)}{p.updated_by_name ? ` · ${p.updated_by_name}` : ""} · {vName(p.vertical_id)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "3 days ago" style, falling back to the date after a month. */
function ago(isoTime: string) {
  const days = Math.floor((Date.now() - new Date(isoTime).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return fmtDate(isoTime);
}

export function Panel({ id, title, hint, action, className = "", children }: { id?: string; title: string; hint?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-32 rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-base font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Ranked rows with a share bar: used for clients and partner vendors. */
function RankedList({ rows, empty, onSelect }: { rows: { key: string; label: string; sub: string; value: number; display: string }[]; empty: string; onSelect?: ((key: string) => void) | undefined }) {
  if (rows.length === 0) return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <button type="button" disabled={!onSelect} onClick={() => onSelect?.(r.key)} className="block w-full rounded-md px-1 py-0.5 text-left enabled:hover:bg-muted">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">{r.display}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} /></div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{r.sub}</div>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Clients by total project cost, with project counts. Clicking one filters the dashboard. */
export function ClientsPanel({ projects, onSelect, n = 6 }: { projects: Project[]; onSelect?: (client: string) => void; n?: number }) {
  const rows = distinctClients(projects)
    .map((name) => {
      const ps = projects.filter((p) => clientKey(p.client_name) === clientKey(name));
      const cost = ps.reduce((a, p) => a + Number(p.total_cost), 0);
      return { key: name, label: name, value: cost || ps.length, display: cost ? inrCompact(cost, 2) : `${ps.length}`, sub: `${ps.length} project${ps.length === 1 ? "" : "s"}${cost ? "" : " · no cost recorded"}` };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
  const missing = projects.filter((p) => !p.client_name?.trim()).length;
  return (
    <>
      <RankedList rows={rows} empty="No client recorded yet. Add it under Client / Department when editing a project." onSelect={onSelect} />
      {missing > 0 && rows.length > 0 && <p className="mt-3 text-[11px] text-muted-foreground">{missing} project{missing === 1 ? " has" : "s have"} no client recorded.</p>}
    </>
  );
}

/** Partner vendors by number of projects, with the total work order value where given. */
export function VendorsPanel({ projects, n = 6 }: { projects: Project[]; n?: number }) {
  const m = new Map<string, { label: string; projects: Set<string>; amount: number }>();
  for (const p of projects)
    for (const v of p.partner_vendors ?? []) {
      const k = clientKey(v.name);
      const row = m.get(k) ?? { label: v.name.trim(), projects: new Set<string>(), amount: 0 };
      row.projects.add(p.id);
      row.amount += v.amount ?? 0;
      m.set(k, row);
    }
  const rows = [...m.entries()]
    .map(([key, r]) => ({ key, label: r.label, value: r.projects.size, display: `${r.projects.size}`, sub: `${r.projects.size} project${r.projects.size === 1 ? "" : "s"}${r.amount ? ` · work orders ${inrCompact(r.amount, 2)}` : ""}` }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, n);
  return <RankedList rows={rows} empty="No partner vendors recorded yet. Add them in the Financials step when editing a project." />;
}
