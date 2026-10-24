import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inr, yetToReceive, type Project, type Vertical } from "@/lib/data";
import { STATUSES } from "./projects";

export type ProjectInput = Omit<Project, "id" | "created_at" | "updated_at" | "updated_by" | "updated_by_name">;

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
  milestones_completed: "",
  milestones_pending: "",
  total_cost: 0,
  amount_received: 0,
  expenditure: 0,
  amount_receivable: 0,
  expected_completion: null,
  issues: "",
  other_info: "",
};

export function ProjectForm({
  initial,
  verticals,
  lockedVertical,
  onSubmit,
  busy,
}: {
  initial?: Partial<ProjectInput>;
  verticals: Vertical[];
  lockedVertical?: string | null;
  onSubmit: (v: ProjectInput) => void;
  busy?: boolean;
}) {
  const [f, setF] = useState<ProjectInput>({ ...empty, ...initial, vertical_id: lockedVertical ?? initial?.vertical_id ?? "" });
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const txt = (k: keyof ProjectInput) => ({ value: (f[k] as string) ?? "", onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) });
  const date = (k: keyof ProjectInput) => ({ type: "date", value: (f[k] as string) ?? "", onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never) });
  const num = (k: keyof ProjectInput) => ({ type: "number", min: 0, step: "0.01", value: String(f[k] ?? 0), onChange: (e: { target: { value: string } }) => set(k, Number(e.target.value || 0) as never) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-8"
    >
      <Section title="Basic details">
        <Field label="1. Name of the Project / Programme *" full><Input required maxLength={300} {...txt("name")} /></Field>
        <Field label="2. Vertical *">
          <select required disabled={!!lockedVertical} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.vertical_id} onChange={(e) => set("vertical_id", e.target.value)}>
            <option value="">Select…</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="3a. Project Head"><Input {...txt("project_head")} /></Field>
        <Field label="3b. Team Members" full><Textarea rows={2} {...txt("team_members")} /></Field>
        <Field label="4a. Date of commencement"><Input {...date("start_date")} /></Field>
        <Field label="4b. Proposed / completed date"><Input {...date("end_date")} /></Field>
      </Section>

      <Section title="Status & progress">
        <Field label="5. Current status">
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="6. Physical work completed (%)"><Input type="number" min={0} max={100} value={String(f.physical_progress)} onChange={(e) => set("physical_progress", Math.min(100, Math.max(0, Number(e.target.value || 0))))} /></Field>
        <Field label="5. Progress notes" full><Textarea rows={2} {...txt("progress_notes")} /></Field>
        <Field label="7. Key activities / milestones completed" full><Textarea rows={3} {...txt("milestones_completed")} /></Field>
        <Field label="8. Activities / milestones pending" full><Textarea rows={3} {...txt("milestones_pending")} /></Field>
        {f.status !== "Completed" && <Field label="14. Expected date of completion"><Input {...date("expected_completion")} /></Field>}
      </Section>

      <Section title="Financials (₹)">
        <Field label="9. Total Project Cost / Sanctioned Amount"><Input {...num("total_cost")} /></Field>
        <Field label="10. Amount received"><Input {...num("amount_received")} /></Field>
        <Field label="11. Amount yet to be received"><div className="flex h-9 items-center rounded-md bg-muted px-3 text-sm">{inr(yetToReceive(f))}</div></Field>
        <Field label="12. Expenditure incurred"><Input {...num("expenditure")} /></Field>
        <Field label="13. Amount receivable"><Input {...num("amount_receivable")} /></Field>
      </Section>

      <Section title="Other">
        <Field label="15. Major issues, constraints or pending matters" full><Textarea rows={3} {...txt("issues")} /></Field>
        <Field label="16. Any other relevant information" full><Textarea rows={3} {...txt("other_info")} /></Field>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save project"}</Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-md border bg-card p-5">
      <legend className="px-2 font-serif text-base font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
