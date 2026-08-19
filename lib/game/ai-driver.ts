import * as THREE from "three";
import { AutoGearbox } from "@/lib/game/gearbox";
import type { RoadSample } from "@/lib/game/road-mesh";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import { driveEnvelope } from "@/lib/game/drive-envelope";
import { gripLimitedCornerSpeed } from "@/lib/game/grip";
import type { VehicleDef } from "@/lib/game/vehicles";

export interface AiPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedMs: number;
}

export interface AiArcCache {
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
  nxs: Float32Array;
  nzs: Float32Array;
  yaws: Float32Array;
  widths: Float32Array;
  /** Instantaneous bend radius (m). Large = straight. */
  radii: Float32Array;
  /** 0 = straight, 1 = hairpin. */
  corners: Float32Array;
  distances: Float32Array;
  total: number;
}

const cache = new WeakMap<RoadSample[], AiArcCache>();

export function getAiArc(samples: RoadSample[]): AiArcCache {
  const cached = cache.get(samples);
  if (cached) return cached;
  const n = samples.length;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const zs = new Float32Array(n);
  const nxs = new Float32Array(n);
  const nzs = new Float32Array(n);
  const yaws = new Float32Array(n);
  const widths = new Float32Array(n);
  const radii = new Float32Array(n);
  const corners = new Float32Array(n);
  const distances = new Float32Array(n);
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const s = samples[i];
    xs[i] = s.position.x;
    ys[i] = s.position.y;
    zs[i] = s.position.z;
    nxs[i] = s.normal.x;
    nzs[i] = s.normal.z;
    yaws[i] = Math.atan2(s.tangent.x, s.tangent.z);
    widths[i] = s.width;
    if (i > 0) {
      total += Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    }
    distances[i] = total;
  }
  // Local radius from heading change over ~14 m — same tyre math as the player.
  for (let i = 0; i < n; i += 1) {
    const here = distances[i];
    const target = here + 14;
    let j = i;
    while (j < n - 1 && distances[j] < target) j += 1;
    let dyaw = yaws[j] - yaws[i];
    if (dyaw > Math.PI) dyaw -= Math.PI * 2;
    if (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const span = Math.max(1, distances[j] - here);
    const kappa = Math.abs(dyaw) / span;
    radii[i] = kappa > 0.0008 ? 1 / kappa : 2400;
    corners[i] = Math.max(0, Math.min(1, (Math.abs(dyaw) - 0.12) / 1.05));
  }
  const built = {
    xs,
    ys,
    zs,
    nxs,
    nzs,
    yaws,
    widths,
    radii,
    corners,
    distances,
    total: Math.max(1, total),
  };
  cache.set(samples, built);
  return built;
}

function wrapDistance(distance: number, total: number): number {
  const wrapped = distance % total;
  return wrapped < 0 ? wrapped + total : wrapped;
}

function locate(arc: AiArcCache, distance: number): { i0: number; i1: number; t: number } {
  const wrapped = wrapDistance(distance, arc.total);
  let lo = 0;
  let hi = arc.xs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arc.distances[mid] < wrapped) lo = mid + 1;
    else hi = mid;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const span = Math.max(0.001, arc.distances[i1] - arc.distances[i0]);
  return { i0, i1, t: (wrapped - arc.distances[i0]) / span };
}

function sampleAtDistance(
  arc: AiArcCache,
  distance: number,
  lateralM: number,
): AiPose & { corner: number; radius: number } {
  const { i0, i1, t } = locate(arc, distance);
  let dyaw = arc.yaws[i1] - arc.yaws[i0];
  if (dyaw > Math.PI) dyaw -= Math.PI * 2;
  if (dyaw < -Math.PI) dyaw += Math.PI * 2;
  const nx = arc.nxs[i0] + (arc.nxs[i1] - arc.nxs[i0]) * t;
  const nz = arc.nzs[i0] + (arc.nzs[i1] - arc.nzs[i0]) * t;
  const y = arc.ys[i0] + (arc.ys[i1] - arc.ys[i0]) * t;
  const halfW = (arc.widths[i0] + (arc.widths[i1] - arc.widths[i0]) * t) * 0.5;
  // Keep the car on asphalt even on tight street sections.
  const lane = Math.max(-halfW + 1.6, Math.min(halfW - 1.6, lateralM));
  const corner =
    arc.corners[i0] + (arc.corners[i1] - arc.corners[i0]) * t;
  const radius =
    arc.radii[i0] + (arc.radii[i1] - arc.radii[i0]) * t;
  return {
    x: arc.xs[i0] + (arc.xs[i1] - arc.xs[i0]) * t + nx * lane,
    y: Math.max(C.spawnHeight, y + C.spawnHeight),
    z: arc.zs[i0] + (arc.zs[i1] - arc.zs[i0]) * t + nz * lane,
    yaw: arc.yaws[i0] + dyaw * t,
    speedMs: 0,
    corner,
    radius,
  };
}

/**
 * Lane offset so AI never sit in the player's centreline hitbox.
 * Alternates left / right, 2.1–2.8 m off the racing line.
 */
export function aiLaneOffset(gridIndex: number): number {
  const side = gridIndex % 2 === 0 ? 1 : -1;
  return side * (2.1 + (gridIndex >> 1) * 0.35);
}

/** Same on-road limiter the player is clamped to. */
export function aiTopSpeed(vehicle: VehicleDef, paceMul = 1): number {
  return C.maxSpeedMs * vehicle.tuning.maxSpeedMul * paceMul;
}

/**
 * How much of the tyre-limit corner speed the AI is allowed to use.
 * Same car and power as the player — skill only changes corner commitment.
 * Easy ~68%, default ~79%, Hard ~92% (never a perfect racing line).
 */
export function aiSkillCornerMul(skill: number): number {
  const s = Math.max(0, Math.min(1, skill));
  return 0.62 + s * 0.42;
}

export function aiCruiseSpeed(
  vehicle: VehicleDef,
  paceMul: number,
  radiusM = 2400,
  weatherGrip = 1,
): number {
  const top = aiTopSpeed(vehicle, paceMul);
  const grip = gripLimitedCornerSpeed(
    radiusM,
    vehicle.tuning.gripMul * weatherGrip,
  );
  return Math.min(top, grip);
}

function upcomingGripLimit(
  arc: AiArcCache,
  distanceM: number,
  vehicle: VehicleDef,
  paceMul: number,
  speedMs: number,
  weatherGrip = 1,
  skill = 1,
): number {
  const top = aiTopSpeed(vehicle, paceMul);
  const look = Math.min(72, Math.max(22, speedMs * 1.4));
  let tightest = 2400;
  for (let ahead = 0; ahead <= look; ahead += 5) {
    const { radius } = sampleAtDistance(arc, distanceM + ahead, 0);
    if (radius < tightest) tightest = radius;
  }
  return Math.min(
    top,
    gripLimitedCornerSpeed(tightest, vehicle.tuning.gripMul * weatherGrip) *
      aiSkillCornerMul(skill),
  );
}

/**
 * Advance an AI car along the ribbon. Kinematic — no Rapier bodies —
 * so they cannot shove the player or add physics cost.
 */
export function stepAiAlongRoad(
  samples: RoadSample[],
  distanceM: number,
  vehicle: VehicleDef,
  paceMul: number,
  dt: number,
  racing: boolean,
  lateralM = 0,
  arc = getAiArc(samples),
  currentSpeed = 0,
  skill = 1,
  weatherGrip = 1,
  gearbox: AutoGearbox | null = null,
): { pose: AiPose; distanceM: number; speedMs: number } {
  const target = racing
    ? upcomingGripLimit(
        arc,
        distanceM,
        vehicle,
        paceMul,
        currentSpeed,
        weatherGrip,
        skill,
      )
    : 0;

  let nextSpeed = 0;
  if (racing) {
    const throttle = target > currentSpeed + 0.15 ? 1 : 0;
    const braking = target < currentSpeed - 0.15;
    const gearState = gearbox
      ? gearbox.step(currentSpeed, throttle, braking, dt)
      : { torqueMul: 1 };
    const { accelMs2, brakeMs2, maxSpeedMs } = driveEnvelope(
      vehicle,
      currentSpeed,
      gearState.torqueMul,
      paceMul,
    );
    const rate = currentSpeed > target ? brakeMs2 : accelMs2;
    nextSpeed =
      currentSpeed +
      Math.sign(target - currentSpeed) *
        Math.min(rate * dt, Math.abs(target - currentSpeed));
    nextSpeed = THREE.MathUtils.clamp(nextSpeed, -C.maxReverseMs, maxSpeedMs);

    // Same mild corner bleed the player pays once the tyres are loaded.
    const { radius, corner } = sampleAtDistance(arc, distanceM, lateralM);
    if (corner > 0.35 && Math.abs(nextSpeed) > 7) {
      const gripCap =
        gripLimitedCornerSpeed(radius, vehicle.tuning.gripMul * weatherGrip) *
        aiSkillCornerMul(skill);
      if (nextSpeed > gripCap * 0.92) {
        const slip = (nextSpeed - gripCap * 0.92) / Math.max(4, gripCap);
        const bleed =
          (C.cornerDragMs2 * slip + C.cornerDumpMs2 * slip * slip) * dt;
        nextSpeed -= Math.min(nextSpeed * 0.35, bleed);
      }
    }
  }

  const nextDist = racing ? distanceM + nextSpeed * dt : distanceM;
  const pose = sampleAtDistance(arc, nextDist, lateralM);
  pose.speedMs = nextSpeed;
  return { distanceM: nextDist, pose, speedMs: nextSpeed };
}

export function aiStartDistance(
  samples: RoadSample[],
  offsetM: number,
  arc = getAiArc(samples),
): number {
  // Just ahead of the player so they are visible at lights-out, not on top.
  return Math.min(arc.total * 0.03, Math.max(4, offsetM));
}

export function loopLength(samples: RoadSample[]): number {
  return getAiArc(samples).total;
}

export function peekAiPoint(samples: RoadSample[], distanceM: number, lateralM = 0) {
  return sampleAtDistance(getAiArc(samples), distanceM, lateralM);
}
