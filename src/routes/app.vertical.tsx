import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { PageHeader, ProjectsTable, SectionTitle, Stats } from "@/components/projects";
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
      <PageHeader eyebrow="My vertical" title={vName} description="Projects and programmes you record for this vertical.">
        <DateRangeFilter from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        {me.verticalId && <Button asChild className="h-10"><Link to="/app/projects/new"><Plus className="h-4 w-4" />Add project</Link></Button>}
      </PageHeader>
      <Stats projects={mine} />
      <section className="space-y-3">
        <SectionTitle title="Projects" hint="Click a row to view or edit it." />
        <ProjectsTable projects={mine} verticals={verticals} showVertical={false} />
      </section>
    </div>
  );
}
