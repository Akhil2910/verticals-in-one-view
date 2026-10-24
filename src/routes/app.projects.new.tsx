import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProjectForm } from "@/components/project-form";
import { verticalsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/projects/new")({
  head: () => ({ meta: [{ title: "New project · NIUM Project Records" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(verticalsQuery),
  component: NewProject,
});

function NewProject() {
  const { me } = Route.useRouteContext();
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">New project / programme</h1>
      <ProjectForm
        verticals={verticals}
        lockedVertical={me.role === "vertical_head" ? me.verticalId : null}
        busy={busy}
        onSubmit={async (v) => {
          setBusy(true);
          const { data, error } = await supabase.from("projects").insert(v).select("id").single();
          setBusy(false);
          if (error) return toast.error(error.message);
          await qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project saved");
          navigate({ to: "/app/projects/$id", params: { id: data.id } });
        }}
      />
    </div>
  );
}
