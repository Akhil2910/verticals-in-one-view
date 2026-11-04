import { describe, expect, it } from "vitest";
import { attention, financialYears, fyOf, fyRange, isMeaningful, monthlyTrend } from "./insights";
import type { Project } from "./types";

const base: Project = {
  id: "x", vertical_id: "v", name: "P", project_head: null, team_members: null, start_date: null, end_date: null,
  status: "Ongoing", progress_notes: null, physical_progress: 0, physical_progress_not_applicable: false,
  milestones_completed: null, milestones_pending: null, total_cost: 0, amount_received: 0, expenditure: 0,
  amount_receivable: 0, expected_completion: null, issues: null, other_info: null, participants: null, client_name: null, partner_vendors: [],
  updated_by: null, updated_by_name: null, created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-30T00:00:00.000Z",
};
const p = (o: Partial<Project>): Project => ({ ...base, id: Math.random().toString(36), ...o });
const today = new Date("2026-11-02T10:00:00Z");

describe("attention", () => {
  it("flags ongoing work past its expected completion, falling back to the end date", () => {
    const a = attention([p({ expected_completion: "2026-10-31" }), p({ end_date: "2026-11-01" }), p({ expected_completion: "2026-11-05" })], today);
    expect(a.overdue).toHaveLength(2);
    expect(a.dueSoon).toHaveLength(1);
  });
  it("does not call completed projects overdue, but lists money still due on them", () => {
    const a = attention([p({ status: "Completed", end_date: "2026-01-01", total_cost: 100, amount_received: 40 })], today);
    expect(a.overdue).toHaveLength(0);
    expect(a.duesOnCompleted).toHaveLength(1);
  });
  it("treats records untouched for 30+ days as stale", () => {
    expect(attention([p({ updated_at: "2026-09-01T00:00:00.000Z" })], today).stale).toHaveLength(1);
  });
  it("ignores placeholder issue text", () => {
    expect(isMeaningful("NA")).toBe(false);
    expect(isMeaningful(" - ")).toBe(false);
    expect(isMeaningful("Receipt of the PO awaited")).toBe(true);
  });
});

describe("financial years", () => {
  it("runs April to March", () => {
    expect(fyOf("2026-03-31")).toBe("2025-26");
    expect(fyOf("2026-04-01")).toBe("2026-27");
    expect(fyRange("2025-26")).toEqual({ from: "2025-04-01", to: "2026-03-31" });
  });
  it("lists every year with activity plus the current one, newest first", () => {
    expect(financialYears([p({ start_date: "2025-02-26" })], today)).toEqual(["2026-27", "2024-25"]);
  });
});

describe("monthly trend", () => {
  it("counts projects and participants by commencement month", () => {
    const t = monthlyTrend([p({ start_date: "2026-04-04", participants: 22 }), p({ start_date: "2026-04-16", participants: 29, status: "Completed" }), p({})]);
    expect(t).toEqual([{ month: "2026-04", started: 2, completed: 1, participants: 51 }]);
  });
  it("fills quiet months with zeros, across the year end", () => {
    const t = monthlyTrend([p({ start_date: "2025-11-10" }), p({ start_date: "2026-02-01" })]);
    expect(t.map((d) => [d.month, d.started])).toEqual([["2025-11", 1], ["2025-12", 0], ["2026-01", 0], ["2026-02", 1]]);
  });
});
