import { describe, expect, it } from "vitest";
import { validatePlayablePolyline } from "@/lib/geo/route-validation";

describe("playable route geometry validation", () => {
  const source = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 50 },
    { x: 30, y: 0, z: 100 },
  ];

  it("accepts a playable line that follows source geometry", () => {
    const result = validatePlayablePolyline(source, source);
    expect(result.valid).toBe(true);
    expect(result.maxDeviationMetres).toBeCloseTo(0);
  });

  it("rejects excessive deviation from the source road", () => {
    const result = validatePlayablePolyline(source, [
      source[0],
      { x: 30, y: 0, z: 50 },
      source[2],
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/deviates/);
  });

  it("rejects self-intersecting geometry", () => {
    const result = validatePlayablePolyline(source, [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 },
      { x: 10, y: 0, z: 0 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/intersect/);
  });
});
