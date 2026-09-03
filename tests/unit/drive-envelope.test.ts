import { describe, expect, it } from "vitest";
import { VEHICLES } from "@/lib/game/vehicles";
import { driveEnvelope } from "@/lib/game/drive-envelope";
import { AutoGearbox } from "@/lib/game/gearbox";
import { resolveAiOpponents } from "@/lib/game/race-setup";
import { stepAiAlongRoad } from "@/lib/game/ai-driver";
import { sampleRoad } from "@/lib/game/road-mesh";
import { createRoadGeometry, createRoadShoulderApronGeometry } from "@/lib/game/road-mesh";
import { getRouteData } from "@/lib/routes/route-registry";

describe("drive envelope parity", () => {
  it("matches the selected garage car for every AI rival", () => {
    for (const vehicleId of ["sports", "f1", "corsa", "gwagon"] as const) {
      const pack = resolveAiOpponents(
        {
          mode: "ai",
          aiCount: 2,
          difficulty: 50,
          ghost: false,
          weather: "clear",
          vehicleId,
          lapCount: 1,
        },
        vehicleId,
      );
      expect(pack.every((car) => car.vehicleId === vehicleId)).toBe(true);
      expect(pack.every((car) => car.paceMul === 1)).toBe(true);
    }
  });

  it("shares the same top speed and accel cap between player math and AI", () => {
    const vehicle = VEHICLES.f1;
    const gearbox = new AutoGearbox("f1");
    const gear = gearbox.step(30, 1, false, 1 / 60);
    const env = driveEnvelope(vehicle, 30, gear.torqueMul);
    expect(env.maxSpeedMs).toBeCloseTo(
      vehicle.tuning.maxSpeedMul * 43,
    );
    expect(env.accelMs2).toBeGreaterThan(0);
    expect(env.brakeMs2).toBeGreaterThan(env.accelMs2 * 0.8);
  });

  it("AI uses the same gearbox torque band as the player", () => {
    const route = getRouteData("westminster-sprint");
    const samples = sampleRoad(route!.roadPoints, 10);
    const vehicle = VEHICLES.sports;
    const gearbox = new AutoGearbox("sports");
    let speed = 0;
    for (let i = 0; i < 120; i += 1) {
      const step = stepAiAlongRoad(
        samples,
        20 + i * 0.4,
        vehicle,
        1,
        1 / 60,
        true,
        2.1,
        undefined,
        speed,
        0.5,
        1,
        gearbox,
      );
      speed = step.speedMs;
    }
    expect(speed).toBeGreaterThan(12);
    expect(speed).toBeLessThanOrEqual(vehicle.tuning.maxSpeedMul * 43 + 0.01);
  });
});

describe("road deck", () => {
  it("builds a thin flat deck without deep trench sides", () => {
    const samples = sampleRoad(
      [
        { x: 0, y: 0, z: 0, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 50, width: 10, banking: 0, surfaceType: "asphalt" },
        { x: 0, y: 0, z: 100, width: 10, banking: 0, surfaceType: "asphalt" },
      ],
      8,
    );
    const deck = createRoadGeometry(samples);
    const apron = createRoadShoulderApronGeometry(samples);
    expect(deck.getAttribute("position").count).toBeGreaterThan(8);
    expect(apron.getAttribute("position").count).toBeGreaterThan(8);
    deck.dispose();
    apron.dispose();
  });
});
