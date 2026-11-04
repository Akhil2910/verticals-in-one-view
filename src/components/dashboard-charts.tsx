import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { CircleDot, Layers, Wallet } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { inr, inrCompact, pct, totals, type Project, type Vertical } from "@/lib/data";
import { verticalStyle } from "@/lib/vertical-style";
import { STATUS_STYLE, STATUSES } from "./projects";

type Slice = { key: string; label: string; value: number; color: string };

/**
 * A donut with its legend beside it (value and share per slice). Clicking a slice or a
 * legend row calls `onSelect` with that slice's key, when given.
 */
function Donut({
  slices,
  center,
  centerLabel,
  format = (n) => n.toLocaleString("en-IN"),
  onSelect,
}: {
  slices: Slice[];
  center: string;
  centerLabel: string;
  format?: (n: number) => string;
  onSelect?: ((key: string) => void) | undefined;
}) {
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">Nothing in this view.</div>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <PieChart width={160} height={160}>
          <Tooltip
            cursor={false}
            content={({ payload }) =>
              payload?.[0] ? (
                <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md">
                  <span className="font-medium">{(payload[0].payload as Slice).label}</span>: {format(Number(payload[0].value))}
                </div>
              ) : null
            }
          />
          <Pie
            data={shown}
            dataKey="value"
            nameKey="label"
            innerRadius={50}
            outerRadius={76}
            strokeWidth={2}
            stroke="var(--card)"
            paddingAngle={shown.length > 1 ? 1.5 : 0}
            className={onSelect ? "cursor-pointer" : ""}
            onClick={(d: { key?: string }) => d.key && onSelect?.(d.key)}
            isAnimationActive={false}
          >
            {shown.map((s) => <Cell key={s.key} fill={s.color} />)}
            <Label
              content={({ viewBox }) =>
                viewBox && "cx" in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 4} className="fill-foreground font-serif text-xl font-semibold">{center}</tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 15} className="fill-muted-foreground text-[10px]">{centerLabel}</tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </div>
      <ul className="min-w-40 flex-1 space-y-1.5 text-xs">
        {shown.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(s.key)}
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left enabled:hover:bg-muted"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="font-medium tabular-nums">{format(s.value)}</span>
              <span className="w-9 text-right tabular-nums text-muted-foreground">{pct(s.value, total)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, tone, className = "", children }: { title: string; subtitle: string; icon: typeof Layers; tone: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
        <div>
          <h3 className="font-serif text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

/** Three small donuts: status mix, projects per vertical, and money received vs still due. */
export function PortfolioDonuts({
  projects,
  verticals,
  styleFrom,
  onStatus,
  onVertical,
}: {
  projects: Project[];
  verticals: Vertical[];
  styleFrom?: Vertical[];
  onStatus?: (status: string) => void;
  onVertical?: (id: string) => void;
}) {
  const t = totals(projects);
  const status: Slice[] = STATUSES.map((s) => ({ key: s, label: s, value: projects.filter((p) => p.status === s).length, color: STATUS_STYLE[s]!.color }));
  const byVertical: Slice[] = verticals
    .map((v) => ({ key: v.id, label: v.name, value: projects.filter((p) => p.vertical_id === v.id).length, color: verticalStyle(v, styleFrom ?? verticals).color }))
    .sort((a, b) => b.value - a.value);
  const funds: Slice[] = [
    { key: "received", label: "Received", value: t.received, color: "var(--received)" },
    { key: "due", label: "Yet to receive", value: t.pending, color: "var(--due)" },
  ];
  return (
    <div className={`grid gap-4 md:grid-cols-2 ${verticals.length > 1 ? "xl:grid-cols-3" : ""}`}>
      <ChartCard title="By status" subtitle="Click a slice to filter." icon={CircleDot} tone="bg-ongoing/10 text-ongoing">
        <Donut slices={status} center={String(projects.length)} centerLabel="projects" onSelect={onStatus} />
      </ChartCard>
      {verticals.length > 1 && (
        <ChartCard title="By vertical" subtitle="Share of projects in each vertical." icon={Layers} tone="bg-primary/10 text-primary">
          <Donut slices={byVertical} center={String(new Set(projects.map((p) => p.vertical_id)).size)} centerLabel="reporting" onSelect={onVertical} />
        </ChartCard>
      )}
      <ChartCard title="Funds position" subtitle="Total project cost split by what has come in." icon={Wallet} tone="bg-received/10 text-received">
        <Donut slices={funds} center={`${pct(t.received, t.cost)}%`} centerLabel="received" format={(n) => inrCompact(n, 2)} />
      </ChartCard>
    </div>
  );
}

const fundsConfig = {
  received: { label: "Received", color: "var(--received)" },
  pending: { label: "Yet to receive", color: "var(--due)" },
} satisfies ChartConfig;

/** Total cost per vertical as one bar, split into received and yet to receive. Largest first. */
export function FundsByVertical({ projects, verticals, onVertical }: { projects: Project[]; verticals: Vertical[]; onVertical?: (id: string) => void }) {
  const funds = verticals
    .map((v) => {
      const t = totals(projects.filter((p) => p.vertical_id === v.id));
      return { id: v.id, name: v.name, received: t.received, pending: t.pending, cost: t.cost };
    })
    .filter((d) => d.cost > 0)
    .sort((a, b) => b.cost - a.cost);
  return (
    <ChartCard title="Funds by vertical" subtitle="Each bar is the total project cost, split into received and yet to receive. Click a bar to filter." icon={Wallet} tone="bg-due/15 text-[#9a6700]">
      {funds.length === 0 ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">No project costs recorded in this view.</div>
      ) : (
        <ChartContainer config={fundsConfig} className="aspect-auto w-full" style={{ height: Math.max(140, funds.length * 44 + 40) }}>
          <BarChart data={funds} layout="vertical" margin={{ left: 4, right: 24 }} barCategoryGap={12}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => inrCompact(v)} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={180} tick={{ fontSize: 12 }} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={(v, name) => <TooltipRow label={fundsConfig[name as keyof typeof fundsConfig]?.label} value={inr(Number(v))} />} />} />
            <Bar dataKey="received" stackId="f" fill="var(--color-received)" className={onVertical ? "cursor-pointer" : ""} onClick={(d: { id?: string }) => d.id && onVertical?.(d.id)} />
            <Bar dataKey="pending" stackId="f" fill="var(--color-pending)" radius={[0, 4, 4, 0]} className={onVertical ? "cursor-pointer" : ""} onClick={(d: { id?: string }) => d.id && onVertical?.(d.id)} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

function TooltipRow({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex w-full justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}
