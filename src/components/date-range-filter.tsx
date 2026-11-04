import { CalendarRange, X } from "lucide-react";

/** Compact From–To filter for page headers. Shows projects running during the selected period. */
export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const cls = "h-8 rounded-md border-0 bg-transparent px-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="no-print flex items-center gap-1 rounded-lg border bg-card px-2 py-1 shadow-sm" title="Shows projects running during the selected period">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />
      <label className="sr-only" htmlFor="range-from">From</label>
      <input id="range-from" type="date" className={cls} value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} />
      <span className="text-xs text-muted-foreground">to</span>
      <label className="sr-only" htmlFor="range-to">To</label>
      <input id="range-to" type="date" className={cls} value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} />
      {(from || to) && (
        <button type="button" onClick={() => onChange("", "")} aria-label="Clear dates" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
