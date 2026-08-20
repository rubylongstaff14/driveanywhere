import { describe, expect, it } from "vitest";
import {
  buildRouteIntroPath,
  maxIntroStep,
  ROUTE_INTRO_SECONDS,
  sampleIntroPath,
} from "@/lib/game/route-intro";
import { getRouteBounds, sampleRoad } from "@/lib/game/road-mesh";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

describe("route intro", () => {
  it("lasts seven seconds before the start lights", () => {
    expect(ROUTE_INTRO_SECONDS).toBe(9.5);
  });

  it("builds a smooth spline fly-through for every bundled circuit", () => {
    for (const slug of getRouteDataSlugs()) {
      const route = getRouteData(slug);
      expect(route).not.toBeNull();
      const samples = sampleRoad(route!.roadPoints, 10);
      const path = buildRouteIntroPath(route!, samples, {
        position: samples[0].position,
        yaw: 0,
      });

      expect(path.position.points.length).toBeGreaterThanOrEqual(7);
      expect(path.lookAt.points.length).toBe(path.position.points.length);

      const bounds = getRouteBounds(route!);
      const span = Math.max(
        bounds.maxX - bounds.minX,
        bounds.maxZ - bounds.minZ,
        120,
      );

      const mid = sampleIntroPath(path, 0.5);
      expect(Number.isFinite(mid.position.x)).toBe(true);
      expect(Number.isFinite(mid.lookAt.y)).toBe(true);
      expect(mid.fov).toBeGreaterThan(48);
      expect(mid.fov).toBeLessThan(72);

      const grid = sampleIntroPath(path, 1);
      expect(grid.position.distanceTo(grid.lookAt)).toBeGreaterThan(4);

      // No harsh jumps along the eased spline.
      expect(maxIntroStep(path, 64)).toBeLessThan(span * 0.14);
    }
  });
});
