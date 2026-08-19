import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import {
  countBlockingRibbonOverlaps,
  findTrackOverpasses,
} from "@/lib/game/track-overpasses";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

function maxGradient(samples: ReturnType<typeof sampleRoad>): number {
  let maxG = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1].position;
    const b = samples[i].position;
    const h = Math.hypot(b.x - a.x, b.z - a.z);
    if (h < 0.2) continue;
    maxG = Math.max(maxG, Math.abs(b.y - a.y) / h);
  }
  return maxG;
}

describe.each(getRouteDataSlugs())("playable circuit: %s", (slug) => {
  const route = getRouteData(slug);
  if (!route) throw new Error(`Missing route ${slug}`);
  const samples = sampleRoad(route.roadPoints, 10);

  it("keeps a clear racing ribbon (or elevated overpass separation)", () => {
    expect(countBlockingRibbonOverlaps(samples)).toBe(0);
  });

  it("keeps gradients driveable", () => {
    expect(maxGradient(samples)).toBeLessThanOrEqual(0.22);
  });

  it("starts the car at ground level", () => {
    expect(route.startPosition.y).toBe(0);
    expect(samples[0]?.position.y ?? 0).toBe(0);
  });

  it("has a usable road width", () => {
    expect(route.roadWidth).toBeGreaterThanOrEqual(14);
  });

  it("places flyover arches with clearance above the car", () => {
    const passes = findTrackOverpasses(samples);
    for (const pass of passes) {
      expect(pass.clearance).toBeGreaterThanOrEqual(5);
      expect(pass.roadY).toBeGreaterThanOrEqual(0);
    }
  });
});
