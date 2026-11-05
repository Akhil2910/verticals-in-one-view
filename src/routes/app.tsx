import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, FolderKanban, Layers, List, Users, FileText, KeyRound, LogOut, Menu, Plus, X } from "lucide-react";
import { signOut as endSession } from "@/lib/api.functions";
import { fetchMe, projectsQuery, verticalsQuery } from "@/lib/data";
import { verticalStyle } from "@/lib/vertical-style";
const logo = "/nium-logo.png";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const me = await fetchMe();
    if (!me || !me.role) throw redirect({ to: "/" });
    // Accounts with a temporary password must pick their own before doing anything else.
    if (me.mustChangePassword && location.pathname !== "/app/account") throw redirect({ to: "/app/account" });
    return { me };
  },
  component: AppLayout,
});

const linkCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
// Current page: lifted background, white text and a thin light-blue marker on the left.
const activeCls = { className: "!bg-white/10 !text-white shadow-[inset_3px_0_0_var(--sidebar-primary)]" };

function AppLayout() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await endSession();
    navigate({ to: "/", replace: true });
  }

  // Officials and admins jump straight to any vertical from the sidebar.
  const showVerticals = me.role !== "vertical_head";
  const verticals = useQuery({ ...verticalsQuery, enabled: showVerticals });
  const projects = useQuery({ ...projectsQuery, enabled: showVerticals });
  const countFor = (id: string) => projects.data?.filter((p) => p.vertical_id === id).length ?? 0;

  const roleLabel = me.role === "admin" ? "Administrator" : me.role === "official" ? "Official (view only)" : "Vertical Head";
  const initials = (me.name ?? "U").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  const nav = (
    <nav className="flex flex-col gap-1" onClick={() => setOpen(false)}>
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">Menu</div>
      {me.role !== "vertical_head" && <Link to="/app/dashboard" className={linkCls} activeProps={activeCls}><LayoutDashboard className="h-4 w-4" />Dashboard</Link>}
      {me.role === "vertical_head" && <Link to="/app/vertical" className={linkCls} activeProps={activeCls}><FolderKanban className="h-4 w-4" />My Projects</Link>}
      {me.role !== "vertical_head" && <Link to="/app/projects" activeOptions={{ exact: true }} className={linkCls} activeProps={activeCls}><List className="h-4 w-4" />All projects</Link>}
      {me.role === "admin" && <Link to="/app/projects/new" className={linkCls} activeProps={activeCls}><Plus className="h-4 w-4" />New project</Link>}
      <Link to="/app/report" className={linkCls} activeProps={activeCls}><FileText className="h-4 w-4" />Reports</Link>
      <Link to="/app/account" className={linkCls} activeProps={activeCls}><KeyRound className="h-4 w-4" />Change password</Link>
      {showVerticals && verticals.data && (
        <>
          <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">Verticals</div>
          {verticals.data.map((v) => (
            <Link
              key={v.id}
              to="/app/verticals/$id"
              params={{ id: v.id }}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground" }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: verticalStyle(v, verticals.data).color }} />
              <span className="min-w-0 flex-1 truncate">{v.name}</span>
              <span className={`tabular-nums text-[11px] ${countFor(v.id) ? "text-sidebar-primary" : "text-sidebar-foreground/40"}`}>{countFor(v.id)}</span>
            </Link>
          ))}
        </>
      )}
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
    <div className="min-h-screen bg-background lg:pl-64 print:bg-white print:pl-0">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-start gap-2">
            {/* The logo is a wide wordmark (433×116), so it gets a full-width white plate. */}
            <div className="flex-1 rounded-lg bg-card px-3 py-2"><img src={logo} alt="National Institute of Urban Management" width={433} height={116} className="h-auto w-full" /></div>
            <button className="p-1 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
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
        <span className="font-serif font-bold">Program Monitoring Center</span>
      </header>
      {/* App banner on every page (phones show the name in the header above instead). */}
      <div className="no-print hidden items-center justify-between gap-4 bg-gradient-to-r from-sidebar via-primary to-brand px-8 py-4 text-white lg:flex">
        <div>
          <div className="font-serif text-2xl font-bold leading-tight tracking-tight">Program Monitoring Center</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-white/70">National Institute of Urban Management</div>
        </div>
        <div className="text-right text-xs text-white/70">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <main className="px-4 py-8 sm:px-8 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
