import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { updateProject } from "@/lib/api.functions";
import { ProjectForm } from "@/components/project-form";
import { distinctClients } from "@/lib/insights";
import { ProjectAttachments } from "@/components/project-attachments";
import { PageHeader } from "@/components/projects";
import { projectQuery, verticalsQuery, projectsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/$id/edit")({
  head: () => ({ meta: [{ title: "Edit project · Program Monitoring Center" }] }),
  loader: ({ context, params }) =>
    Promise.all([context.queryClient.ensureQueryData(projectQuery(params.id)), context.queryClient.ensureQueryData(verticalsQuery), context.queryClient.ensureQueryData(projectsQuery)]),
  component: EditProject,
});

function EditProject() {
  const { id } = Route.useParams();
  const { me } = Route.useRouteContext();
  const { data: p } = useSuspenseQuery(projectQuery(id));
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const { data: all } = useSuspenseQuery(projectsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { id: _i, created_at: _c, updated_at: _u, updated_by: _b, updated_by_name: _n, ...initial } = p;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Edit project" title={p.name} description="Update the 16 points step by step. Documents and photos below are saved as soon as you upload them." />
      <ProjectForm
        initial={initial}
        verticals={verticals}
        clients={distinctClients(all)}
        lockedVertical={me.role === "vertical_head" ? me.verticalId : null}
        busy={busy}
        onSubmit={async (v) => {
          setBusy(true);
          try {
            await updateProject({ data: { id, values: v } });
          } catch (err) { toast.error((err as Error).message); return; } finally { setBusy(false); }
          await qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project updated");
          navigate({ to: "/app/projects/$id", params: { id } });
        }}
      />
      <ProjectAttachments projectId={id} canEdit />
    </div>
  );
}
