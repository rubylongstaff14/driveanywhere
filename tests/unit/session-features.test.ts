import { describe, expect, it } from "vitest";
import {
  GhostRecorder,
  sampleGhostPose,
  type GhostTape,
} from "@/lib/game/ghost-tape";
import {
  createCentreLineGeometry,
  createDirectionArrowGeometry,
  createRumbleHatchGeometry,
  createWheelPathGeometry,
  sampleRoad,
} from "@/lib/game/road-mesh";
import {
  isSectorEnd,
  sectorEndCheckpoints,
  sectorIndexForCheckpoint,
  splitToneForSector,
} from "@/lib/game/sectors";
import { weatherGripMul } from "@/lib/game/weather";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

describe("sectors", () => {
  it("splits every bundled circuit into three unique sector ends", () => {
    for (const slug of getRouteDataSlugs()) {
      const route = getRouteData(slug);
      expect(route).not.toBeNull();
      const n = route!.checkpoints.length;
      const ends = sectorEndCheckpoints(n);
      expect(new Set(ends).size).toBe(3);
      expect(ends[0]).toBeGreaterThanOrEqual(0);
      expect(ends[1]).toBeGreaterThan(ends[0]);
      expect(ends[2]).toBe(n - 1);
      expect(isSectorEnd(0, n)).toBe(ends[0] === 0);
      expect(isSectorEnd(ends[1], n)).toBe(true);
      expect(sectorIndexForCheckpoint(ends[2], n)).toBe(2);
    }
  });

  it("colours splits purple / green / red without inventing a delta", () => {
    expect(splitToneForSector(12000, null, null)).toBeNull();
    expect(splitToneForSector(11000, 12000, 13000)).toBe("purple");
    expect(splitToneForSector(12500, 12000, 13000)).toBe("green");
    expect(splitToneForSector(14000, 12000, 13000)).toBe("red");
  });
});

describe("ghost tape", () => {
  it("lerps pose between recorded frames", () => {
    const tape: GhostTape = {
      routeId: "test",
      vehicleId: "sports",
      totalMs: 1000,
      sectorMs: [400, 700, 1000],
      frames: [
        { t: 0, x: 0, y: 1, z: 0, yaw: 0 },
        { t: 1000, x: 10, y: 1, z: 20, yaw: 0 },
      ],
    };
    const mid = sampleGhostPose(tape, 500);
    expect(mid).not.toBeNull();
    expect(mid!.x).toBeCloseTo(5);
    expect(mid!.z).toBeCloseTo(10);
  });

  it("records after the clock starts and finishes a tape", () => {
    const recorder = new GhostRecorder();
    for (let i = 0; i < 30; i += 1) {
      recorder.sample(i * 50, i, 0.4, i * 2, 0.1);
    }
    recorder.markSector(400);
    recorder.markSector(900);
    recorder.markSector(1400);
    const tape = recorder.finish("route-a", "sports", 1400);
    expect(tape).not.toBeNull();
    expect(tape!.frames.length).toBeGreaterThan(8);
    expect(tape!.sectorMs).toEqual([400, 900, 1400]);
  });
});

describe("weather grip", () => {
  it("keeps dry weather at full grip and rain below it", () => {
    expect(weatherGripMul("clear")).toBe(1);
    expect(weatherGripMul("dusk")).toBe(1);
    expect(weatherGripMul("night")).toBeLessThan(1);
    expect(weatherGripMul("rain")).toBeLessThan(weatherGripMul("night"));
  });
});

describe("road markings", () => {
  it("paints centre line, wheel paths, rumble and arrows on a 10 m street", () => {
    const samples = sampleRoad(
      [
        { x: 0, y: 0, z: 0, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 40, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 80, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 160, width: 10, banking: 0, surfaceType: "asphalt" },
      ],
      8,
    );
    const centre = createCentreLineGeometry(samples);
    const paths = createWheelPathGeometry(samples);
    const rumble = createRumbleHatchGeometry(samples);
    const arrows = createDirectionArrowGeometry(samples);
    expect(centre.getAttribute("position").count).toBeGreaterThan(8);
    expect(paths.getAttribute("position").count).toBeGreaterThan(8);
    expect(rumble.getAttribute("position").count).toBeGreaterThan(8);
    expect(arrows.getAttribute("position").count).toBeGreaterThan(2);
    centre.dispose();
    paths.dispose();
    rumble.dispose();
    arrows.dispose();
  });
});
