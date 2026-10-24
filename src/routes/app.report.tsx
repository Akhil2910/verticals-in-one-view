import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProjectDetail, Stats } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { projectsQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/report")({
  head: () => ({ meta: [{ title: "Report · NIUM Project Records" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: Report,
});

function Report() {
  const { me } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const [vert, setVert] = useState(me.role === "vertical_head" ? (me.verticalId ?? "") : "");
  const [status, setStatus] = useState("");
  const list = projects.filter((p) => (!vert || p.vertical_id === vert) && (!status || p.status === status));
  const vName = (id: string) => verticals.find((v) => v.id === id)?.name ?? "—";
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        {me.role !== "vertical_head" && (
          <select className={sel} value={vert} onChange={(e) => setVert(e.target.value)}>
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Ongoing</option><option>Completed</option><option>On hold</option>
        </select>
        <Button className="ml-auto" onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <div className="border-b pb-4 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">National Institute of Urban Management (NIUM)</div>
        <h1 className="text-2xl font-bold">Project / Programme Status Report</h1>
        <div className="text-sm text-muted-foreground">
          {vert ? vName(vert) : "All verticals"}{status ? ` · ${status}` : ""} · Generated {new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
      <Stats projects={list} />
      <div className="space-y-6">
        {list.map((p) => <ProjectDetail key={p.id} p={p} verticalName={vName(p.vertical_id)} />)}
        {list.length === 0 && <p className="text-center text-muted-foreground">No projects match.</p>}
      </div>
    </div>
  );
}
