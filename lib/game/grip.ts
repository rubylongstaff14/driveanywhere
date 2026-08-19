import { GAME_CONSTANTS as C } from "@/lib/game/constants";

/** Peak lateral acceleration (m/s²) at this road speed. */
export function peakLateralAccel(speedMs: number, gripMul = 1): number {
  return (
    (C.maxLateralAccelerationMs2 +
      C.aeroDownforceGrip * speedMs * speedMs) *
    gripMul
  );
}

/**
 * Fastest you can hold a bend of this radius on the same tyre budget
 * the player uses. v² / r = a0 + k v².
 */
export function gripLimitedCornerSpeed(radiusM: number, gripMul = 1): number {
  const a0 = C.maxLateralAccelerationMs2 * gripMul;
  const k = C.aeroDownforceGrip * gripMul;
  const radius = Math.max(8, radiusM);
  const denom = 1 / radius - k;
  if (denom <= 1e-5) return 80;
  return Math.sqrt(Math.max(36, a0 / denom));
}

/** 0 = no lateral load, 1 = at the tyre limit. */
export function cornerLoad(yawRate: number, speedMs: number, gripMul = 1): number {
  const lat = Math.abs(yawRate) * Math.abs(speedMs);
  const budget = Math.max(1, peakLateralAccel(speedMs, gripMul));
  return Math.min(1.35, lat / budget);
}
