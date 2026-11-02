import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useState } from "react";
import { ProjectsTable, Stats } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { inDateRange, projectsQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/vertical")({
  head: () => ({ meta: [{ title: "My Projects · NIUM Project Records" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: MyVertical,
});

function MyVertical() {
  const { me } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const [range, setRange] = useState({ from: "", to: "" });
  const mine = projects.filter((p) => p.vertical_id === me.verticalId && inDateRange(p, range.from, range.to));
  const vName = verticals.find((v) => v.id === me.verticalId)?.name ?? "No vertical assigned";
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent">Vertical</div>
          <h1 className="text-3xl font-bold">{vName}</h1>
        </div>
        {me.verticalId && <Button asChild><Link to="/app/projects/new">+ Add project</Link></Button>}
      </div>
      <DateRangeFilter from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
      <Stats projects={mine} />
      <ProjectsTable projects={mine} verticals={verticals} showVertical={false} />
    </div>
  );
}
