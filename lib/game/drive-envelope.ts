import * as THREE from "three";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import type { VehicleDef } from "@/lib/game/vehicles";

/** Shared top speed / accel / brake — player physics and AI both read this. */
export function driveEnvelope(
  vehicle: Pick<VehicleDef, "tuning" | "mass">,
  speedMs: number,
  torqueMul: number,
  paceMul = 1,
): {
  maxSpeedMs: number;
  inertia: number;
  accelMs2: number;
  brakeMs2: number;
  limiterFade: number;
} {
  const maxSpeedMs = C.maxSpeedMs * vehicle.tuning.maxSpeedMul * paceMul;
  const inertia = Math.sqrt(Math.max(0.55, vehicle.mass / C.referenceMassKg));
  const speedRatio = THREE.MathUtils.clamp(
    Math.abs(speedMs) / Math.max(1, maxSpeedMs),
    0,
    1,
  );
  const limiterFade = 0.22 + 0.78 * Math.pow(Math.max(0, 1 - speedRatio), 0.45);
  return {
    maxSpeedMs,
    inertia,
    accelMs2:
      (C.accelerationMs2 * vehicle.tuning.accelMul * torqueMul * limiterFade) /
      inertia,
    brakeMs2: (C.brakeMs2 * vehicle.tuning.brakeMul) / inertia,
    limiterFade,
  };
}
