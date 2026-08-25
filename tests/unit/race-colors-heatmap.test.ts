import { describe, expect, it } from "vitest";
import {
  isRaceHexTaken,
  nextFreeRaceHex,
  normalizeRaceHex,
  RACE_COLORS,
} from "@/lib/multiplayer/race-colors";
import {
  compactPathSamples,
  progressAlongRoad,
  timeAtProgress,
} from "@/lib/game/route-progress";

describe("race colours", () => {
  it("normalises only the universal palette", () => {
    expect(normalizeRaceHex(RACE_COLORS[1].hex)).toBe(
      RACE_COLORS[1].hex.toLowerCase(),
    );
    expect(normalizeRaceHex("#abcdef")).toBeNull();
  });

  it("blocks taken colours for other players", () => {
    const players = [
      { id: "a", paint: RACE_COLORS[0].hex },
      { id: "b", paint: RACE_COLORS[1].hex },
    ];
    expect(isRaceHexTaken(players, RACE_COLORS[0].hex, "c")).toBe(true);
    expect(isRaceHexTaken(players, RACE_COLORS[0].hex, "a")).toBe(false);
    expect(nextFreeRaceHex(players)).toBe(RACE_COLORS[2].hex);
  });
});

describe("route progress", () => {
  const road = [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
    { x: 100, z: 100 },
  ];

  it("maps position to arc-length progress", () => {
    expect(progressAlongRoad(road, 50, 0)).toBeCloseTo(0.25, 2);
    expect(progressAlongRoad(road, 100, 50)).toBeCloseTo(0.75, 2);
  });

  it("compacts and interpolates path samples", () => {
    const raw = Array.from({ length: 40 }, (_, i) => ({
      p: i / 39,
      t: i * 100,
    }));
    const path = compactPathSamples(raw, 16);
    expect(path.length).toBeLessThanOrEqual(18);
    expect(path[0].p).toBe(0);
    expect(path[path.length - 1].p).toBe(1);
    const mid = timeAtProgress(path, 0.5);
    expect(mid).not.toBeNull();
    expect(mid!).toBeGreaterThan(1000);
    expect(mid!).toBeLessThan(3000);
  });
});
