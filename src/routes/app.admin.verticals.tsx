import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { createVertical, deleteVertical, renameVertical } from "@/lib/api.functions";
import { listUsers } from "@/lib/admin.functions";
import { PageHeader } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, projectsQuery, totals, verticalsQuery, type Project, type Vertical } from "@/lib/data";

export const Route = createFileRoute("/app/admin/verticals")({
  head: () => ({ meta: [{ title: "Verticals · Program Monitoring Center" }] }),
  beforeLoad: ({ context }) => {
    if (context.me.role !== "admin") throw redirect({ to: "/app/dashboard" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(verticalsQuery), context.queryClient.ensureQueryData(projectsQuery)]),
  component: Verticals,
});

function Verticals() {
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const users = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["verticals"] });
  const headsOf = (id: string) => (users.data ?? []).filter((u) => u.role === "vertical_head" && u.vertical_id === id).map((u) => u.full_name ?? u.email);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createVertical({ data: { name: name.trim() } });
    } catch (err) { toast.error((err as Error).message); return; }
    toast.success(`Added “${name.trim()}”`);
    setName("");
    refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Administration" title="Verticals" description={`${verticals.length} verticals. Each vertical head records projects for their own vertical.`} />

      <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <Input required maxLength={120} placeholder="Name of a new vertical" value={name} onChange={(e) => setName(e.target.value)} className="max-w-md flex-1" />
        <Button><Plus className="h-4 w-4" />Add vertical</Button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Vertical</th>
              <th className="px-4 py-2.5 font-semibold">Vertical head</th>
              <th className="px-4 py-2.5 text-right font-semibold">Projects</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total cost</th>
              <th className="w-28 px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {verticals.map((v) => (
              <Row key={v.id} v={v} projects={projects.filter((p) => p.vertical_id === v.id)} heads={headsOf(v.id)} loadingHeads={users.isLoading} onChange={refresh} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ v, projects, heads, loadingHeads, onChange }: { v: Vertical; projects: Project[]; heads: string[]; loadingHeads: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(v.name);
  const t = totals(projects);

  async function save() {
    try {
      await renameVertical({ data: { id: v.id, name: name.trim() } });
    } catch (err) { toast.error((err as Error).message); return; }
    toast.success("Renamed");
    setEditing(false);
    onChange();
  }
  async function remove() {
    if (!confirm(`Delete "${v.name}"?`)) return;
    try {
      await deleteVertical({ data: { id: v.id } });
    } catch (err) { toast.error((err as Error).message); return; }
    onChange();
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-3">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex items-center gap-1">
            <Input autoFocus required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!name.trim() || name.trim() === v.name} aria-label="Save name"><Check className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setName(v.name); setEditing(false); }} aria-label="Cancel"><X className="h-4 w-4" /></Button>
          </form>
        ) : (
          <Link to="/app/verticals/$id" params={{ id: v.id }} className="font-medium hover:text-primary hover:underline">{v.name}</Link>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {loadingHeads ? "…" : heads.length ? heads.join(", ") : <Link to="/app/admin/users" className="text-xs text-brand hover:underline">No head assigned</Link>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{t.count}</td>
      <td className="px-4 py-3 text-right tabular-nums">{inr(t.cost)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {!editing && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} aria-label={`Rename ${v.name}`} title="Rename"><Pencil className="h-4 w-4" /></Button>}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={remove}
            disabled={t.count > 0}
            aria-label={`Delete ${v.name}`}
            title={t.count > 0 ? "Move or delete its projects first" : "Delete"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
