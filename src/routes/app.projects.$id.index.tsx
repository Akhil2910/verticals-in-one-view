import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProjectDetail } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { projectQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/$id/")({
  head: () => ({ meta: [{ title: "Project · NIUM Project Records" }] }),
  loader: ({ context, params }) =>
    Promise.all([context.queryClient.ensureQueryData(projectQuery(params.id)), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: ViewProject,
});

function ViewProject() {
  const { id } = Route.useParams();
  const { me } = Route.useRouteContext();
  const { data: p } = useSuspenseQuery(projectQuery(id));
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = me.role === "admin" || (me.role === "vertical_head" && me.verticalId === p.vertical_id);

  async function remove() {
    if (!confirm("Delete this project permanently?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Deleted");
    navigate({ to: me.role === "vertical_head" ? "/app/vertical" : "/app/dashboard" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print / PDF</Button>
          {canEdit && <Button asChild><Link to="/app/projects/$id/edit" params={{ id }}>Edit</Link></Button>}
          {canEdit && <Button variant="destructive" onClick={remove}>Delete</Button>}
        </div>
      </div>
      <ProjectDetail p={p} verticalName={verticals.find((v) => v.id === p.vertical_id)?.name ?? "—"} />
    </div>
  );
}
