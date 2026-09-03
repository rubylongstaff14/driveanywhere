import { describe, expect, it } from "vitest";
import {
  AI_PAINTS,
  MAX_AI_CARS,
  clampAiCount,
  clampDifficulty,
  parseRaceSetup,
  raceSetupSearchParams,
  resolveAiOpponents,
} from "@/lib/game/race-setup";
import {
  aiCruiseSpeed,
  aiLaneOffset,
  aiPersonality,
  aiSkillCornerMul,
  getAiArc,
  peekAiPoint,
  stepAiAlongRoad,
} from "@/lib/game/ai-driver";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import { gripLimitedCornerSpeed } from "@/lib/game/grip";
import { VEHICLES } from "@/lib/game/vehicles";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";
import { sampleRoad } from "@/lib/game/road-mesh";

describe("race setup", () => {
  it("defaults to solo with no opponents", () => {
    const setup = parseRaceSetup({});
    expect(setup).toEqual({
      mode: "solo",
      aiCount: 0,
      difficulty: 50,
      ghost: false,
      weather: "clear",
      vehicleId: "sports",
      lapCount: 1,
    });
    expect(resolveAiOpponents(setup, "sports")).toEqual([]);
    expect(raceSetupSearchParams(setup)).toBe("");
  });

  it("clamps AI count to 1–4 and difficulty to 1–100", () => {
    expect(clampAiCount(0)).toBe(1);
    expect(clampAiCount(99)).toBe(MAX_AI_CARS);
    expect(clampDifficulty(0)).toBe(1);
    expect(clampDifficulty(140)).toBe(100);
  });

  it("parses AI query params and builds unique paints", () => {
    const setup = parseRaceSetup({ mode: "ai", ai: "4", difficulty: "80" });
    expect(setup).toEqual({
      mode: "ai",
      aiCount: 4,
      difficulty: 80,
      ghost: false,
      weather: "clear",
      vehicleId: "sports",
      lapCount: 1,
    });
    const pack = resolveAiOpponents(setup, "sports");
    expect(pack).toHaveLength(4);
    const paints = pack.map((car) => car.paint);
    expect(new Set(paints).size).toBe(4);
    expect(paints).not.toContain("#c8102e");
    expect(paints).toEqual(AI_PAINTS.map((swatch) => swatch.paint));
  });

  it("mirrors the player's car and stats on every rival", () => {
    const setup = parseRaceSetup({ mode: "ai", ai: "3", difficulty: "40" });
    const pack = resolveAiOpponents(setup, "f1");
    expect(pack.every((car) => car.vehicleId === "f1")).toBe(true);
    expect(pack.every((car) => car.paceMul === 1)).toBe(true);
    expect(pack.every((car) => car.skill === 0.4)).toBe(true);
  });

  it("writes a play URL query that round-trips", () => {
    const query = raceSetupSearchParams({
      mode: "ai",
      aiCount: 3,
      difficulty: 40,
      ghost: true,
      weather: "clear",
      vehicleId: "sports",
      lapCount: 1,
    });
    expect(query).toBe("?mode=ai&ai=3&difficulty=40");
    expect(parseRaceSetup(Object.fromEntries(new URLSearchParams(query)))).toEqual({
      mode: "ai",
      aiCount: 3,
      difficulty: 40,
      ghost: false,
      weather: "clear",
      vehicleId: "sports",
      lapCount: 1,
    });
  });

  it("keeps ghost as a solo-only option and round-trips weather", () => {
    const soloGhost = parseRaceSetup({ ghost: "1", weather: "rain" });
    expect(soloGhost).toEqual({
      mode: "solo",
      aiCount: 0,
      difficulty: 50,
      ghost: true,
      weather: "rain",
      vehicleId: "sports",
      lapCount: 1,
    });
    expect(raceSetupSearchParams(soloGhost)).toBe("?ghost=1&weather=rain");
    const withAi = parseRaceSetup({
      mode: "ai",
      ai: "2",
      ghost: "1",
      weather: "night",
    });
    expect(withAi.ghost).toBe(false);
    expect(withAi.weather).toBe("night");
    expect(resolveAiOpponents(withAi, "sports")).toHaveLength(2);
  });

  it("uses host AI count online so every client gets the same pack", () => {
    const setup = parseRaceSetup({
      mode: "online",
      ai: "3",
      difficulty: "85",
      vehicle: "f1",
    });
    expect(setup.mode).toBe("online");
    expect(setup.aiCount).toBe(3);
    expect(setup.vehicleId).toBe("f1");
    const pack = resolveAiOpponents(setup, setup.vehicleId);
    expect(pack).toHaveLength(3);
    expect(pack.every((car) => car.vehicleId === "f1")).toBe(true);
  });

  it("round-trips the optional two-lap distance", () => {
    const setup = parseRaceSetup({ laps: "2" });
    expect(setup.lapCount).toBe(2);
    expect(raceSetupSearchParams(setup)).toBe("?laps=2");
  });
});

describe("hitboxes and AI lanes", () => {
  it("keeps car colliders inside the visible body", () => {
    expect(VEHICLES.sports.collider.halfWidth).toBeLessThanOrEqual(0.95);
    expect(VEHICLES.f1.collider.halfWidth).toBeLessThanOrEqual(0.8);
    expect(VEHICLES.corsa.collider.halfLength).toBeLessThanOrEqual(1.85);
    expect(VEHICLES.gwagon.collider.halfWidth).toBeLessThanOrEqual(1.05);
  });

  it("offsets AI off the centreline so they miss the player box", () => {
    const offsets = [0, 1, 2, 3].map(aiLaneOffset);
    expect(offsets.every((n) => Math.abs(n) >= 2.1)).toBe(true);
    expect(new Set(offsets).size).toBe(4);
  });

  it("samples AI poses without leaving the ribbon", () => {
    const route = getRouteData("westminster-sprint");
    expect(route).not.toBeNull();
    const samples = sampleRoad(route!.roadPoints, 10);
    const arc = getAiArc(samples);
    const pose = peekAiPoint(samples, 40, aiLaneOffset(0));
    expect(Number.isFinite(pose.x)).toBe(true);
    expect(pose.y).toBeGreaterThanOrEqual(0);
    expect(arc.total).toBeGreaterThan(200);
  });

  it("moves along the road when racing and holds still when not", () => {
    const route = getRouteData("westminster-sprint");
    const samples = sampleRoad(route!.roadPoints, 10);
    const idle = stepAiAlongRoad(
      samples,
      12,
      VEHICLES.sports,
      1,
      1 / 60,
      false,
    );
    expect(idle.distanceM).toBe(12);
    expect(idle.speedMs).toBe(0);
    let dist = 12;
    let speed = 0;
    for (let i = 0; i < 90; i += 1) {
      const step = stepAiAlongRoad(
        samples,
        dist,
        VEHICLES.sports,
        0.9,
        1 / 60,
        true,
        2.1,
        getAiArc(samples),
        speed,
      );
      dist = step.distanceM;
      speed = step.speedMs;
    }
    expect(dist).toBeGreaterThan(20);
    expect(speed).toBeGreaterThan(8);
  });

  it("uses the same grip-limited corner speed as the player", () => {
    const top = C.maxSpeedMs * VEHICLES.sports.tuning.maxSpeedMul;
    const hairpin = 22;
    const limit = gripLimitedCornerSpeed(hairpin, VEHICLES.sports.tuning.gripMul);
    expect(aiCruiseSpeed(VEHICLES.sports, 1, 2400)).toBeCloseTo(top);
    expect(aiCruiseSpeed(VEHICLES.sports, 1, hairpin)).toBeCloseTo(limit);
    expect(aiCruiseSpeed(VEHICLES.sports, 1, hairpin, 0.78)).toBeLessThan(limit);
    expect(limit).toBeLessThan(top * 0.85);
    expect(aiCruiseSpeed(VEHICLES.f1, 1, hairpin)).toBeCloseTo(
      gripLimitedCornerSpeed(hairpin, VEHICLES.f1.tuning.gripMul),
    );
  });

  it("uses the same power but backs off corners at lower skill", () => {
    expect(aiSkillCornerMul(0)).toBeCloseTo(0.62);
    expect(aiSkillCornerMul(0.5)).toBeCloseTo(0.83);
    expect(aiSkillCornerMul(1)).toBeGreaterThan(0.99);
    const hairpin = 22;
    const limit = gripLimitedCornerSpeed(hairpin, VEHICLES.sports.tuning.gripMul);
    expect(limit * aiSkillCornerMul(0.5)).toBeLessThan(limit * 0.9);
    expect(aiCruiseSpeed(VEHICLES.sports, 1, 2400)).toBeCloseTo(
      C.maxSpeedMs * VEHICLES.sports.tuning.maxSpeedMul,
    );
  });

  it("assigns stable driving personalities across the AI grid", () => {
    expect([0, 1, 2, 3, 4].map(aiPersonality)).toEqual([
      "smooth",
      "late-braker",
      "defensive",
      "charger",
      "smooth",
    ]);
  });
});

describe("route geometry readiness", () => {
  it("bundles all nine playable circuits", () => {
    const slugs = getRouteDataSlugs();
    expect(slugs).toHaveLength(9);
    for (const slug of slugs) {
      const data = getRouteData(slug);
      expect(data?.roadPoints.length).toBeGreaterThan(8);
      expect(data?.checkpoints.length).toBeGreaterThan(4);
    }
  });
});
