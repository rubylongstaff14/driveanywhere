import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import { aabbAsphaltClearance } from "@/lib/game/building-road-clearance";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

describe("building AABB vs asphalt", () => {
  it("keeps every published route free of on-track building boxes", () => {
    for (const slug of getRouteDataSlugs()) {
      const route = getRouteData(slug);
      expect(route).not.toBeNull();
      const samples = sampleRoad(route!.roadPoints, 10);
      for (const b of route!.buildings) {
        let minX = Infinity,
          maxX = -Infinity,
          minZ = Infinity,
          maxZ = -Infinity;
        for (const p of b.footprint) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minZ = Math.min(minZ, p.z);
          maxZ = Math.max(maxZ, p.z);
        }
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const hw = Math.max(0.9, (maxX - minX) / 2);
        const hd = Math.max(0.9, (maxZ - minZ) / 2);
        const clear = aabbAsphaltClearance(samples, cx, cz, hw, hd);
        expect(
          clear,
          `${slug} building ${b.name || b.id} AABB on road (clear=${clear})`,
        ).toBeGreaterThanOrEqual(0.5);
      }
    }
  });
});
