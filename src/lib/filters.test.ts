import { describe, expect, it } from "vitest";
import { applyFilters, parseFilters, periodLabel, presetRange } from "./filters";
import type { Project } from "./types";

const today = new Date("2026-11-03T10:00:00");

describe("relative periods", () => {
  it("this month and last month are whole calendar months", () => {
    expect(presetRange("this-month", today)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(presetRange("last-month", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
  it("last 3 months include the current one", () => {
    expect(presetRange("last-3-months", today)).toEqual({ from: "2026-09-01", to: "2026-11-30" });
  });
  it("quarters follow the Indian financial year, across the year end", () => {
    expect(presetRange("this-quarter", today)).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(presetRange("last-quarter", today)).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(presetRange("last-quarter", new Date("2026-02-10T10:00:00"))).toEqual({ from: "2025-10-01", to: "2025-12-31" });
  });
  it("labels read naturally", () => {
    expect(periodLabel({ p: "this-month" }, today)).toBe("November 2026");
    expect(periodLabel({ p: "this-quarter" }, today)).toMatch(/^Q3 FY 2026-27/);
    expect(periodLabel({}, today)).toBe("All time");
  });
  it("a preset in the URL wins over stale dates", () => {
    expect(parseFilters({ p: "this-month", fy: "2025-26", from: "2025-01-01" })).toMatchObject({ p: "this-month", fy: undefined, from: undefined });
  });
});

describe("client filter", () => {
  const mk = (client_name: string | null) => ({ id: client_name ?? "x", vertical_id: "v", status: "Ongoing", name: "P", start_date: null, end_date: null, client_name, partner_vendors: [] }) as unknown as Project;
  it("matches regardless of case and spacing", () => {
    const r = applyFilters([mk("O/o  CDMA"), mk("TUFIDC"), mk(null)], { c: "o/o cdma" }, { today });
    expect(r.map((p) => p.client_name)).toEqual(["O/o  CDMA"]);
  });
});
