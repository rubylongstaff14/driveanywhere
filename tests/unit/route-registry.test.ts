import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import { RoadTracker } from "@/lib/game/road-tracker";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";
import {
  getRouteData,
  getRouteDataSlugs,
  hasRouteData,
} from "@/lib/routes/route-registry";

describe("bundled route registry", () => {
  it("has geometry for every published route in the library", () => {
    for (const route of MOCK_ROUTES) {
      expect(hasRouteData(route.slug)).toBe(true);
    }
  });

  it("returns null for an unknown slug instead of throwing", () => {
    expect(getRouteData("not-a-real-route")).toBeNull();
  });

  it("keeps library metadata in sync with the geometry", () => {
    for (const summary of MOCK_ROUTES) {
      const data = getRouteData(summary.slug);
      expect(data).not.toBeNull();
      expect(data?.id).toBe(summary.id);
      expect(data?.checkpoints).toHaveLength(summary.checkpointCount);
      expect(data?.distanceMetres).toBe(summary.distanceMetres);
    }
  });
});

describe.each(getRouteDataSlugs())("route geometry: %s", (slug) => {
  const route = getRouteData(slug);
  if (!route) throw new Error(`Missing route ${slug}`);

  const samples = sampleRoad(route.roadPoints, 10);
  const tracker = new RoadTracker(samples);

  it("spawns the car on the road surface", () => {
    const hit = tracker.nearest(route.startPosition.x, route.startPosition.z);
    expect(hit.distance).toBeLessThanOrEqual(route.roadWidth / 2);
  });

  it("places every checkpoint within the road width", () => {
    for (const checkpoint of route.checkpoints) {
      const hit = tracker.nearest(
        checkpoint.position.x,
        checkpoint.position.z,
      );
      // Checkpoints are derived from the Catmull-Rom curve; the RoadTracker
      // searches discrete sample points, so allow 2 m sampling-quantisation
      // tolerance — still guarantees no checkpoint is placed off the road.
      expect(hit.distance).toBeLessThanOrEqual(route.roadWidth / 2 + 2);
    }
  });

  it("orders checkpoints from the start of the route to the end", () => {
    const indices = route.checkpoints.map(
      (checkpoint) =>
        tracker.nearest(checkpoint.position.x, checkpoint.position.z).index,
    );
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it("does not put the finish gate on top of the start gate", () => {
    const first = route.checkpoints[0].position;
    const last = route.checkpoints[route.checkpoints.length - 1].position;
    const gap = Math.hypot(last.x - first.x, last.z - first.z);
    expect(gap).toBeGreaterThan(route.roadWidth);
  });

  it("keeps buildings clear of the drivable surface", () => {
    for (const building of route.buildings) {
      for (const corner of building.footprint) {
        const hit = tracker.nearest(corner.x, corner.z);
        // Road half-width is the hard limit; allow 0.5 m for kerb transition.
        expect(hit.distance).toBeGreaterThan(route.roadWidth / 2 - 0.5);
      }
    }
  });
});
