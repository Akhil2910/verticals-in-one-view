import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verticalsQuery, type Vertical } from "@/lib/data";

export const Route = createFileRoute("/app/admin/verticals")({
  head: () => ({ meta: [{ title: "Verticals · NIUM Project Records" }] }),
  beforeLoad: ({ context }) => {
    if (context.me.role !== "admin") throw redirect({ to: "/app/dashboard" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(verticalsQuery),
  component: Verticals,
});

function Verticals() {
  const { data } = useSuspenseQuery(verticalsQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["verticals"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("verticals").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    refresh();
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Verticals</h1>
      <form onSubmit={add} className="flex gap-2">
        <Input required placeholder="New vertical name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button>Add</Button>
      </form>
      <div className="divide-y rounded-md border bg-card">
        {data.map((v) => <Row key={v.id} v={v} onChange={refresh} />)}
      </div>
    </div>
  );
}

function Row({ v, onChange }: { v: Vertical; onChange: () => void }) {
  const [name, setName] = useState(v.name);
  async function save() {
    const { error } = await supabase.from("verticals").update({ name: name.trim() }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    onChange();
  }
  async function remove() {
    if (!confirm(`Delete "${v.name}"?`)) return;
    const { error } = await supabase.from("verticals").delete().eq("id", v.id);
    if (error) return toast.error(error.code === "23503" ? "This vertical has projects. Move or delete them first." : error.message);
    onChange();
  }
  return (
    <div className="flex items-center gap-2 p-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="outline" disabled={name.trim() === v.name || !name.trim()} onClick={save}>Save</Button>
      <Button variant="ghost" onClick={remove}>Delete</Button>
    </div>
  );
}
