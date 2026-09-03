import * as THREE from "three";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import { getRouteBounds, type RoadSample } from "@/lib/game/road-mesh";
import type { RouteData } from "@/lib/validation/route-data";

export const ROUTE_INTRO_SECONDS = 5.5;

export interface IntroSpawn {
  position: THREE.Vector3;
  yaw: number;
}

/** Smooth spline pair sampled for the cinematic fly-through. */
export interface IntroPath {
  position: THREE.CatmullRomCurve3;
  lookAt: THREE.CatmullRomCurve3;
}

function interpolateRoadSample(samples: RoadSample[], progress: number): RoadSample {
  if (samples.length === 0) {
    return {
      position: new THREE.Vector3(),
      tangent: new THREE.Vector3(0, 0, 1),
      normal: new THREE.Vector3(1, 0, 0),
      width: 10,
    };
  }
  const clamped = Math.max(0, Math.min(1, progress));
  const f = clamped * (samples.length - 1);
  const i0 = Math.floor(f);
  const i1 = Math.min(samples.length - 1, i0 + 1);
  const w = f - i0;
  const a = samples[i0];
  const b = samples[i1];
  return {
    position: a.position.clone().lerp(b.position, w),
    tangent: a.tangent.clone().lerp(b.tangent, w).normalize(),
    normal: a.normal.clone().lerp(b.normal, w).normalize(),
    width: THREE.MathUtils.lerp(a.width, b.width, w),
  };
}

function buildingCentroid(
  footprint: { x: number; y?: number; z: number }[],
): THREE.Vector3 {
  if (footprint.length === 0) return new THREE.Vector3();
  let x = 0;
  let z = 0;
  for (const p of footprint) {
    x += p.x;
    z += p.z;
  }
  return new THREE.Vector3(x / footprint.length, 0, z / footprint.length);
}

function landmarkFocus(route: RouteData): THREE.Vector3 | null {
  const ranked = [...route.buildings]
    .filter((b) => b.height >= 28)
    .sort((a, b) => b.height - a.height);
  const top = ranked[0];
  if (!top) return null;
  const c = buildingCentroid(top.footprint);
  c.y = Math.max(10, top.baseHeight + top.height * 0.62);
  return c;
}

function trackSideCam(
  sample: RoadSample,
  side: number,
  lateral: number,
  height: number,
  back: number,
): THREE.Vector3 {
  return sample.position
    .clone()
    .addScaledVector(sample.normal, side * lateral)
    .add(new THREE.Vector3(0, height, 0))
    .addScaledVector(sample.tangent, -back);
}

function trackLook(
  sample: RoadSample,
  ahead: number,
  lift = 3.5,
): THREE.Vector3 {
  return sample.position
    .clone()
    .addScaledVector(sample.tangent, ahead)
    .add(new THREE.Vector3(0, lift, 0));
}

/** Gentle ease — slow in, cruise mid, settle on the grid. */
export function cinematicEase(u: number): number {
  const t = Math.max(0, Math.min(1, u));
  return t * t * t * (t * (6 * t - 15) + 10);
}

/**
 * One continuous Catmull-Rom arc for every circuit:
 * wide establish → dual track glides → skyline beat → grid lock.
 */
export function buildRouteIntroPath(
  route: RouteData,
  samples: RoadSample[],
  spawn: IntroSpawn,
): IntroPath {
  const bounds = getRouteBounds(route);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const span = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxZ - bounds.minZ,
    120,
  );
  const compact = Math.min(1, span / 900);
  const aerialLift = 36 * compact + 12;
  const diag = Math.atan2(
    bounds.maxZ - bounds.minZ,
    bounds.maxX - bounds.minX,
  );

  const s18 = interpolateRoadSample(samples, 0.18);
  const s38 = interpolateRoadSample(samples, 0.38);
  const s58 = interpolateRoadSample(samples, 0.58);
  const s76 = interpolateRoadSample(samples, 0.76);
  const landmark = landmarkFocus(route);
  const useLandmarkBeat = Boolean(landmark && span >= 850);

  const flatFwd = new THREE.Vector3(
    Math.sin(spawn.yaw),
    0,
    Math.cos(spawn.yaw),
  ).normalize();
  const flatRight = new THREE.Vector3(flatFwd.z, 0, -flatFwd.x);

  const gridLook = new THREE.Vector3(
    spawn.position.x,
    spawn.position.y + 1.1,
    spawn.position.z,
  );
  const gridCam = new THREE.Vector3(
    spawn.position.x - flatFwd.x * (C.cameraDistance + 2.2),
    spawn.position.y + C.cameraHeight + 1.5,
    spawn.position.z - flatFwd.z * (C.cameraDistance + 2.2),
  );

  const establish = new THREE.Vector3(
    cx - Math.cos(diag) * span * 0.46,
    span * 0.34 * compact + aerialLift,
    cz - Math.sin(diag) * span * 0.46,
  );
  const orbitEntry = new THREE.Vector3(
    cx + Math.cos(diag + 0.9) * span * 0.4,
    span * 0.26 * compact + aerialLift * 0.75,
    cz + Math.sin(diag + 0.9) * span * 0.36,
  );
  const glideA = trackSideCam(s18, 1, s18.width * 0.85 + 32, 16 * compact + 14, 18);
  const glideB = trackSideCam(s38, -1, s38.width * 0.9 + 28, 14 * compact + 12, 14);
  const glideC = trackSideCam(s58, 1, s58.width * 0.8 + 26, 12 * compact + 10, 12);

  const skylinePos = useLandmarkBeat
    ? new THREE.Vector3(
        landmark!.x + span * 0.1,
        landmark!.y + 14 * compact + 10,
        landmark!.z + span * 0.14,
      )
    : trackSideCam(s76, -1, s76.width * 0.75 + 36, 18 * compact + 12, 8);

  const skylineLook = useLandmarkBeat
    ? landmark!.clone()
    : trackLook(s76, 24, 4);

  const gridApproach = new THREE.Vector3(
    spawn.position.x + flatRight.x * 22 + flatFwd.x * 14,
    spawn.position.y + 10 * compact + 8,
    spawn.position.z + flatRight.z * 22 + flatFwd.z * 14,
  );

  const establishToOrbit = establish.clone().lerp(orbitEntry, 0.42);
  establishToOrbit.y = (establish.y + orbitEntry.y) * 0.55;

  const positions = [
    establish,
    establishToOrbit,
    orbitEntry,
    glideA,
    glideB,
    glideC,
    skylinePos,
    gridApproach,
    gridCam,
  ];

  const lookAts = [
    new THREE.Vector3(cx, 8, cz),
    new THREE.Vector3(cx, 8, cz),
    trackLook(s18, 32, 5),
    trackLook(s38, 28, 4),
    trackLook(s58, 26, 4),
    skylineLook,
    gridLook.clone(),
    gridLook
      .clone()
      .add(flatFwd.clone().multiplyScalar(C.cameraLookAhead * 0.6)),
    gridLook.clone().add(flatFwd.clone().multiplyScalar(C.cameraLookAhead)),
  ];

  return {
    position: new THREE.CatmullRomCurve3(positions, false, "catmullrom", 0.38),
    lookAt: new THREE.CatmullRomCurve3(lookAts, false, "catmullrom", 0.38),
  };
}

/** FOV beats tied to the same eased timeline. */
export function introFov(u: number): number {
  const t = cinematicEase(Math.max(0, Math.min(1, u)));
  if (t < 0.35) return THREE.MathUtils.lerp(68, 58, t / 0.35);
  if (t < 0.78) return THREE.MathUtils.lerp(58, 52, (t - 0.35) / 0.43);
  return THREE.MathUtils.lerp(52, 50, (t - 0.78) / 0.22);
}

/** Sample the spline fly-through at normalized time [0, 1]. */
export function sampleIntroPath(
  path: IntroPath,
  u: number,
): { position: THREE.Vector3; lookAt: THREE.Vector3; fov: number } {
  const t = cinematicEase(Math.max(0, Math.min(1, u)));
  return {
    position: path.position.getPointAt(t),
    lookAt: path.lookAt.getPointAt(t),
    fov: introFov(u),
  };
}

/** Max distance between consecutive samples — sanity check for smooth motion. */
export function maxIntroStep(path: IntroPath, steps = 48): number {
  let max = 0;
  let prev = sampleIntroPath(path, 0).position;
  for (let i = 1; i <= steps; i += 1) {
    const next = sampleIntroPath(path, i / steps).position;
    max = Math.max(max, prev.distanceTo(next));
    prev = next;
  }
  return max;
}
