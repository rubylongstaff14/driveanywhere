import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import {
  buildAlpineCliffs,
  buildAlpineTerrainPads,
} from "@/lib/game/alpine-terrain";
import { getRouteData } from "@/lib/routes/route-registry";

describe("alpine terrain", () => {
  it("builds shoulder pads and cliff walls on the mountain pass", () => {
    const route = getRouteData("alps-mountain-pass");
    expect(route).not.toBeNull();
    const samples = sampleRoad(route!.roadPoints, 10);
    const pads = buildAlpineTerrainPads(samples, route!.roadWidth);
    const cliffs = buildAlpineCliffs(samples, route!.roadWidth);
    expect(pads.length).toBeGreaterThan(10);
    expect(cliffs.length).toBeGreaterThan(20);
    for (const block of [...pads, ...cliffs]) {
      expect(block.halfExtents.every((v) => v > 0)).toBe(true);
      expect(block.pos[1]).toBeGreaterThan(0);
    }
  });
});
