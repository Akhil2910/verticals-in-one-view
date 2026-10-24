import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fmtDate, inr, yetToReceive, type Project, type Vertical } from "@/lib/data";

export const STATUSES = ["Ongoing", "Completed", "On hold"] as const;

export function StatusBadge({ s }: { s: string }) {
  const v = s === "Completed" ? "default" : s === "On hold" ? "destructive" : "secondary";
  return <Badge variant={v as "default"}>{s}</Badge>;
}

export function Stats({ projects }: { projects: Project[] }) {
  const t = projects.reduce(
    (a, p) => ({
      cost: a.cost + Number(p.total_cost),
      rec: a.rec + Number(p.amount_received),
      pend: a.pend + yetToReceive(p),
      exp: a.exp + Number(p.expenditure),
    }),
    { cost: 0, rec: 0, pend: 0, exp: 0 },
  );
  const items = [
    ["Projects", String(projects.length)],
    ["Ongoing", String(projects.filter((p) => p.status === "Ongoing").length)],
    ["Completed", String(projects.filter((p) => p.status === "Completed").length)],
    ["Sanctioned", inr(t.cost)],
    ["Received", inr(t.rec)],
    ["Yet to receive", inr(t.pend)],
    ["Expenditure", inr(t.exp)],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-md border bg-card p-4 print-break">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
          <div className="mt-1 font-serif text-xl font-semibold">{v}</div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsTable({
  projects,
  verticals,
  showVertical = true,
}: {
  projects: Project[];
  verticals: Vertical[];
  showVertical?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vert, setVert] = useState("");
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  const rows = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!q || `${p.name} ${p.project_head ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
          (!status || p.status === status) &&
          (!vert || p.vertical_id === vert),
      ),
    [projects, q, status, vert],
  );
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap gap-2">
        <Input placeholder="Search project or head…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {showVertical && (
          <select className={sel} value={vert} onChange={(e) => setVert(e.target.value)}>
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Project / Programme</th>
              {showVertical && <th className="px-3 py-2">Vertical</th>}
              <th className="px-3 py-2">Head</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 w-36">Progress</th>
              <th className="px-3 py-2 text-right">Sanctioned</th>
              <th className="px-3 py-2 text-right">Yet to receive</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No projects yet.</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/50">
                <td className="px-3 py-2 font-medium">
                  <Link to="/app/projects/$id" params={{ id: p.id }} className="text-primary hover:underline">{p.name}</Link>
                </td>
                {showVertical && <td className="px-3 py-2">{vName(p.vertical_id)}</td>}
                <td className="px-3 py-2">{p.project_head ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge s={p.status} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2"><Progress value={Number(p.physical_progress)} className="h-2" /><span className="text-xs">{Number(p.physical_progress)}%</span></div>
                </td>
                <td className="px-3 py-2 text-right">{inr(p.total_cost)}</td>
                <td className="px-3 py-2 text-right">{inr(yetToReceive(p))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(p.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProjectDetail({ p, verticalName }: { p: Project; verticalName: string }) {
  const rows: [string, React.ReactNode][] = [
    ["1. Name of the Project / Programme", p.name],
    ["2. Name of the Vertical", verticalName],
    ["3. Project Head / Team Members", <>{p.project_head ?? "—"}{p.team_members ? <div className="text-muted-foreground">{p.team_members}</div> : null}</>],
    ["4. Commencement / Proposed or completed date", `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}`],
    ["5. Current status / progress", <><StatusBadge s={p.status} />{p.progress_notes ? <div className="mt-1 whitespace-pre-wrap">{p.progress_notes}</div> : null}</>],
    ["6. Physical work completed", `${Number(p.physical_progress)}%`],
    ["7. Key activities / milestones completed", p.milestones_completed],
    ["8. Activities / milestones pending", p.milestones_pending],
    ["9. Total Project Cost / Sanctioned Amount", inr(p.total_cost)],
    ["10. Amount received", inr(p.amount_received)],
    ["11. Amount yet to be received", inr(yetToReceive(p))],
    ["12. Expenditure incurred", inr(p.expenditure)],
    ["13. Amount receivable", inr(p.amount_receivable)],
    ["14. Expected date of completion", fmtDate(p.expected_completion)],
    ["15. Major issues / constraints / pending matters", p.issues],
    ["16. Any other relevant information", p.other_info],
  ];
  return (
    <div className="print-break overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t first:border-t-0">
              <th className="w-1/3 bg-muted/60 px-4 py-2 text-left align-top font-medium">{k}</th>
              <td className="px-4 py-2 align-top whitespace-pre-wrap">{v || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        Last updated {new Date(p.updated_at).toLocaleString("en-IN")} {p.updated_by_name ? `by ${p.updated_by_name}` : ""}
      </div>
    </div>
  );
}
