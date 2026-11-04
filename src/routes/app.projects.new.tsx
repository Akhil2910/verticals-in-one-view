import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createProject } from "@/lib/api.functions";
import { ProjectForm } from "@/components/project-form";
import { distinctClients } from "@/lib/insights";
import { PageHeader } from "@/components/projects";
import { verticalsQuery, projectsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/new")({
  head: () => ({ meta: [{ title: "New project · NIUM Project Records" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(verticalsQuery), context.queryClient.ensureQueryData(projectsQuery)]),
  component: NewProject,
});

function NewProject() {
  const { me } = Route.useRouteContext();
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const { data: all } = useSuspenseQuery(projectsQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="New record" title="New project / programme" description="Fill in the 16 points step by step. After saving, you can attach documents and photos on the project page." />
      <ProjectForm
        verticals={verticals}
        clients={distinctClients(all)}
        lockedVertical={me.role === "vertical_head" ? me.verticalId : null}
        busy={busy}
        onSubmit={async (v) => {
          setBusy(true);
          let data: { id: string } | undefined;
          try {
            data = await createProject({ data: v });
          } catch (err) { toast.error((err as Error).message); return; } finally { setBusy(false); }
          await qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project saved");
          if (data) navigate({ to: "/app/projects/$id", params: { id: data.id } });
        }}
      />
    </div>
  );
}
