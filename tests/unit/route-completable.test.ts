import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import { RoadTracker } from "@/lib/game/road-tracker";
import {
  barrierMinClearance,
  buildTrackBarriers,
} from "@/lib/game/track-barriers";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

describe.each(getRouteDataSlugs())("completable without obstruction: %s", (slug) => {
  const route = getRouteData(slug);
  if (!route) throw new Error(`Missing route ${slug}`);
  const samples = sampleRoad(route.roadPoints, 10);
  const tracker = new RoadTracker(samples);
  const walls = buildTrackBarriers(samples);

  it("keeps every barrier outside the racing line", () => {
    expect(walls.length).toBeGreaterThan(20);
    for (const wall of walls) {
      const clear = barrierMinClearance(samples, wall);
      // Distance outside the asphalt edge — car half (~1 m) + margin.
      expect(clear).toBeGreaterThanOrEqual(1.2);
    }
  });

  it("leaves the centreline driveable", () => {
    for (let i = 0; i < samples.length; i += 3) {
      const s = samples[i];
      for (const wall of walls) {
        const yaw = wall.rot[1];
        const tx = Math.sin(yaw);
        const tz = Math.cos(yaw);
        const ax = wall.pos[0] - tx * wall.hl;
        const az = wall.pos[2] - tz * wall.hl;
        const bx = wall.pos[0] + tx * wall.hl;
        const bz = wall.pos[2] + tz * wall.hl;
        const abx = bx - ax;
        const abz = bz - az;
        const lenSq = abx * abx + abz * abz || 1;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((s.position.x - ax) * abx + (s.position.z - az) * abz) / lenSq,
          ),
        );
        const dist = Math.hypot(
          s.position.x - (ax + abx * t),
          s.position.z - (az + abz * t),
        );
        expect(dist).toBeGreaterThan(s.width / 2);
      }
    }
  });

  it("orders checkpoints so a lap can finish", () => {
    const sorted = [...route.checkpoints].sort((a, b) => a.index - b.index);
    let last = -1;
    for (const cp of sorted) {
      const hit = tracker.nearest(cp.position.x, cp.position.z);
      expect(hit.distance).toBeLessThanOrEqual(route.roadWidth / 2 + 2);
      expect(hit.index).toBeGreaterThanOrEqual(last);
      last = hit.index;
    }
  });
});
