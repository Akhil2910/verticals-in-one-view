import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, FolderKanban, Layers, Users, FileText, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe } from "@/lib/data";
import logoAsset from "@/assets/nium-logo.png.asset.json";
const logo = logoAsset.url;

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me || !me.role) throw redirect({ to: "/" });
    return { me };
  },
  component: AppLayout,
});

const linkCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const activeCls = { className: "!bg-sidebar-primary !text-sidebar-primary-foreground shadow-sm" };

function AppLayout() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const roleLabel = me.role === "admin" ? "Administrator" : me.role === "official" ? "Official (view only)" : "Vertical Head";
  const initials = (me.name ?? "U").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  const nav = (
    <nav className="flex flex-col gap-1" onClick={() => setOpen(false)}>
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">Menu</div>
      {me.role !== "vertical_head" && <Link to="/app/dashboard" className={linkCls} activeProps={activeCls}><LayoutDashboard className="h-4 w-4" />Dashboard</Link>}
      {me.role === "vertical_head" && <Link to="/app/vertical" className={linkCls} activeProps={activeCls}><FolderKanban className="h-4 w-4" />My Projects</Link>}
      <Link to="/app/report" className={linkCls} activeProps={activeCls}><FileText className="h-4 w-4" />Reports</Link>
      {me.role === "admin" && (
        <>
          <div className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">Administration</div>
          <Link to="/app/admin/verticals" className={linkCls} activeProps={activeCls}><Layers className="h-4 w-4" />Verticals</Link>
          <Link to="/app/admin/users" className={linkCls} activeProps={activeCls}><Users className="h-4 w-4" />Users</Link>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="shrink-0 rounded-md bg-card p-1"><img src={logo} alt="NIUM logo" width={44} height={44} className="h-11 w-11 object-contain" /></div>
          <div>
            <div className="font-serif text-lg font-bold leading-none">NIUM Records</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-sidebar-primary">Projects &amp; Programmes</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{nav}</div>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">{initials}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{me.name}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</div>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="no-print fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}

      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <span className="font-serif font-bold">NIUM Records</span>
      </header>
      <div className="no-print h-1 bg-gradient-to-r from-primary via-accent to-primary" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
