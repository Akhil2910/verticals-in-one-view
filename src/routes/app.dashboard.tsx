import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ProjectsTable, Stats } from "@/components/projects";
import { inr, projectsQuery, verticalsQuery, yetToReceive } from "@/lib/data";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · NIUM Project Records" }] }),
  beforeLoad: ({ context }) => {
    if (context.me.role === "vertical_head") throw redirect({ to: "/app/vertical" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: Dashboard,
});

function Dashboard() {
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">All verticals</h1>
        <p className="text-muted-foreground">Overview of every project and programme across NIUM.</p>
      </div>
      <Stats projects={projects} />
      <section>
        <h2 className="mb-3 text-xl font-semibold">By vertical</h2>
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Vertical</th><th className="px-3 py-2 text-right">Projects</th><th className="px-3 py-2 text-right">Ongoing</th><th className="px-3 py-2 text-right">Completed</th><th className="px-3 py-2 text-right">Sanctioned</th><th className="px-3 py-2 text-right">Received</th><th className="px-3 py-2 text-right">Yet to receive</th></tr>
            </thead>
            <tbody>
              {verticals.map((v) => {
                const ps = projects.filter((p) => p.vertical_id === v.id);
                return (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{v.name}</td>
                    <td className="px-3 py-2 text-right">{ps.length}</td>
                    <td className="px-3 py-2 text-right">{ps.filter((p) => p.status === "Ongoing").length}</td>
                    <td className="px-3 py-2 text-right">{ps.filter((p) => p.status === "Completed").length}</td>
                    <td className="px-3 py-2 text-right">{inr(ps.reduce((a, p) => a + Number(p.total_cost), 0))}</td>
                    <td className="px-3 py-2 text-right">{inr(ps.reduce((a, p) => a + Number(p.amount_received), 0))}</td>
                    <td className="px-3 py-2 text-right">{inr(ps.reduce((a, p) => a + yetToReceive(p), 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">All projects</h2>
        <ProjectsTable projects={projects} verticals={verticals} />
      </section>
    </div>
  );
}
