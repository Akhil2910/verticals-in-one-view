import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ProjectsTable, Stats } from "@/components/projects";
import { projectsQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/verticals/$id")({
  head: () => ({ meta: [{ title: "Vertical projects · NIUM Project Records" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: VerticalProjects,
});

function VerticalProjects() {
  const { id } = Route.useParams();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const list = projects.filter((p) => p.vertical_id === id);
  const name = verticals.find((v) => v.id === id)?.name ?? "Vertical";
  return (
    <div className="space-y-8">
      <div>
        <Link to="/app/dashboard" className="text-sm text-primary hover:underline">← Back to dashboard</Link>
        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-accent">Vertical</div>
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="text-muted-foreground">{list.length} project{list.length === 1 ? "" : "s"}. Click any project to see full details.</p>
      </div>
      <Stats projects={list} />
      <ProjectsTable projects={list} verticals={verticals} showVertical={false} />
    </div>
  );
}
