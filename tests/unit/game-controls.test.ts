import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createControlState, InputSampler } from "@/lib/game/controls";
import { GAME_CONSTANTS } from "@/lib/game/constants";
import { RoadTracker } from "@/lib/game/road-tracker";
import { sampleRoad } from "@/lib/game/road-mesh";

const straightRoad = sampleRoad(
  [
    { x: 0, y: 0, z: 0, width: 10, banking: 0, surfaceType: "asphalt" },
    { x: 0, y: 0, z: 50, width: 10, banking: 0, surfaceType: "asphalt" },
    { x: 0, y: 0, z: 100, width: 10, banking: 0, surfaceType: "asphalt" },
  ],
  8,
);

describe("game controls helpers", () => {
  it("creates a neutral control state", () => {
    expect(createControlState()).toEqual({
      accelerate: 0,
      brake: 0,
      steer: 0,
      handbrake: false,
      resetPressed: false,
      pausePressed: false,
      cameraPressed: false,
    });
  });

  it("samples empty keyboard state as idle", () => {
    const sampler = new InputSampler();
    expect(sampler.sample().accelerate).toBe(0);
  });

  it("keeps arcade speed limits sane", () => {
    expect(GAME_CONSTANTS.maxSpeedMs).toBeGreaterThan(
      GAME_CONSTANTS.offRoadMaxSpeedMs,
    );
  });
});

describe("road tracker", () => {
  it("spawns on the first centreline point facing along the road", () => {
    const tracker = new RoadTracker(straightRoad);
    const spawn = tracker.spawn();
    expect(spawn.position.x).toBeCloseTo(0, 3);
    expect(spawn.position.z).toBeCloseTo(0, 3);
    expect(Math.abs(spawn.yaw)).toBeLessThan(0.01);
  });

  it("treats points near the centreline as on-road", () => {
    const tracker = new RoadTracker(straightRoad);
    const hit = tracker.nearest(2, 40);
    expect(tracker.isOnRoad(hit, GAME_CONSTANTS.roadEdgeTolerance)).toBe(true);
  });

  it("treats far points as off-road", () => {
    const tracker = new RoadTracker(straightRoad);
    const hit = tracker.nearest(40, 40);
    expect(tracker.isOnRoad(hit, GAME_CONSTANTS.roadEdgeTolerance)).toBe(false);
  });

  it("reports progress increasing along the route", () => {
    const tracker = new RoadTracker(straightRoad);
    const early = tracker.nearest(0, 5).progress;
    const late = tracker.nearest(0, 95).progress;
    expect(late).toBeGreaterThan(early);
  });

  it("builds a road surface with real geometry", () => {
    expect(straightRoad.length).toBeGreaterThan(8);
    expect(straightRoad[0].position).toBeInstanceOf(THREE.Vector3);
  });

  it("stays on the outbound leg when a return lane runs beside it", () => {
    const outAndBack = sampleRoad(
      [
        { x: 0, y: 0, z: 0, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 80, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 160, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 8, y: 0, z: 160, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 8, y: 0, z: 80, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 8, y: 0, z: 0, width: 10, banking: 0, surfaceType: "asphalt" },
      ],
      8,
    );
    const tracker = new RoadTracker(outAndBack);
    tracker.nearest(0, 12);
    const mid = tracker.nearest(1.5, 90);
    // Must not snap to the inbound lane at x=8, which is closer in places.
    expect(mid.progress).toBeGreaterThan(0.15);
    expect(mid.progress).toBeLessThan(0.55);
  });
});
