import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verticalsQuery, type Role, type Vertical } from "@/lib/data";

export const Route = createFileRoute("/app/admin/users")({
  head: () => ({ meta: [{ title: "Users · Program Monitoring Center" }] }),
  beforeLoad: ({ context }) => {
    if (context.me.role !== "admin") throw redirect({ to: "/app/dashboard" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(verticalsQuery),
  component: Users,
});

const ROLES: { v: Role; l: string }[] = [
  { v: "vertical_head", l: "Vertical Head" },
  { v: "official", l: "Official (view only)" },
  { v: "admin", l: "Admin" },
];
const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

function Users() {
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const users = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "vertical_head" as Role, vertical_id: "" });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser({ data: { ...f, vertical_id: f.vertical_id || null } });
      toast.success("Login created");
      setF({ full_name: "", email: "", password: "", role: "vertical_head", vertical_id: "" });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Users &amp; logins</h1>
      <form onSubmit={add} className="grid gap-4 rounded-md border bg-card p-5 sm:grid-cols-5">
        <div className="space-y-1.5"><Label className="text-xs">Full name</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Password (min 8)</Label><Input minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Role</Label>
          <select className={sel} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Vertical</Label>
          <select className={sel} disabled={f.role !== "vertical_head"} required={f.role === "vertical_head"} value={f.vertical_id} onChange={(e) => setF({ ...f, vertical_id: e.target.value })}>
            <option value="">—</option>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-5 flex justify-end"><Button disabled={busy}>{busy ? "Creating…" : "Create login"}</Button></div>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Vertical</th><th className="px-3 py-2">New password</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {users.isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {users.data?.map((u) => <UserRow key={u.user_id} u={u} verticals={verticals} onChange={() => qc.invalidateQueries({ queryKey: ["users"] })} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type U = { user_id: string; role: Role; vertical_id: string | null; full_name: string | null; email: string | null };

function UserRow({ u, verticals, onChange }: { u: U; verticals: Vertical[]; onChange: () => void }) {
  const [name, setName] = useState(u.full_name ?? "");
  const [role, setRole] = useState<Role>(u.role);
  const [vid, setVid] = useState(u.vertical_id ?? "");
  const [pw, setPw] = useState("");
  async function save() {
    try {
      await updateUser({ data: { user_id: u.user_id, full_name: name, role, vertical_id: vid || null, password: pw || undefined } });
      setPw("");
      toast.success("Saved");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove() {
    if (!confirm(`Delete login for ${u.email}?`)) return;
    try {
      await deleteUser({ data: { user_id: u.user_id } });
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <tr className="border-t">
      <td className="px-3 py-2"><Input value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td className="px-3 py-2">{u.email}</td>
      <td className="px-3 py-2"><select className={sel} value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></td>
      <td className="px-3 py-2"><select className={sel} disabled={role !== "vertical_head"} value={vid} onChange={(e) => setVid(e.target.value)}><option value="">—</option>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></td>
      <td className="px-3 py-2"><Input placeholder="Leave blank" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></td>
      <td className="px-3 py-2 whitespace-nowrap"><Button size="sm" onClick={save}>Save</Button> <Button size="sm" variant="ghost" onClick={remove}>Delete</Button></td>
    </tr>
  );
}
