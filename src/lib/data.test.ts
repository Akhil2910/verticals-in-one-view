import { describe, it, expect } from "vitest";
import { yetToReceive } from "./data";

describe("amount yet to be received", () => {
  it("is sanctioned minus received", () => {
    expect(yetToReceive({ total_cost: 1000000, amount_received: 250000 })).toBe(750000);
  });
  it("never goes below zero", () => {
    expect(yetToReceive({ total_cost: 100, amount_received: 150 })).toBe(0);
  });
});
