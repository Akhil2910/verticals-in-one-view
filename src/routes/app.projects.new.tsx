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
  head: () => ({ meta: [{ title: "New project · Program Monitoring Center" }] }),
  // ?v=<vertical id> preselects the vertical when starting from a vertical's page.
  validateSearch: (search: Record<string, unknown>): { v?: string | undefined } => {
    const v = search["v"];
    return typeof v === "string" && v ? { v } : {};
  },
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(verticalsQuery), context.queryClient.ensureQueryData(projectsQuery)]),
  component: NewProject,
});

function NewProject() {
  const { me } = Route.useRouteContext();
  const { v } = Route.useSearch();
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
        initial={v && verticals.some((x) => x.id === v) ? { vertical_id: v } : {}}
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
