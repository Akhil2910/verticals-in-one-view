import { describe, it, expect } from "vitest";
import { yetToReceive, progressNotApplicable } from "./data";

describe("amount yet to be received", () => {
  it("is sanctioned minus received", () => {
    expect(yetToReceive({ total_cost: 1000000, amount_received: 250000 })).toBe(750000);
  });
  it("never goes below zero", () => {
    expect(yetToReceive({ total_cost: 100, amount_received: 150 })).toBe(0);
  });
});

describe("physical progress applicability", () => {
  it("allows Not applicable for Training & Capacity Building", () => {
    expect(progressNotApplicable({ physical_progress_not_applicable: true }, "Training & Capacity Building")).toBe(true);
    expect(progressNotApplicable({ physical_progress_not_applicable: false }, "Training & Capacity Building")).toBe(false);
  });
  it("retains percentage progress for other verticals", () => {
    expect(progressNotApplicable({ physical_progress_not_applicable: true }, "Research & Development")).toBe(false);
  });
});

import { inDateRange as idr } from "./data";
describe("inDateRange", () => {
  const p = { start_date: "2026-01-10", end_date: "2026-03-31" };
  it("no filter shows all", () => expect(idr({ start_date: null, end_date: null }, "", "")).toBe(true));
  it("overlapping period included", () => expect(idr(p, "2026-03-01", "2026-04-30")).toBe(true));
  it("period after range excluded", () => expect(idr(p, "2025-01-01", "2025-12-31")).toBe(false));
  it("undated project excluded when filtering", () => expect(idr({ start_date: null, end_date: null }, "2026-01-01", "")).toBe(false));
});
