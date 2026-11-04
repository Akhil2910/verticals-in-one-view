import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, LayoutDashboard, Plus } from "lucide-react";
import { AttentionPanel, Panel, RecentActivity, TrendChart } from "@/components/insights";
import { PortfolioDonuts } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { attention } from "@/lib/insights";
import { DateRangeFilter } from "@/components/date-range-filter";
import { PageHeader, ProjectsTable, SectionTitle, Stats } from "@/components/projects";
import { inDateRange, projectsQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/verticals/$id")({
  head: () => ({ meta: [{ title: "Vertical projects · Program Monitoring Center" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: VerticalProjects,
});

function VerticalProjects() {
  const { id } = Route.useParams();
  const { me } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const [range, setRange] = useState({ from: "", to: "" });
  const list = projects.filter((p) => p.vertical_id === id && inDateRange(p, range.from, range.to));
  const name = verticals.find((v) => v.id === id)?.name ?? "Vertical";
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/app/dashboard" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />Dashboard
        </Link>
        <PageHeader eyebrow="Vertical" title={name} description={`${list.length} project${list.length === 1 ? "" : "s"} in this view.`}>
          <DateRangeFilter from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
          <Button asChild variant="outline" className="h-10"><Link to="/app/dashboard" search={{ v: id }}><LayoutDashboard className="h-4 w-4" />On dashboard</Link></Button>
          {me.role === "admin" && <Button asChild className="h-10"><Link to="/app/projects/new" search={{ v: id }}><Plus className="h-4 w-4" />Add project</Link></Button>}
        </PageHeader>
      </div>
      <Stats projects={list} />
      <PortfolioDonuts projects={list} verticals={verticals.filter((v) => v.id === id)} styleFrom={verticals} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <SectionTitle title="Needs attention" />
          <AttentionPanel attention={attention(list)} verticals={verticals} />
        </div>
        <Panel title="Recent updates"><RecentActivity projects={list} verticals={verticals} /></Panel>
      </div>
      <Panel title="Activity by month" hint="By month of commencement.">
        <TrendChart projects={list} />
      </Panel>
      <section className="space-y-3">
        <SectionTitle title="Projects" hint="Click a row for the full record." />
        <ProjectsTable projects={list} verticals={verticals} showVertical={false} />
      </section>
    </div>
  );
}
