import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LayoutDashboard, Plus } from "lucide-react";
import { PageHeader, ProjectsTable } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { projectsQuery, verticalsQuery } from "@/lib/data";
import { distinctClients } from "@/lib/insights";

// The full project list for officials and admins; the dashboard itself shows analytics only.
export const Route = createFileRoute("/app/projects/")({
  head: () => ({ meta: [{ title: "All projects · Program Monitoring Center" }] }),
  beforeLoad: ({ context }) => {
    if (context.me.role === "vertical_head") throw redirect({ to: "/app/vertical" });
  },
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: AllProjects,
});

function AllProjects() {
  const { me } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="All verticals" title="All projects" description={`${projects.length} projects and programmes. Search, filter and sort; open one for its full record.`}>
        <Button asChild variant="outline" className="h-9"><Link to="/app/dashboard"><LayoutDashboard className="h-4 w-4" />Dashboard</Link></Button>
        {me.role === "admin" && <Button asChild className="h-9"><Link to="/app/projects/new"><Plus className="h-4 w-4" />Add project</Link></Button>}
      </PageHeader>
      <ProjectsTable projects={projects} verticals={verticals} clients={distinctClients(projects)} />
    </div>
  );
}
