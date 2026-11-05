import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, Building, CalendarRange, ClipboardCheck, FileText, Gauge, History, Layers, List, PieChart, Plus, TrendingUp, Truck, type LucideIcon } from "lucide-react";
import { PageHeader, Stats, VerticalCards } from "@/components/projects";
import { DataCompleteness, DeliveryHealth, ReceivablesAgeing, YearOnYear } from "@/components/analytics";
import { FundsByVertical, PortfolioDonuts } from "@/components/dashboard-charts";
import { FilterBar } from "@/components/dashboard-filters";
import { AttentionPanel, ClientsPanel, InsightStrip, Panel, RecentActivity, TopProjects, TrendChart, VendorsPanel } from "@/components/insights";
import { Button } from "@/components/ui/button";
import { projectsQuery, verticalsQuery } from "@/lib/data";
import { applyFilters, parseFilters, period, periodLabel, type DashboardFilters } from "@/lib/filters";
import { attention as findAttention, distinctClients, financialYears } from "@/lib/insights";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Program Monitoring Center" }] }),
  validateSearch: (search: Record<string, unknown>): DashboardFilters => parseFilters(search),
  beforeLoad: ({ context }) => {
    if (context.me.role === "vertical_head") throw redirect({ to: "/app/vertical" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(verticalsQuery)]),
  component: Dashboard,
});

const SECTIONS = [
  ["overview", "Overview"],
  ["charts", "Charts"],
  ["delivery", "Delivery & dues"],
  ["years", "Year on year"],
  ["partners", "Clients & vendors"],
  ["verticals", "Verticals"],
  ["attention", "Needs attention"],
  ["quality", "Data quality"],
] as const;

function Dashboard() {
  const { data: all } = useSuspenseQuery(projectsQuery);
  const { data: verticals } = useSuspenseQuery(verticalsQuery);
  const filters = Route.useSearch();
  const { me } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const setFilters = (patch: Partial<DashboardFilters>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const projects = useMemo(() => applyFilters(all, filters), [all, filters]);
  const statusCounts = useMemo(() => applyFilters(all, filters, { ignoreStatus: true }), [all, filters]);
  const years = useMemo(() => financialYears(all), [all]);
  const clients = useMemo(() => distinctClients(all), [all]);
  const attention = useMemo(() => findAttention(projects), [projects]);
  const range = period(filters);
  const shownVerticals = filters.v ? verticals.filter((v) => v.id === filters.v) : verticals;
  const scope = [filters.v ? (verticals.find((v) => v.id === filters.v)?.name ?? "One vertical") : "All verticals", filters.c].filter(Boolean).join(" · ");
  const flagged = attention.overdue.length + attention.onHold.length + attention.duesOnCompleted.length;
  const label = periodLabel(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scope}
        title="Dashboard"
        description={label === "All time" ? "Every project and programme across NIUM, in one view." : <>Activity during <span className="font-semibold text-foreground">{label}</span>: projects running at any point in this period.</>}
      >
        <Button asChild variant="outline" className="h-9">
          <Link to="/app/projects"><List className="h-4 w-4" />All projects</Link>
        </Button>
        <Button asChild variant="outline" className="h-9">
          <Link to="/app/report" search={{ v: filters.v, status: filters.status }}><FileText className="h-4 w-4" />Report for this view</Link>
        </Button>
        {me.role === "admin" && (
          <Button asChild className="h-9">
            <Link to="/app/projects/new" search={{ v: filters.v }}><Plus className="h-4 w-4" />Add project</Link>
          </Button>
        )}
      </PageHeader>

      {/* Page-wide filters and section links stay in reach while scrolling. */}
      <div className="no-print sticky top-14 z-20 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:top-0">
        <FilterBar filters={filters} verticals={verticals} clients={clients} years={years} counts={statusCounts} onChange={setFilters} />
        <nav className="flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]" aria-label="Dashboard sections">
          {SECTIONS.map(([id, text]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-2.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              {text}
              {id === "attention" && flagged > 0 && <span className="ml-1.5 rounded-full bg-onhold/15 px-1.5 text-xs font-semibold text-foreground">{flagged}</span>}
            </a>
          ))}
        </nav>
      </div>

      <section id="overview" className="scroll-mt-40 space-y-4">
        <Stats projects={projects} />
        <InsightStrip projects={projects} verticals={verticals} attention={attention} />
      </section>

      <div id="charts" className="scroll-mt-40 space-y-4">
        <SectionHeading icon={PieChart} title="At a glance" hint="Click a slice or a legend row to filter the dashboard." />
        <PortfolioDonuts
          projects={projects}
          verticals={shownVerticals}
          styleFrom={verticals}
          onVertical={(id) => setFilters({ v: filters.v === id ? undefined : id })}
          onStatus={(s) => setFilters({ status: filters.status === s ? undefined : s })}
        />
        <SectionHeading icon={TrendingUp} title="Trends & funds" />
        <Panel title="Activity by month" hint={range.from ? `Projects started during ${label}.` : "By month of commencement."}>
          <TrendChart projects={projects} range={range} />
        </Panel>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <FundsByVertical projects={projects} verticals={shownVerticals} onVertical={(id) => setFilters({ v: filters.v === id ? undefined : id })} />
          </div>
          <Panel title="Largest projects" hint="By total project cost, with the share received.">
            <TopProjects projects={projects} verticals={verticals} />
          </Panel>
        </div>
      </div>

      <div id="delivery" className="grid scroll-mt-40 gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <SectionHeading icon={Gauge} title="Delivery health" hint="Ongoing projects against their due dates." />
          <div className="rounded-xl border bg-card p-5 shadow-sm"><DeliveryHealth projects={projects} verticals={verticals} /></div>
        </div>
        <div className="space-y-3">
          <SectionHeading icon={History} title="Dues ageing" hint="Unpaid amounts on completed work, by time since completion." />
          <div className="rounded-xl border bg-card p-5 shadow-sm"><ReceivablesAgeing projects={projects} /></div>
        </div>
      </div>

      <section id="years" className="scroll-mt-40 space-y-3">
        <SectionHeading icon={CalendarRange} title="Year on year" hint="By financial year of commencement (April–March)." />
        <div className="rounded-xl border bg-card p-5 shadow-sm"><YearOnYear projects={projects} /></div>
      </section>

      <div id="partners" className="grid scroll-mt-40 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionHeading icon={Building} title="Clients" hint="By total project cost. Click one to filter." />
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <ClientsPanel projects={projects} onSelect={(c) => setFilters({ c: filters.c === c ? undefined : c })} />
          </div>
        </div>
        <div className="space-y-3">
          <SectionHeading icon={Truck} title="Partner vendors" hint="By number of projects." />
          <div className="rounded-xl border bg-card p-5 shadow-sm"><VendorsPanel projects={projects} /></div>
        </div>
      </div>

      <section id="verticals" className="scroll-mt-40 space-y-3">
        <SectionHeading icon={Layers} title="Verticals" hint="Open a vertical for its own page." />
        <VerticalCards verticals={shownVerticals} projects={projects} styleFrom={verticals} />
      </section>

      <div id="attention" className="grid scroll-mt-40 gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <SectionHeading icon={AlertTriangle} title="Needs attention" hint="Follow-ups worked out from dates, payments and status." />
          <AttentionPanel attention={attention} verticals={verticals} />
        </div>
        <div className="space-y-3">
          <SectionHeading icon={History} title="Recent updates" hint="Latest changes by vertical heads." />
          <div className="rounded-xl border bg-card p-5 shadow-sm"><RecentActivity projects={projects} verticals={verticals} /></div>
        </div>
      </div>

      <section id="quality" className="scroll-mt-40 space-y-3">
        <SectionHeading icon={ClipboardCheck} title="Data quality" hint="Share of projects with each detail filled in. Gaps here leave the analytics above incomplete." />
        <div className="rounded-xl border bg-card p-5 shadow-sm"><DataCompleteness projects={projects} verticals={verticals} /></div>
      </section>
    </div>
  );
}

function SectionHeading({ title, hint, icon: Icon }: { title: string; hint?: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <span className="flex h-7 w-7 items-center justify-center self-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        {title}
      </h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
