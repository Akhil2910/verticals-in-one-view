import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, inr, yetToReceive, isCapacityBuilding, type ProjectInput, type Vertical } from "@/lib/data";
import type { PartnerVendor } from "@/lib/types";
import { STATUSES } from "./projects";

export type { ProjectInput };

const empty: ProjectInput = {
  vertical_id: "",
  name: "",
  project_head: "",
  team_members: "",
  start_date: null,
  end_date: null,
  status: "Ongoing",
  progress_notes: "",
  physical_progress: 0,
  physical_progress_not_applicable: false,
  milestones_completed: "",
  milestones_pending: "",
  total_cost: 0,
  amount_received: 0,
  expenditure: 0,
  amount_receivable: 0,
  expected_completion: null,
  issues: "",
  other_info: "",
  participants: null,
  client_name: null,
  partner_vendors: [],
};

const STEPS = ["Basics", "Status & progress", "Financials", "Other & review"];
const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function ProjectForm({
  initial,
  verticals,
  clients = [],
  lockedVertical,
  onSubmit,
  busy,
}: {
  initial?: Partial<ProjectInput>;
  verticals: Vertical[];
  /** Client names already used on other projects, offered as suggestions. */
  clients?: string[];
  lockedVertical?: string | null;
  onSubmit: (v: ProjectInput) => void;
  busy?: boolean;
}) {
  const [f, setF] = useState<ProjectInput>({ ...empty, ...initial, vertical_id: lockedVertical ?? initial?.vertical_id ?? "" });
  const [step, setStep] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const isCapacity = isCapacityBuilding(verticals.find((v) => v.id === f.vertical_id)?.name ?? "");
  const notApplicable = isCapacity && f.physical_progress_not_applicable;
  const txt = (k: keyof ProjectInput) => ({ value: (f[k] as string) ?? "", onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) });
  const date = (k: keyof ProjectInput) => ({ type: "date", value: (f[k] as string) ?? "", onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never) });
  const num = (k: keyof ProjectInput) => ({ type: "number", min: 0, step: "0.01", value: String(f[k] ?? 0), onChange: (e: { target: { value: string } }) => set(k, Number(e.target.value || 0) as never) });

  // Runs the browser's required/min/max checks on the fields of the visible step only.
  const stepValid = () => {
    const fields = stepRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? [];
    for (const el of fields) if (!el.reportValidity()) return false;
    return true;
  };
  const goTo = (i: number) => {
    if (i > step && !stepValid()) return;
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Enter on an earlier step moves forward instead of saving.
        if (step < last) return goTo(step + 1);
        onSubmit({ ...f, physical_progress_not_applicable: notApplicable });
      }}
      className="space-y-6"
    >
      <Stepper step={step} onSelect={goTo} />

      <div ref={stepRef}>
        {step === 0 && (
          <Section title="Basic details" hint="What the project is, which vertical it belongs to, and who runs it.">
            <Field label="1. Name of the Project / Programme *" full><Input required maxLength={300} {...txt("name")} /></Field>
            <Field label="2. Vertical *">
              <select required disabled={!!lockedVertical} className={selectCls} value={f.vertical_id} onChange={(e) => set("vertical_id", e.target.value)}>
                <option value="">Select…</option>
                {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            {isCapacity && (
              <Field label="Number of participants">
                <Input type="number" min={0} step="1" value={f.participants == null ? "" : String(f.participants)} onChange={(e) => set("participants", e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))} />
              </Field>
            )}
            <Field label="3a. Project Head"><Input {...txt("project_head")} /></Field>
            <Field label="Client / Department">
              <Input list="client-suggestions" maxLength={200} placeholder="e.g. O/o CDMA, TUFIDC" {...txt("client_name")} />
              <datalist id="client-suggestions">{clients.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="3b. Team Members" full><Textarea rows={2} {...txt("team_members")} /></Field>
          </Section>
        )}

        {step === 1 && (
          <Section title="Status & progress" hint="Where the project stands today.">
            <Field label="5. Current status">
              <select className={selectCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="6. Physical work completed (%)">
              {isCapacity && (
                <select aria-label="Physical work applicability" className={selectCls} value={f.physical_progress_not_applicable ? "not_applicable" : "applicable"} onChange={(e) => set("physical_progress_not_applicable", e.target.value === "not_applicable")}>
                  <option value="applicable">Applicable (%)</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              )}
              {!notApplicable && <Input aria-label="Physical work completed (%)" type="number" min={0} max={100} value={String(f.physical_progress)} onChange={(e) => set("physical_progress", Math.min(100, Math.max(0, Number(e.target.value || 0))))} />}
            </Field>
            <Field label="4a. Date of commencement"><Input {...date("start_date")} /></Field>
            <Field label="4b. Proposed / completed date"><Input min={f.start_date ?? undefined} {...date("end_date")} /></Field>
            {f.status !== "Completed" && <Field label="14. Expected date of completion"><Input min={f.start_date ?? undefined} {...date("expected_completion")} /></Field>}
            <Field label="5. Progress notes" full><Textarea rows={2} {...txt("progress_notes")} /></Field>
            <Field label="7. Key activities / milestones completed" full><Textarea rows={3} {...txt("milestones_completed")} /></Field>
            <Field label="8. Activities / milestones pending" full><Textarea rows={3} {...txt("milestones_pending")} /></Field>
          </Section>
        )}

        {step === 2 && (
          <Section title="Financials (₹)" hint="Amounts in rupees. The amount yet to be received is worked out for you.">
            <Field label="9. Total Project Cost / Sanctioned Amount"><Input {...num("total_cost")} /></Field>
            <Field label="10. Amount received"><Input {...num("amount_received")} /></Field>
            <Field label="11. Amount yet to be received"><div className="flex h-9 items-center rounded-md bg-muted px-3 text-sm">{inr(yetToReceive(f))}</div></Field>
            <Field label="12. Expenditure incurred"><Input {...num("expenditure")} /></Field>
            <Field label="13. Amount receivable"><Input {...num("amount_receivable")} /></Field>
            <Field label="Partner vendors" full>
              <VendorList vendors={f.partner_vendors} onChange={(v) => set("partner_vendors", v)} />
            </Field>
          </Section>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Section title="Other information" hint="Anything else officials should know.">
              <Field label="15. Major issues, constraints or pending matters" full><Textarea rows={3} {...txt("issues")} /></Field>
              <Field label="16. Any other relevant information" full><Textarea rows={3} {...txt("other_info")} /></Field>
            </Section>
            <Review f={f} vertical={verticals.find((v) => v.id === f.vertical_id)?.name ?? "—"} notApplicable={notApplicable} onEdit={setStep} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>← Back</Button>
        <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        {/* Distinct keys: if React reused one <button> and flipped it to type=submit
            during the click on Next, the same click would save the form. */}
        {step < last ? (
          <Button key="next" type="button" onClick={() => goTo(step + 1)}>Next →</Button>
        ) : (
          <Button key="save" type="submit" disabled={busy}>{busy ? "Saving…" : "Save project"}</Button>
        )}
      </div>
    </form>
  );
}

function Stepper({ step, onSelect }: { step: number; onSelect: (i: number) => void }) {
  return (
    <div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label}>
              <button type="button" onClick={() => onSelect(i)} aria-current={state === "current" ? "step" : undefined} className="group flex w-full flex-col gap-2 text-left">
                <span className={`h-1.5 rounded-full transition-colors ${state === "todo" ? "bg-muted" : "bg-brand"}`} />
                <span className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${state === "current" ? "bg-primary text-primary-foreground" : state === "done" ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={`hidden text-sm sm:inline ${state === "current" ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 text-sm font-semibold sm:hidden">{STEPS[step]}</div>
    </div>
  );
}

function Review({ f, vertical, notApplicable, onEdit }: { f: ProjectInput; vertical: string; notApplicable: boolean; onEdit: (step: number) => void }) {
  const rows: [string, string, number][] = [
    ["Project / Programme", f.name || "—", 0],
    ["Vertical", vertical, 0],
    ["Project Head", f.project_head || "—", 0],
    ["Status", f.status, 1],
    ["Physical work completed", notApplicable ? "Not applicable" : `${f.physical_progress}%`, 1],
    ["Period", `${fmtDate(f.start_date)} → ${fmtDate(f.end_date)}`, 1],
    ["Total Project Cost", inr(f.total_cost), 2],
    ["Received / yet to receive", `${inr(f.amount_received)} / ${inr(yetToReceive(f))}`, 2],
    ["Client", f.client_name || "—", 0],
    ["Partner vendors", f.partner_vendors.length ? f.partner_vendors.map((v) => v.name).join(", ") : "—", 2],
    ["Expenditure incurred", inr(f.expenditure), 2],
  ];
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/40 px-6 py-3">
        <h2 className="font-serif text-base font-semibold">Review before saving</h2>
      </div>
      <dl className="divide-y text-sm">
        {rows.map(([k, v, s]) => (
          <div key={k} className="flex items-center gap-4 px-6 py-2">
            <dt className="w-44 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="flex-1 font-medium">{v}</dd>
            <button type="button" onClick={() => onEdit(s)} className="text-xs text-primary hover:underline">Edit</button>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/40 px-6 py-3">
        <span className="h-5 w-1 rounded-full bg-brand" />
        <div>
          <h2 className="font-serif text-base font-semibold">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Editable rows of partner vendors: name (required), scope of work, work order value. */
function VendorList({ vendors, onChange }: { vendors: PartnerVendor[]; onChange: (v: PartnerVendor[]) => void }) {
  const update = (i: number, patch: Partial<PartnerVendor>) => onChange(vendors.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <div className="space-y-2">
      {vendors.length > 0 && (
        <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_10rem_2rem] gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid">
          <span>Vendor name *</span><span>Scope of work</span><span>Work order value (₹)</span><span />
        </div>
      )}
      {vendors.map((v, i) => (
        <div key={i} className="grid gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_10rem_2rem] sm:border-0 sm:bg-transparent sm:p-0">
          <Input required maxLength={200} aria-label={`Vendor ${i + 1} name`} placeholder="Firm name" value={v.name} onChange={(e) => update(i, { name: e.target.value })} />
          <Input maxLength={500} aria-label={`Vendor ${i + 1} scope`} placeholder="e.g. Website hosting, DGPS survey" value={v.scope ?? ""} onChange={(e) => update(i, { scope: e.target.value || null })} />
          <Input type="number" min={0} step="0.01" aria-label={`Vendor ${i + 1} work order value`} placeholder="Optional" value={v.amount ?? ""} onChange={(e) => update(i, { amount: e.target.value === "" ? null : Number(e.target.value) })} />
          <button type="button" onClick={() => onChange(vendors.filter((_, j) => j !== i))} aria-label={`Remove vendor ${i + 1}`} className="flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...vendors, { name: "", scope: null, amount: null }])}>
        <Plus className="h-4 w-4" />Add vendor
      </Button>
    </div>
  );
}
