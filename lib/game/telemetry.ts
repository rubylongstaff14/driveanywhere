/**
 * Per-frame car state shared outside React.
 *
 * The minimap and any other overlay reads this on its own animation frame, so
 * the driving loop never triggers a React render.
 */
export interface CarTelemetry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedKph: number;
  offRoad: boolean;
  gear: number;
  rpm: number;
  rpmNorm: number;
  /** Physics-clock lap time — ghost playback reads this, not React HUD. */
  elapsedMs: number;
  /** Online catch-up assist active */
  turbo: boolean;
  /** Slipstream behind a rival */
  drafting: boolean;
  /** 0–1 quality of current slipstream positioning. */
  draftStrength: number;
  /** Car is using the narrow kerb band rather than leaving the circuit. */
  onKerb: boolean;
  /** Simple longitudinal weight-transfer cue for learning racecraft. */
  balance: "braking" | "balanced" | "power";
}

export const carTelemetry: CarTelemetry = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speedKph: 0,
  offRoad: false,
  gear: 0,
  rpm: 0,
  rpmNorm: 0,
  elapsedMs: 0,
  turbo: false,
  drafting: false,
  draftStrength: 0,
  onKerb: false,
  balance: "balanced",
};

export function resetTelemetry(): void {
  carTelemetry.x = 0;
  carTelemetry.y = 0;
  carTelemetry.z = 0;
  carTelemetry.yaw = 0;
  carTelemetry.speedKph = 0;
  carTelemetry.offRoad = false;
  carTelemetry.gear = 0;
  carTelemetry.rpm = 0;
  carTelemetry.rpmNorm = 0;
  carTelemetry.elapsedMs = 0;
  carTelemetry.turbo = false;
  carTelemetry.drafting = false;
  carTelemetry.draftStrength = 0;
  carTelemetry.onKerb = false;
  carTelemetry.balance = "balanced";
}
