import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import type { ControlState } from "@/lib/game/controls";
import { driveEnvelope } from "@/lib/game/drive-envelope";
import { cornerLoad, peakLateralAccel } from "@/lib/game/grip";
import type { VehicleDef } from "@/lib/game/vehicles";

// Module-level scratch objects — no per-tick allocation.
const quat = new THREE.Quaternion();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const velocity = new THREE.Vector3();

export interface DriveState {
  speed: number;
  forwardSpeed: number;
  /** Absolute lateral velocity (m/s) — drives tire scrub SFX. */
  lateralSpeed: number;
}

const DEFAULT_TUNING: VehicleDef["tuning"] = {
  maxSpeedMul: 1,
  accelMul: 1,
  brakeMul: 1,
  gripMul: 1,
  steerMul: 1,
};

/**
 * Simcade driving model: friction circle, weight transfer, mass inertia.
 *
 * Velocity is decomposed into the car's forward / right axes, modified, then
 * written back. Rapier still resolves collisions first so the car never
 * tunnels through geometry.
 */
export function applyArcadeDriving(
  body: RapierRigidBody,
  controls: ControlState,
  onRoad: boolean,
  delta: number,
  tuning: VehicleDef["tuning"] = DEFAULT_TUNING,
  /** Gearbox torque band (1 = nominal). */
  torqueMul = 1,
  massKg: number = C.referenceMassKg,
): DriveState {
  const rot = body.rotation();
  quat.set(rot.x, rot.y, rot.z, rot.w);

  forward.set(0, 0, 1).applyQuaternion(quat);
  forward.y = 0;
  const fLen = forward.length();
  if (fLen < 0.001) return { speed: 0, forwardSpeed: 0, lateralSpeed: 0 };
  forward.divideScalar(fLen);

  right.set(1, 0, 0).applyQuaternion(quat);
  right.y = 0;
  right.normalize();

  const linvel = body.linvel();
  velocity.set(linvel.x, 0, linvel.z);
  let fwd = velocity.dot(forward);
  let lat = velocity.dot(right);

  const maxSpeed =
    (onRoad ? C.maxSpeedMs : C.offRoadMaxSpeedMs) * tuning.maxSpeedMul;
  const speedRatio = THREE.MathUtils.clamp(Math.abs(fwd) / maxSpeed, 0, 1);
  const steerAbs = Math.abs(controls.steer);
  const sliding = controls.handbrake && Math.abs(fwd) > 2.5;
  const massNorm = Math.max(0.55, massKg / C.referenceMassKg);
  const inertia = Math.sqrt(massNorm);
  const { limiterFade } = driveEnvelope(
    { tuning, mass: massKg },
    fwd,
    torqueMul,
  );

  const longDemand = controls.brake - controls.accelerate * 0.65;
  const frontLoad = THREE.MathUtils.clamp(
    1 + longDemand * C.weightTransfer,
    0.72,
    1.28,
  );

  const peakLateral = peakLateralAccel(fwd, tuning.gripMul);
  const predictedYaw = Math.min(
    C.maxYawRate,
    (Math.abs(fwd) / C.wheelbaseMetres) *
      Math.tan(THREE.MathUtils.degToRad(18 * steerAbs)),
  );
  const predictedLoad = cornerLoad(predictedYaw, fwd, tuning.gripMul);
  const circleHeadroom = THREE.MathUtils.clamp(1.14 - predictedLoad * 0.62, 0.42, 1);

  if (controls.accelerate > 0 && fwd < maxSpeed) {
    const drive =
      C.accelerationMs2 *
      tuning.accelMul *
      controls.accelerate *
      Math.max(0.08, torqueMul) *
      limiterFade *
      circleHeadroom *
      (1 / inertia) *
      delta;
    fwd += drive;
  }

  if (sliding) {
    const dump = Math.min(Math.abs(fwd), C.handbrakeDragMs2 * delta);
    fwd -= Math.sign(fwd) * dump;
  }

  if (controls.brake > 0) {
    if (fwd > 0.3) {
      fwd = Math.max(
        0,
        fwd -
          (C.brakeMs2 * tuning.brakeMul * controls.brake * circleHeadroom * delta) /
            inertia,
      );
    } else {
      fwd -= (C.reverseMs2 * controls.brake * delta) / inertia;
    }
  }

  if (controls.accelerate === 0 && controls.brake === 0) {
    const drag = onRoad ? C.coastDrag : C.offRoadDrag;
    fwd *= Math.exp(-drag * delta);
  } else if (!onRoad) {
    fwd *= Math.exp(-C.offRoadDrag * 0.45 * delta);
  }

  fwd = THREE.MathUtils.clamp(fwd, -C.maxReverseMs, maxSpeed);

  if (Math.abs(fwd) > 0.001) {
    const resistance =
      C.rollingResistanceMs2 + C.aerodynamicDrag * fwd * fwd;
    const loss = Math.min(Math.abs(fwd), resistance * delta);
    fwd -= Math.sign(fwd) * loss;
  }

  const steeringAngleDegrees =
    THREE.MathUtils.lerp(
      C.steeringAngleLowSpeedDegrees,
      C.steeringAngleHighSpeedDegrees,
      Math.pow(speedRatio, 0.82),
    ) * (sliding ? 1.12 : 1);
  const steeringAngleRadians = THREE.MathUtils.degToRad(
    steeringAngleDegrees * controls.steer * tuning.steerMul,
  );
  const direction = fwd < -0.3 ? -1 : 1;

  let targetYaw = THREE.MathUtils.clamp(
    -(Math.abs(fwd) / C.wheelbaseMetres) *
      Math.tan(steeringAngleRadians) *
      direction,
    -C.maxYawRate * tuning.steerMul,
    C.maxYawRate * tuning.steerMul,
  );

  const gripYawLimit =
    (peakLateral * C.frontEndGripBias * frontLoad) /
    Math.max(9, Math.abs(fwd) * 0.78);
  const minYaw =
    C.minYawAtSpeed *
    steerAbs *
    tuning.steerMul *
    (1 - speedRatio * 0.78);
  let yawCeiling = Math.max(gripYawLimit, minYaw) / inertia;
  if (sliding) {
    yawCeiling = Math.max(
      yawCeiling,
      (C.maxYawRate * 1.05 * tuning.steerMul) / inertia,
    );
  }
  // Trail brake: nose weight lets the car rotate. Throttle-on understeers.
  targetYaw *= sliding ? C.handbrakeYawMul : frontLoad;
  targetYaw = THREE.MathUtils.clamp(targetYaw, -yawCeiling, yawCeiling);

  const currentYaw = body.angvel().y;
  const alpha = Math.min(1, (C.steerResponse / inertia) * delta);
  const nextYaw = currentYaw + (targetYaw - currentYaw) * alpha;
  body.setAngvel({ x: 0, y: nextYaw, z: 0 }, true);

  const load = cornerLoad(nextYaw, fwd, tuning.gripMul);
  if (load > 0.42 && Math.abs(fwd) > 7) {
    const slip = load - 0.42;
    const bleed =
      (C.cornerDragMs2 * slip + C.cornerDumpMs2 * slip * slip) * delta;
    fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd) * 0.55, bleed);
  }

  const tau = sliding
    ? C.handbrakeGripTau
    : onRoad
      ? THREE.MathUtils.lerp(
          C.gripTau,
          C.gripTauAtTopSpeed,
          speedRatio,
        ) /
        (tuning.gripMul * (1 + steerAbs * C.frontSlipScrub))
      : C.offRoadGripTau;
  lat *= Math.exp(-delta / Math.max(0.02, tau));

  if (onRoad && Math.abs(nextYaw) > 0.001 && Math.abs(fwd) > 2) {
    const follow = sliding
      ? C.pathFollowIdle * 0.55
      : THREE.MathUtils.lerp(
          C.pathFollowIdle,
          C.pathFollowSteering,
          steerAbs,
        );
    const angle = nextYaw * delta * follow;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const worldX = forward.x * fwd + right.x * lat;
    const worldZ = forward.z * fwd + right.z * lat;
    const rotatedX = worldX * cos + worldZ * sin;
    const rotatedZ = -worldX * sin + worldZ * cos;
    fwd = rotatedX * forward.x + rotatedZ * forward.z;
    lat = rotatedX * right.x + rotatedZ * right.z;
  }

  const speed = Math.hypot(fwd, lat);

  body.setLinvel(
    {
      x: forward.x * fwd + right.x * lat,
      y: linvel.y,
      z: forward.z * fwd + right.z * lat,
    },
    true,
  );

  return { speed, forwardSpeed: fwd, lateralSpeed: Math.abs(lat) };
}

export function resetVehicle(
  body: RapierRigidBody,
  position: { x: number; y: number; z: number },
  yaw = 0,
): void {
  body.setTranslation(
    { x: position.x, y: Math.max(C.spawnHeight, position.y + C.spawnHeight), z: position.z },
    true,
  );
  body.setRotation(
    { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
    true,
  );
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
