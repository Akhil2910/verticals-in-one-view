import { useEffect, useState } from "react";
import { Building, CalendarRange, Layers, Search, SlidersHorizontal, X } from "lucide-react";
import { activeFilterCount, period, PRESETS, type DashboardFilters, type Preset } from "@/lib/filters";
import type { Project, Vertical } from "@/lib/data";
import { STATUSES } from "./projects";

const selectCls = "h-9 rounded-md border border-input bg-card pl-8 pr-2 text-sm shadow-sm";
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const NONE = { p: undefined, fy: undefined, from: undefined, to: undefined };

/**
 * One row of filters that drive the whole dashboard. `counts` are the projects matching
 * every filter except status, so each status button shows what it would select.
 */
export function FilterBar({
  filters,
  verticals,
  clients,
  years,
  counts,
  onChange,
}: {
  filters: DashboardFilters;
  verticals: Vertical[];
  clients: string[];
  years: string[];
  counts: Project[];
  onChange: (patch: Partial<DashboardFilters>) => void;
}) {
  // Search updates the URL after a short pause rather than on every keystroke.
  const [q, setQ] = useState(filters.q ?? "");
  useEffect(() => setQ(filters.q ?? ""), [filters.q]);
  useEffect(() => {
    const t = setTimeout(() => (q.trim() || undefined) !== filters.q && onChange({ q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodValue = filters.p ? `p:${filters.p}` : filters.fy ? `fy:${filters.fy}` : filters.from || filters.to ? "custom" : "";
  const [custom, setCustom] = useState(periodValue === "custom");
  const range = period(filters);
  const active = activeFilterCount(filters);

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, clients, vendors…" className={`${selectCls} w-full`} aria-label="Search projects" />
        </div>

        <Picker icon={CalendarRange} label="Period">
          <select
            className={`${selectCls} ${periodValue ? "border-brand/60 font-medium" : ""}`}
            aria-label="Period"
            value={custom ? "custom" : periodValue}
            onChange={(e) => {
              const val = e.target.value;
              setCustom(val === "custom");
              if (val.startsWith("p:")) onChange({ ...NONE, p: val.slice(2) as Preset });
              else if (val.startsWith("fy:")) onChange({ ...NONE, fy: val.slice(3) });
              else if (val === "") onChange(NONE);
              else onChange({ p: undefined, fy: undefined });
            }}
          >
            <option value="">All time</option>
            <optgroup label="Recent">
              {(Object.keys(PRESETS) as Preset[]).map((p) => <option key={p} value={`p:${p}`}>{PRESETS[p]}</option>)}
            </optgroup>
            <optgroup label="Financial year (Apr–Mar)">
              {years.map((y) => <option key={y} value={`fy:${y}`}>FY {y}</option>)}
            </optgroup>
            <option value="custom">Custom dates…</option>
          </select>
        </Picker>

        {custom ? (
          <div className="flex items-center gap-1 rounded-md border bg-card px-2 shadow-sm">
            <input type="date" aria-label="From" className="h-8 bg-transparent text-sm focus:outline-none" value={filters.from ?? ""} max={filters.to} onChange={(e) => onChange({ from: e.target.value || undefined })} />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" aria-label="To" className="h-8 bg-transparent text-sm focus:outline-none" value={filters.to ?? ""} min={filters.from} onChange={(e) => onChange({ to: e.target.value || undefined })} />
          </div>
        ) : (
          range.from && <span className="rounded-md bg-brand/10 px-2 py-1 text-xs font-medium text-brand">{fmt(range.from)} – {fmt(range.to)}</span>
        )}

        <Picker icon={Layers} label="Vertical">
          <select className={selectCls} value={filters.v ?? ""} onChange={(e) => onChange({ v: e.target.value || undefined })} aria-label="Vertical">
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Picker>

        <Picker icon={Building} label="Client">
          <select className={selectCls} value={filters.c ?? ""} onChange={(e) => onChange({ c: e.target.value || undefined })} aria-label="Client" disabled={clients.length === 0} title={clients.length ? undefined : "No clients recorded yet"}>
            <option value="">{clients.length ? "All clients" : "No clients yet"}</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Picker>

        {active > 0 && (
          <button
            type="button"
            onClick={() => { setQ(""); setCustom(false); onChange({ ...NONE, v: undefined, status: undefined, c: undefined, q: undefined }); }}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />Clear {active} filter{active === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
        <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        <StatusChip label="All statuses" n={counts.length} active={!filters.status} onClick={() => onChange({ status: undefined })} />
        {STATUSES.map((s) => (
          <StatusChip key={s} label={s} n={counts.filter((p) => p.status === s).length} active={filters.status === s} onClick={() => onChange({ status: filters.status === s ? undefined : s })} />
        ))}
      </div>
    </div>
  );
}

/** A select with a small leading icon. */
function Picker({ icon: Icon, label, children }: { icon: typeof Layers; label: string; children: React.ReactNode }) {
  return (
    <div className="relative" title={label}>
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {children}
    </div>
  );
}

function StatusChip({ label, n, active, onClick }: { label: string; n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:border-primary/40"}`}
    >
      {label}
      <span className={`tabular-nums ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{n}</span>
    </button>
  );
}
