import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProjectForm } from "@/components/project-form";
import { projectQuery, verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/$id/edit")({
  head: () => ({ meta: [{ title: "Edit project · NIUM Project Records" }] }),
  loader: ({ context, params }) =>
    Promise.all([context.queryClient.ensureQueryData(projectQuery(params.id)), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: EditProject,
});

function EditProject() {
  const { id } = Route.useParams();
  const { me } = Route.useRouteContext();
  const { data: p } = useSuspenseQuery(projectQuery(id));
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { id: _i, created_at: _c, updated_at: _u, updated_by: _b, updated_by_name: _n, ...initial } = p;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Edit: {p.name}</h1>
      <ProjectForm
        initial={initial}
        verticals={verticals}
        lockedVertical={me.role === "vertical_head" ? me.verticalId : null}
        busy={busy}
        onSubmit={async (v) => {
          setBusy(true);
          const { error } = await supabase.from("projects").update(v).eq("id", id);
          setBusy(false);
          if (error) return toast.error(error.message);
          await qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project updated");
          navigate({ to: "/app/projects/$id", params: { id } });
        }}
      />
    </div>
  );
}
