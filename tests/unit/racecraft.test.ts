import { describe, expect, it } from "vitest";
import {
  balanceState,
  kerbUse,
  slipstreamStrength,
} from "@/lib/game/racecraft";

describe("racecraft", () => {
  it("rewards a close centred slipstream without an abrupt cone edge", () => {
    expect(slipstreamStrength(8, 0.98)).toBeGreaterThan(0.8);
    expect(slipstreamStrength(20, 0.8)).toBeGreaterThan(0);
    expect(slipstreamStrength(25, 1)).toBe(0);
    expect(slipstreamStrength(8, 0.5)).toBe(0);
  });

  it("distinguishes useful kerb from leaving the circuit", () => {
    expect(kerbUse(6.2, 14)).toEqual({ onKerb: true, excessive: false });
    expect(kerbUse(7.7, 14)).toEqual({ onKerb: false, excessive: true });
    expect(kerbUse(3, 14)).toEqual({ onKerb: false, excessive: false });
  });

  it("communicates longitudinal weight transfer simply", () => {
    expect(balanceState(0, 1)).toBe("braking");
    expect(balanceState(1, 0)).toBe("power");
    expect(balanceState(0, 0)).toBe("balanced");
  });
});
