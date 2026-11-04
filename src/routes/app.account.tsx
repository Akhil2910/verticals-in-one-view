import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/api.functions";
import { homeFor } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/account")({
  head: () => ({ meta: [{ title: "Change password · NIUM Project Records" }] }),
  component: Account,
});

function Account() {
  const { me } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.next !== f.confirm) { toast.error("The new passwords don't match."); return; }
    setBusy(true);
    try {
      await changePassword({ data: { current: f.current, next: f.next } });
      toast.success("Password changed");
      await router.invalidate();
      navigate({ to: homeFor(me.role), replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change password</h1>
        {me.mustChangePassword ? (
          <p className="mt-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
            You signed in with a temporary password. Choose your own password to continue.
          </p>
        ) : (
          <p className="text-muted-foreground">Signed in as {me.email}</p>
        )}
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2"><Label htmlFor="cur">Current password</Label><Input id="cur" type="password" required autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="new">New password (min 8)</Label><Input id="new" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="conf">Repeat new password</Label><Input id="conf" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
      </form>
    </div>
  );
}
