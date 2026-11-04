import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteProject } from "@/lib/api.functions";
import { PageHeader, ProjectDetail, StatusBadge } from "@/components/projects";
import { ProjectAttachments } from "@/components/project-attachments";
import { ChevronRight, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/$id/")({
  head: () => ({ meta: [{ title: "Project · Program Monitoring Center" }] }),
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
  const vName = verticals.find((v) => v.id === p.vertical_id)?.name ?? "—";
  const canEdit = me.role === "admin" || (me.role === "vertical_head" && me.verticalId === p.vertical_id);

  async function remove() {
    if (!confirm("Delete this project permanently?")) return;
    try {
      await deleteProject({ data: { id } });
    } catch (err) { toast.error((err as Error).message); return; }
    await qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Deleted");
    navigate({ to: me.role === "vertical_head" ? "/app/vertical" : "/app/dashboard" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="no-print flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
        {me.role === "vertical_head" ? (
          <Link to="/app/vertical" className="hover:text-primary">My Projects</Link>
        ) : (
          <>
            <Link to="/app/dashboard" className="hover:text-primary">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/app/verticals/$id" params={{ id: p.vertical_id }} className="hover:text-primary">{vName}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="max-w-xs truncate text-foreground">{p.name}</span>
      </nav>
      <PageHeader eyebrow={vName} title={p.name} description={<span className="inline-flex items-center gap-2"><StatusBadge s={p.status} />{p.project_head && <span>Project head: {p.project_head}</span>}</span>}>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / PDF</Button>
        {canEdit && <Button asChild><Link to="/app/projects/$id/edit" params={{ id }}><Pencil className="h-4 w-4" />Edit</Link></Button>}
        {canEdit && <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}><Trash2 className="h-4 w-4" />Delete</Button>}
      </PageHeader>
      <ProjectDetail p={p} verticalName={vName} />
      <ProjectAttachments projectId={id} canEdit={canEdit} />
    </div>
  );
}
