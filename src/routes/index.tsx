import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe, homeFor } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoAsset from "@/assets/nium-logo.png.asset.json";
const logo = logoAsset.url;

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · NIUM Project Records" },
      { name: "description", content: "Sign in to the NIUM internal project and programme records portal." },
      { property: "og:title", content: "Sign in · NIUM Project Records" },
      { property: "og:description", content: "Sign in to the NIUM internal project and programme records portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const me = await fetchMe();
    if (me?.role) throw redirect({ to: homeFor(me.role) });
  },
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const me = await fetchMe();
    setBusy(false);
    if (!me?.role) {
      toast.error("Your account has no role assigned. Contact the IT admin.");
      await supabase.auth.signOut();
      return;
    }
    navigate({ to: homeFor(me.role), replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3"><img src={logo} alt="NIUM logo" width={56} height={56} className="h-14 w-14 rounded-full bg-card p-1" /><div><div className="font-serif text-lg font-bold">National Institute of Urban Management</div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">IT Wing</div></div></div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Project &amp; Programme Records</h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/80">
            Documentation of all completed and ongoing projects, programmes and trainings across NIUM verticals.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/60">As per Circular Roc. No.1078023/NIUM/2026/IT</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <img src={logo} alt="NIUM logo" width={64} height={64} className="mb-4 h-16 w-16 lg:hidden" />
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use the login given to you by the IT admin.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            First time? <Link to="/setup" className="underline">Set up the admin account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
