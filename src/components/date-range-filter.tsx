import { Button } from "@/components/ui/button";

export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const cls = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        From
        <input type="date" className={`${cls} mt-1 block`} value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        To
        <input type="date" className={`${cls} mt-1 block`} value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} />
      </label>
      {(from || to) && <Button variant="outline" size="sm" onClick={() => onChange("", "")}>Clear dates</Button>}
      <p className="text-xs text-muted-foreground">Shows projects running during the selected period.</p>
    </div>
  );
}
