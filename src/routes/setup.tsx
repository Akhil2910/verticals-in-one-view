import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminExists, bootstrapAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "First-time setup · Program Monitoring Center" },
      { name: "description", content: "Create the first admin account for the NIUM Program Monitoring Center." },
      { property: "og:title", content: "First-time setup · Program Monitoring Center" },
      { property: "og:description", content: "Create the first admin account for the NIUM Program Monitoring Center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const [done, setDone] = useState<boolean | null>(null);
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    adminExists().then((r) => setDone(r.exists));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrapAdmin({ data: f });
      toast.success("Admin created. Please sign in.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-semibold">First-time setup</h1>
        {done === null && <p className="text-muted-foreground">Checking…</p>}
        {done === true && (
          <p className="text-muted-foreground">
            Setup is complete. <Link to="/" className="underline">Go to sign in</Link>.
          </p>
        )}
        {done === false && (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Create the admin account. This page works only once.</p>
            <div className="space-y-2"><Label>Full name</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Password (min 8)</Label><Input type="password" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create admin"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
