import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { signIn, signOut } from "@/lib/api.functions";
import { fetchMe, homeFor } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const logo = "/nium-logo.png";

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
  const [showPw, setShowPw] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn({ data: { email, password } });
    } catch (err) {
      setBusy(false);
      toast.error((err as Error).message);
      return;
    }
    const me = await fetchMe();
    setBusy(false);
    if (!me?.role) {
      toast.error("Your account has no role assigned. Contact the IT admin.");
      await signOut();
      return;
    }
    navigate({ to: me.mustChangePassword ? "/app/account" : homeFor(me.role), replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="w-72 rounded-xl bg-card px-5 py-3"><img src={logo} alt="National Institute of Urban Management" width={433} height={116} className="h-auto w-full" /></div>
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
            <img src={logo} alt="National Institute of Urban Management" width={433} height={116} className="mb-6 h-auto w-56 lg:hidden" />
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use the login given to you by the IT admin.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <div className="relative">
              <Input id="pw" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-16" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
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
