import { describe, expect, it } from "vitest";
import {
  claimPaintHex,
  isPaintHexTaken,
  normalizePaintHex,
} from "@/lib/multiplayer/race-colors";
import {
  availablePaints,
  stockIdsFor,
} from "@/lib/game/cosmetics";
import {
  compactPathSamples,
  progressAlongRoad,
  timeAtProgress,
} from "@/lib/game/route-progress";

describe("paint claims", () => {
  it("normalises hex paints", () => {
    expect(normalizePaintHex("#AbCdEf")).toBe("#abcdef");
    expect(normalizePaintHex("red")).toBeNull();
  });

  it("blocks taken paints for other players", () => {
    const players = [
      { id: "a", paint: "#c8102e" },
      { id: "b", paint: "#1a2744" },
    ];
    expect(isPaintHexTaken(players, "#c8102e", "c")).toBe(true);
    expect(isPaintHexTaken(players, "#c8102e", "a")).toBe(false);
    expect(claimPaintHex(players, "#c8102e", ["#c8102e", "#10b981"])).toBe(
      "#10b981",
    );
  });
});

describe("available paints", () => {
  it("includes base paints without unlocks", () => {
    const base = availablePaints("sports", stockIdsFor("sports"));
    expect(base.length).toBeGreaterThanOrEqual(2);
    expect(base.every((p) => p.slot === "paint")).toBe(true);
  });

  it("adds unlocked legendary paints to the picker", () => {
    const unlocked = [...stockIdsFor("sports"), "sports-paint-obsidian"];
    const paints = availablePaints("sports", unlocked);
    expect(paints.some((p) => p.id === "sports-paint-obsidian")).toBe(true);
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
