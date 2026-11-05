// Analytics panels for the dashboard: delivery health, receivables ageing, year on year and
// data completeness. Figures come from the pure functions in lib/insights.ts.
import { Link } from "@tanstack/react-router";
import { inrCompact, pct, progressNotApplicable, type Project, type Vertical } from "@/lib/data";
import { byFinancialYear, completeness, COMPLETENESS_FIELDS, deliveryHealth, receivablesAgeing, type Health } from "@/lib/insights";

const empty = (text: string) => <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;

// Schedule groups, checked with the dataviz validator in this order (red↔orange failed, so
// "due soon" is violet). Identity is also carried by the label and count beside each colour.
const HEALTH: { key: Health; label: string; hint: string; color: string }[] = [
  { key: "onTrack", label: "On track", hint: "due in more than 60 days", color: "var(--completed)" },
  { key: "dueSoon", label: "Due soon", hint: "within 60 days", color: "#6250d6" },
  { key: "overdue", label: "Overdue", hint: "past the due date", color: "#e34948" },
  { key: "noDate", label: "No due date", hint: "end date not recorded", color: "#b7c0cc" },
];

/** Ongoing projects by schedule, and the ones whose progress trails the time already used. */
export function DeliveryHealth({ projects, verticals }: { projects: Project[]; verticals: Vertical[] }) {
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "";
  const { groups, behind } = deliveryHealth(projects, (p) => !progressNotApplicable(p, vName(p.vertical_id)));
  const total = HEALTH.reduce((a, h) => a + groups[h.key].length, 0);
  if (!total) return empty("No ongoing projects in this view.");
  return (
    <div className="space-y-5">
      <div>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={HEALTH.map((h) => `${h.label} ${groups[h.key].length}`).join(", ")}>
          {HEALTH.filter((h) => groups[h.key].length).map((h) => (
            <div key={h.key} style={{ width: `${(groups[h.key].length / total) * 100}%`, background: h.color }} title={`${h.label}: ${groups[h.key].length}`} />
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HEALTH.map((h) => (
            <div key={h.key}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: h.color }} />{h.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{groups[h.key].length}</dd>
              <dd className="text-[11px] text-muted-foreground">{h.hint}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold">Behind schedule <span className="font-normal text-muted-foreground">({behind.length})</span></h4>
          <span className="text-[11px] text-muted-foreground">progress vs. share of time used</span>
        </div>
        {behind.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ongoing project is more than 10 points behind its timeline.</p>
        ) : (
          <ul className="space-y-2.5">
            {behind.slice(0, 5).map(({ p, progress, expected }) => (
              <li key={p.id}>
                <Link to="/app/projects/$id" params={{ id: p.id }} className="block rounded-md px-1 py-0.5 hover:bg-muted">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{progress}% done · {expected}% of time used</span>
                  </div>
                  {/* Bar = progress; the tick marks where progress would be if on schedule. */}
                  <div className="relative mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-ongoing" style={{ width: `${Math.max(2, progress)}%` }} />
                    <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground" style={{ left: `calc(${expected}% - 1px)` }} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{vName(p.vertical_id)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Older money is darker: one blue ramp, light → dark (dataviz sequential steps 250 → 700).
const AGE_COLORS = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];

/** Money still due on completed work, by how long ago the work was completed. */
export function ReceivablesAgeing({ projects }: { projects: Project[] }) {
  const { bands, undated } = receivablesAgeing(projects);
  const total = bands.reduce((a, b) => a + b.amount, 0) + undated.amount;
  if (!total) return empty("Nothing is due on completed projects in this view.");
  const max = Math.max(...bands.map((b) => b.amount), 1);
  const count = bands.reduce((a, b) => a + b.projects.length, 0) + undated.projects.length;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold tabular-nums">{inrCompact(total, 2)}</div>
        <div className="text-xs text-muted-foreground">due on {count} completed project{count === 1 ? "" : "s"}</div>
      </div>
      <ul className="space-y-3">
        {bands.map((b, i) => (
          <li key={b.key}>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="flex flex-1 items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: AGE_COLORS[i] }} />{b.label}</span>
              <span className="font-semibold tabular-nums">{b.amount ? inrCompact(b.amount, 2) : "—"}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              {b.amount > 0 && <div className="h-full rounded-full" style={{ width: `${Math.max(3, (b.amount / max) * 100)}%`, background: AGE_COLORS[i] }} />}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {b.projects.length ? `${b.projects.length} project${b.projects.length === 1 ? "" : "s"} · ${pct(b.amount, total)}% of the total` : "None"}
            </div>
          </li>
        ))}
      </ul>
      {undated.amount > 0 && (
        <p className="text-[11px] text-muted-foreground">Plus {inrCompact(undated.amount, 2)} on {undated.projects.length} project{undated.projects.length === 1 ? "" : "s"} with no completion date.</p>
      )}
    </div>
  );
}

/** Projects started and their value per financial year, each measure with its own scale. */
export function YearOnYear({ projects }: { projects: Project[] }) {
  const rows = byFinancialYear(projects);
  if (!rows.length) return empty("No dated projects in this view.");
  const maxN = Math.max(...rows.map((r) => r.projects), 1);
  const maxCost = Math.max(...rows.map((r) => r.cost), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Financial year</th>
            <th className="pb-2 font-medium">Projects started</th>
            <th className="pb-2 font-medium">Total project cost</th>
            <th className="pb-2 text-right font-medium">Received</th>
            <th className="pb-2 text-right font-medium">Participants</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.fy}>
              <td className="py-2.5 pr-4 font-medium">FY {r.fy}</td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-ongoing" style={{ width: `${Math.max(3, (r.projects / maxN) * 100)}%` }} /></div>
                  <span className="w-8 text-right tabular-nums">{r.projects}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">{r.cost > 0 && <div className="h-full rounded-full bg-spent" style={{ width: `${Math.max(3, (r.cost / maxCost) * 100)}%` }} />}</div>
                  <span className="w-20 text-right tabular-nums">{r.cost ? inrCompact(r.cost, 2) : "—"}</span>
                </div>
              </td>
              <td className="py-2.5 text-right tabular-nums">{!r.cost ? "—" : r.received > 0 && pct(r.received, r.cost) === 0 ? "<1%" : `${pct(r.received, r.cost)}%`}</td>
              <td className="py-2.5 text-right tabular-nums">{r.participants ? r.participants.toLocaleString("en-IN") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cell shade by share filled: one blue ramp; dark cells switch to white text.
const shade = (v: number) => (v >= 90 ? ["#1c5cab", "#fff"] : v >= 70 ? ["#5598e7", "#fff"] : v >= 40 ? ["#b7d3f6", "#1b3561"] : v > 0 ? ["#e6effb", "#1b3561"] : ["#f4f6f9", "#5b6575"]);

/** How fully each vertical has filled in the details the analytics rely on. */
export function DataCompleteness({ projects, verticals }: { projects: Project[]; verticals: Vertical[] }) {
  const rows = completeness(projects, verticals);
  if (!rows.length) return empty("No projects in this view.");
  const overall = COMPLETENESS_FIELDS.map((f) => pct(projects.filter(f.has).length, projects.length));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="text-left font-medium">Vertical</th>
            {COMPLETENESS_FIELDS.map((f) => <th key={f.key} className="font-medium">{f.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.vertical.id}>
              <td className="pr-3 font-medium">
                <Link to="/app/verticals/$id" params={{ id: r.vertical.id }} className="hover:text-brand hover:underline">{r.vertical.name}</Link>
                <span className="ml-1 text-xs font-normal text-muted-foreground">({r.count})</span>
              </td>
              {r.fields.map((v, i) => {
                const [bg, fg] = shade(v);
                return <td key={i} className="rounded-md py-1.5 text-center text-xs font-semibold tabular-nums" style={{ background: bg, color: fg }}>{v}%</td>;
              })}
            </tr>
          ))}
          <tr>
            <td className="pr-3 pt-1 text-xs font-semibold text-muted-foreground">All projects</td>
            {overall.map((v, i) => <td key={i} className="pt-1 text-center text-xs font-semibold tabular-nums">{v}%</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
