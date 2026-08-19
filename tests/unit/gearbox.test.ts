import { describe, expect, it } from "vitest";
import {
  AutoGearbox,
  getGearboxProfile,
  torqueCurve,
} from "@/lib/game/gearbox";

describe("automatic gearbox", () => {
  it("starts in first and builds rpm under throttle", () => {
    const box = new AutoGearbox("sports");
    const state = box.step(2, 1, false, 1 / 60);
    expect(state.gear).toBeGreaterThanOrEqual(1);
    expect(state.rpm).toBeGreaterThan(800);
  });

  it("sports has 6 gears and reaches higher ratios before top speed", () => {
    expect(getGearboxProfile("sports").ratios).toHaveLength(6);
    const box = new AutoGearbox("sports");
    let gear = 1;
    for (let i = 0; i < 400; i += 1) {
      const speed = Math.min(43, i * 0.12);
      const state = box.step(speed, 1, false, 1 / 60);
      gear = Math.max(gear, state.gear);
    }
    expect(gear).toBeGreaterThanOrEqual(4);
  });

  it("corsa and gwagon are 6-speed", () => {
    expect(getGearboxProfile("corsa").ratios).toHaveLength(6);
    expect(getGearboxProfile("gwagon").ratios).toHaveLength(6);
  });

  it("f1 is 8-speed and climbs the stack at race pace", () => {
    expect(getGearboxProfile("f1").ratios).toHaveLength(8);
    const f1 = new AutoGearbox("f1");
    let maxGear = 1;
    for (let i = 0; i < 500; i += 1) {
      const state = f1.step(Math.min(48, i * 0.12), 1, false, 1 / 60);
      maxGear = Math.max(maxGear, state.gear);
    }
    expect(maxGear).toBeGreaterThanOrEqual(6);
  });

  it("cruises below redline at top speed in a tall gear", () => {
    const box = new AutoGearbox("sports");
    let state = box.step(0, 1, false, 1 / 60);
    for (let i = 0; i < 500; i += 1) {
      state = box.step(Math.min(43, i * 0.1), 1, false, 1 / 60);
    }
    expect(state.gear).toBeGreaterThanOrEqual(4);
    expect(state.rpmNorm).toBeLessThan(0.9);
  });

  it("torque curve is stronger mid-band than at idle", () => {
    expect(torqueCurve(0.05, 1)).toBeLessThan(torqueCurve(0.6, 1));
  });
});
