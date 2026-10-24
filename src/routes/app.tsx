import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe } from "@/lib/data";
import { Button } from "@/components/ui/button";
import logo from "@/assets/nium-logo.png";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me || !me.role) throw redirect({ to: "/" });
    return { me };
  },
  component: AppLayout,
});

const linkCls = "rounded px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const activeCls = { className: "bg-sidebar-accent text-sidebar-accent-foreground" };

function AppLayout() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  useRouter();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const roleLabel = me.role === "admin" ? "Admin" : me.role === "official" ? "Official" : "Vertical Head";

  return (
    <div className="min-h-screen">
      <header className="no-print border-b-4 border-accent bg-sidebar text-sidebar-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <div className="mr-4 flex items-center gap-3">
            <img src={logo} alt="NIUM logo" width={40} height={40} className="h-10 w-10 rounded-full bg-card p-0.5" />
            <div>
            <div className="font-serif text-lg font-bold leading-none">NIUM Records</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-primary">Projects &amp; Programmes</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {me.role !== "vertical_head" && <Link to="/app/dashboard" className={linkCls} activeProps={activeCls}>Dashboard</Link>}
            {me.role === "vertical_head" && <Link to="/app/vertical" className={linkCls} activeProps={activeCls}>My Projects</Link>}
            {me.role === "admin" && <Link to="/app/admin/verticals" className={linkCls} activeProps={activeCls}>Verticals</Link>}
            {me.role === "admin" && <Link to="/app/admin/users" className={linkCls} activeProps={activeCls}>Users</Link>}
            <Link to="/app/report" className={linkCls} activeProps={activeCls}>Reports</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div>{me.name}</div>
              <div className="text-xs text-sidebar-primary">{roleLabel}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
