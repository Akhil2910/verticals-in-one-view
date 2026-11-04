import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer } from "lucide-react";
import { ProjectDetail, STATUSES, StatusBadge } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { inr, pct, progressNotApplicable, projectsQuery, totals, verticalsQuery, yetToReceive, type Project } from "@/lib/data";

export const Route = createFileRoute("/app/report")({
  head: () => ({ meta: [{ title: "Report · Program Monitoring Center" }] }),
  // The dashboard's "Report for this view" passes its vertical and status along.
  validateSearch: (search: Record<string, unknown>): { v?: string | undefined; status?: string | undefined } => ({
    v: typeof search["v"] === "string" ? search["v"] : undefined,
    status: typeof search["status"] === "string" ? search["status"] : undefined,
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: Report,
});

const CIRCULAR = "Roc. No.1078023/NIUM/2026/IT";
const sel = "h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm";
const th = "border-b-2 border-foreground/70 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide";
const td = "border-b px-2 py-1.5 align-top";

function Report() {
  const { me } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const search = Route.useSearch();
  const [vert, setVert] = useState(me.role === "vertical_head" ? (me.verticalId ?? "") : (search.v ?? ""));
  const [status, setStatus] = useState(search.status ?? "");
  const [details, setDetails] = useState(true);
  const list = projects.filter((p) => (!vert || p.vertical_id === vert) && (!status || p.status === status));
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  const t = totals(list);
  const generated = new Date();

  return (
    <div className="space-y-6">
      {/* Controls (not printed) */}
      <div className="no-print sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <h1 className="mr-2 text-xl font-semibold">Report</h1>
        {me.role !== "vertical_head" && (
          <select className={sel} value={vert} onChange={(e) => setVert(e.target.value)} aria-label="Vertical">
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} className="h-4 w-4 accent-primary" />
          Full details of each project
        </label>
        <Button className="ml-auto" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</Button>
      </div>

      {/* The document itself: a sheet on screen, plain A4 pages on paper */}
      <div className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[13px] text-foreground shadow-md ring-1 ring-border print:max-w-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-4">
          <img src="/nium-logo.png" alt="National Institute of Urban Management" width={433} height={116} className="h-auto w-52" />
          <div className="text-right">
            <h2 className="font-serif text-xl font-bold leading-tight text-primary">Project / Programme Status Report</h2>
            <div className="mt-1 text-xs text-muted-foreground">As per Circular {CIRCULAR}</div>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-b py-3 text-xs sm:grid-cols-4">
          <Meta k="Vertical" v={vert ? vName(vert) : "All verticals"} />
          <Meta k="Status" v={status || "All"} />
          <Meta k="Generated" v={generated.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
          <Meta k="Prepared by" v={me.name} />
        </dl>

        <Section n={1} title="Summary">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
            <Figure k="Projects / programmes" v={String(t.count)} sub={`${t.ongoing} ongoing · ${t.completed} completed · ${t.onHold} on hold`} />
            <Figure k="Total project cost" v={inr(t.cost)} />
            <Figure k="Amount received" v={inr(t.received)} sub={`${pct(t.received, t.cost)}% of total cost`} />
            <Figure k="Yet to be received" v={inr(t.pending)} sub={`Expenditure ${inr(t.expenditure)}`} />
          </div>
        </Section>

        {!vert && (
          <Section n={2} title="Vertical-wise position">
            <table className="w-full border-collapse tabular-nums">
              <thead>
                <tr>
                  <th className={th}>Vertical</th>
                  <th className={`${th} text-right`}>Projects</th>
                  <th className={`${th} text-right`}>Ongoing</th>
                  <th className={`${th} text-right`}>Completed</th>
                  <th className={`${th} text-right`}>On hold</th>
                  <th className={`${th} text-right`}>Total cost (₹)</th>
                  <th className={`${th} text-right`}>Received (₹)</th>
                  <th className={`${th} text-right`}>Yet to receive (₹)</th>
                </tr>
              </thead>
              <tbody>
                {verticals.map((v) => {
                  const vt = totals(list.filter((p) => p.vertical_id === v.id));
                  return (
                    <tr key={v.id} className={vt.count ? "" : "text-muted-foreground"}>
                      <td className={td}>{v.name}</td>
                      <td className={`${td} text-right`}>{vt.count}</td>
                      <td className={`${td} text-right`}>{vt.ongoing}</td>
                      <td className={`${td} text-right`}>{vt.completed}</td>
                      <td className={`${td} text-right`}>{vt.onHold}</td>
                      <td className={`${td} text-right`}>{amount(vt.cost)}</td>
                      <td className={`${td} text-right`}>{amount(vt.received)}</td>
                      <td className={`${td} text-right`}>{amount(vt.pending)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="font-semibold">
                <tr className="border-t-2 border-foreground/70">
                  <td className="px-2 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right">{t.count}</td>
                  <td className="px-2 py-1.5 text-right">{t.ongoing}</td>
                  <td className="px-2 py-1.5 text-right">{t.completed}</td>
                  <td className="px-2 py-1.5 text-right">{t.onHold}</td>
                  <td className="px-2 py-1.5 text-right">{amount(t.cost)}</td>
                  <td className="px-2 py-1.5 text-right">{amount(t.received)}</td>
                  <td className="px-2 py-1.5 text-right">{amount(t.pending)}</td>
                </tr>
              </tfoot>
            </table>
          </Section>
        )}

        <Section n={vert ? 2 : 3} title="List of projects / programmes">
          {list.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No projects match the selected filters.</p>
          ) : (
            <table className="w-full border-collapse tabular-nums">
              <thead>
                <tr>
                  <th className={`${th} w-8`}>#</th>
                  <th className={th}>Project / Programme</th>
                  <th className={th}>Client</th>
                  {!vert && <th className={th}>Vertical</th>}
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Progress</th>
                  <th className={`${th} text-right`}>Total cost (₹)</th>
                  <th className={`${th} text-right`}>Yet to receive (₹)</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr key={p.id} className="break-inside-avoid">
                    <td className={`${td} text-muted-foreground`}>{i + 1}</td>
                    <td className={td}>
                      <div className="font-medium">{p.name}</div>
                      {p.project_head && <div className="text-xs text-muted-foreground">{p.project_head}</div>}
                    </td>
                    <td className={td}>{p.client_name ?? "—"}</td>
                    {!vert && <td className={td}>{vName(p.vertical_id)}</td>}
                    <td className={td}><StatusBadge s={p.status} /></td>
                    <td className={`${td} text-right`}>{progressLabel(p, vName(p.vertical_id))}</td>
                    <td className={`${td} text-right`}>{amount(Number(p.total_cost))}</td>
                    <td className={`${td} text-right`}>{amount(yetToReceive(p))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {details && list.length > 0 && (
          <Section n={vert ? 3 : 4} title="Details of each project / programme" pageBreak>
            <div className="space-y-5">
              {list.map((p, i) => (
                <ProjectDetail
                  key={p.id}
                  p={p}
                  verticalName={vName(p.vertical_id)}
                  heading={
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-serif text-base font-semibold">{vert ? 3 : 4}.{i + 1} {p.name}</h4>
                      <span className="text-xs text-muted-foreground">{vName(p.vertical_id)}</span>
                    </div>
                  }
                />
              ))}
            </div>
          </Section>
        )}

        <footer className="mt-8 flex justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span>National Institute of Urban Management · Program Monitoring Center</span>
          <span>Generated {generated.toLocaleDateString("en-IN")}</span>
        </footer>
      </div>
    </div>
  );
}

/** Rupee figures in tables: Indian digit grouping, no symbol (the column header carries ₹). */
const amount = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

const progressLabel = (p: Project, verticalName: string) => (progressNotApplicable(p, verticalName) ? "N/A" : `${Number(p.physical_progress)}%`);

function Section({ n, title, pageBreak, children }: { n: number; title: string; pageBreak?: boolean; children: React.ReactNode }) {
  return (
    <section className={`mt-6 ${pageBreak ? "print:break-before-page" : ""}`}>
      <h3 className="mb-2 font-serif text-base font-semibold text-primary">{n}. {title}</h3>
      {children}
    </section>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Figure({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-1 font-serif text-lg font-semibold tabular-nums text-primary">{v}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
