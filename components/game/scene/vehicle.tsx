"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import { TyreSmoke } from "@/components/game/scene/tyre-smoke";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import { ImpactAudio } from "@/lib/game/impact-audio";
import { isInsideCheckpoint } from "@/lib/game/checkpoints";
import { InputSampler } from "@/lib/game/controls";
import { EngineAudio } from "@/lib/game/engine-audio";
import { DriveAmbienceAudio } from "@/lib/game/drive-ambience-audio";
import { AutoGearbox } from "@/lib/game/gearbox";
import { RaceAudio } from "@/lib/game/race-audio";
import type { RoadSample } from "@/lib/game/road-mesh";
import { RoadTracker } from "@/lib/game/road-tracker";
import { carTelemetry } from "@/lib/game/telemetry";
import { applyArcadeDriving, resetVehicle } from "@/lib/game/vehicle-controller";
import { defaultLoadout, resolveLoadoutVisual } from "@/lib/game/cosmetics";
import { getVehicle } from "@/lib/game/vehicles";
import { useProgressionStore } from "@/stores/progression-store";
import { GhostRecorder, loadGhostTape, saveGhostTape } from "@/lib/game/ghost-tape";
import {
  isSectorEnd,
  sectorIndexForCheckpoint,
  splitToneForSector,
} from "@/lib/game/sectors";
import { weatherGripMul } from "@/lib/game/weather";
import { sendCarState } from "@/lib/multiplayer/ws-client";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import type { RouteData } from "@/lib/validation/route-data";
import { useGameStore } from "@/stores/game-store";
import { useSettingsStore } from "@/stores/settings-store";

interface VehicleProps {
  route: RouteData;
  samples: RoadSample[];
}

export function Vehicle({ route, samples }: VehicleProps) {
  const bodyRef  = useRef<RapierRigidBody>(null);
  const meshRef  = useRef<THREE.Group>(null);
  const engineRef = useRef<EngineAudio | null>(null);
  const raceAudioRef = useRef<RaceAudio | null>(null);
  const impactAudioRef = useRef<ImpactAudio | null>(null);
  const ambienceRef = useRef<DriveAmbienceAudio | null>(null);
  const shakeRef = useRef(0);
  const lastImpactAt = useRef(0);
  const lastLatSpeed = useRef(0);
  const sparkMesh = useRef<THREE.Mesh>(null);
  const gearboxRef = useRef<AutoGearbox | null>(null);

  const input   = useMemo(() => new InputSampler(), []);
  const tracker = useMemo(() => new RoadTracker(samples), [samples]);
  const spawn   = useMemo(() => tracker.spawn(), [tracker]);
  const checkpoints = useMemo(
    () => [...route.checkpoints].sort((a, b) => a.index - b.index),
    [route.checkpoints],
  );

  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const vehicle = useMemo(
    () => getVehicle(selectedVehicleId),
    [selectedVehicleId],
  );
  const loadout = useProgressionStore(
    (s) => s.loadouts[selectedVehicleId] ?? defaultLoadout(selectedVehicleId),
  );
  const onlinePaint = useMultiplayerStore((s) => {
    const me = s.currentRoom?.players.find((p) => p.id === s.myId);
    return me?.paint ?? null;
  });
  const visual = useMemo(() => {
    const base = resolveLoadoutVisual(selectedVehicleId, loadout);
    if (onlinePaint && /^#[0-9a-fA-F]{6}$/.test(onlinePaint)) {
      return { ...base, paint: onlinePaint, paintDark: onlinePaint };
    }
    return base;
  }, [loadout, onlinePaint, selectedVehicleId]);
  const engineVolume = useSettingsStore((s) => s.engineVolume);

  const lastHudAt   = useRef(0);
  const runStartAt  = useRef<number | null>(null);
  const nextCp      = useRef(0);
  const respawn     = useRef({ ...spawn.position, yaw: spawn.yaw });
  const steerAngle  = useRef(0);
  const visualPitch = useRef(0);
  const visualRoll = useRef(0);
  const visualInput = useRef({ accelerate: 0, brake: 0, handbrake: false, slip: 0 });
  const ghostRecorder = useRef(new GhostRecorder());
  const sessionBestSectors = useRef<(number | null)[]>([null, null, null]);
  const mouseLook = useRef({
    dragging: false,
    yaw: 0,
    pitch: 0,
    zoom: 0,
    lastInputAt: 0,
  });
  const scratch = useRef({
    camTarget:   new THREE.Vector3(),
    lookAt:      new THREE.Vector3(),
    lookAtSmooth: new THREE.Vector3(),
    camSmooth:   new THREE.Vector3(),
    forward:     new THREE.Vector3(),
    quat:        new THREE.Quaternion(),
    camReady:    false,
    lastNetSend: 0,
    gear:        0,
    steer:       0,
  });

  const paused     = useGameStore((s) => s.paused);
  const finished   = useGameStore((s) => s.finished);
  const restartToken = useGameStore((s) => s.restartToken);
  const checkpointResetToken = useGameStore((s) => s.checkpointResetToken);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const introActive = useGameStore((s) => s.introActive);
  const prevCameraMode = useRef(cameraMode);
  const startRun   = useGameStore((s) => s.startRun);
  const finishRun  = useGameStore((s) => s.finishRun);
  const toggleCamera = useGameStore((s) => s.toggleCamera);
  const setHud     = useGameStore((s) => s.setHud);
  const weather    = useGameStore((s) => s.weather);
  const driveTuning = useMemo(
    () => ({
      ...vehicle.tuning,
      gripMul: vehicle.tuning.gripMul * weatherGripMul(weather),
    }),
    [vehicle.tuning, weather],
  );

  const { camera, gl } = useThree();
  // Store camera in a ref so we can mutate .fov without triggering React
  // Compiler's immutability rule (which forbids mutating hook return values).
  const cameraRef = useRef(camera);
  const glRef = useRef(gl);

  // Attach keyboard/gamepad listeners to window.
  useEffect(() => input.attach(), [input]);

  useEffect(() => {
    const engine = new EngineAudio();
    engine.setVehicle(selectedVehicleId);
    engineRef.current = engine;
    engine.setVolume(engineVolume);
    const raceAudio = new RaceAudio();
    raceAudio.setVolume(Math.min(1, engineVolume * 1.05));
    raceAudioRef.current = raceAudio;
    const impactAudio = new ImpactAudio();
    impactAudio.setVolume(Math.min(1, engineVolume * 1.15));
    impactAudioRef.current = impactAudio;
    const ambience = new DriveAmbienceAudio();
    ambience.setVolume(Math.min(1, engineVolume * 0.9));
    ambienceRef.current = ambience;
    gearboxRef.current = new AutoGearbox(selectedVehicleId);
    return () => {
      engine.dispose();
      engineRef.current = null;
      raceAudio.dispose();
      raceAudioRef.current = null;
      impactAudio.dispose();
      impactAudioRef.current = null;
      ambience.dispose();
      ambienceRef.current = null;
      gearboxRef.current = null;
    };
    // Recreate when vehicle changes so gearbox + voice match.
  }, [selectedVehicleId]);

  useEffect(() => {
    engineRef.current?.setVolume(engineVolume);
    raceAudioRef.current?.setVolume(Math.min(1, engineVolume * 1.05));
    impactAudioRef.current?.setVolume(Math.min(1, engineVolume * 1.15));
    ambienceRef.current?.setVolume(Math.min(1, engineVolume * 0.9));
  }, [engineVolume]);

  // Drag on the game canvas to orbit the chase camera. Wheel zooms. The view
  // gently recentres after a short idle period so mouse-look never leaves the
  // player facing sideways when racing resumes.
  useEffect(() => {
    const canvas = glRef.current.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (paused || (cameraMode !== "chase" && cameraMode !== "far") || event.button > 2) return;
      mouseLook.current.dragging = true;
      mouseLook.current.lastInputAt = performance.now();
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!mouseLook.current.dragging) return;
      mouseLook.current.yaw -= event.movementX * 0.0042;
      mouseLook.current.pitch = THREE.MathUtils.clamp(
        mouseLook.current.pitch - event.movementY * 0.0032,
        -0.2,
        0.58,
      );
      mouseLook.current.lastInputAt = performance.now();
    };
    const onPointerUp = (event: PointerEvent) => {
      mouseLook.current.dragging = false;
      mouseLook.current.lastInputAt = performance.now();
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = "grab";
    };
    const onWheel = (event: WheelEvent) => {
      if (paused || (cameraMode !== "chase" && cameraMode !== "far")) return;
      event.preventDefault();
      mouseLook.current.zoom = THREE.MathUtils.clamp(
        mouseLook.current.zoom + event.deltaY * 0.008,
        -3,
        8,
      );
      mouseLook.current.lastInputAt = performance.now();
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [cameraMode, paused]);

  // Hand chase cam off the intro fly-through without a long lerp hitch.
  useEffect(() => {
    if (!introActive) {
      scratch.current.camReady = false;
    }
  }, [introActive]);

  // Reset car to start whenever restartToken increments (user hit Restart).
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    resetVehicle(body, spawn.position, spawn.yaw);
    tracker.reset();
    ghostRecorder.current.reset();
    runStartAt.current  = null;
    nextCp.current      = 0;
    carTelemetry.elapsedMs = 0;
    respawn.current     = { ...spawn.position, yaw: spawn.yaw };
    scratch.current.camReady = false;
    setHud({
      speedKph: 0,
      elapsedMs: 0,
      checkpointIndex: 0,
      checkpointTotal: checkpoints.length,
      progress: 0,
      gear: 0,
      rpm: 0,
      rpmNorm: 0,
      sectorIndex: 0,
      splitMs: null,
      splitDeltaMs: null,
      splitTone: null,
    });
  }, [checkpoints.length, restartToken, setHud, spawn, tracker]);

  // Pause-menu / intentional CP reset — snap to last gate without wiping the run.
  useEffect(() => {
    if (checkpointResetToken === 0) return;
    const body = bodyRef.current;
    if (!body) return;
    resetVehicle(body, respawn.current, respawn.current.yaw);
  }, [checkpointResetToken]);

  // Physics step: read controls, apply forces, detect checkpoints.
  useBeforePhysicsStep(() => {
    const body = bodyRef.current;
    if (!body) return;

    // Pause / camera toggles are available even when the menu is open,
    // but movement is suppressed when paused or finished.
    const controls = input.sample();
    if (controls.cameraPressed) toggleCamera();

    if (paused || finished) return;

    if (controls.resetPressed) {
      resetVehicle(body, respawn.current, respawn.current.yaw);
      return;
    }

    const position = body.translation();
    const hit = tracker.nearest(position.x, position.z);
    const onRoad = tracker.isOnRoad(hit, C.roadEdgeTolerance);

    // Hard recovery: lift back onto the road under the car — never teleport
    // to the start, which felt like a random restart on folded circuits.
    if (position.y < -2) {
      body.setTranslation(
        {
          x: position.x,
          y: hit.surfaceY + C.spawnHeight,
          z: position.z,
        },
        true,
      );
      const lv = body.linvel();
      body.setLinvel({ x: lv.x, y: 0, z: lv.z }, true);
    } else if (
      hit.distance <= hit.width / 2 + 18 &&
      position.y < hit.surfaceY - 2.4
    ) {
      body.setTranslation(
        {
          x: position.x,
          y: hit.surfaceY + C.spawnHeight,
          z: position.z,
        },
        true,
      );
    }

    // Gearbox first — torque band drives non-linear acceleration.
    const linvel = body.linvel();
    const approxSpeed = Math.hypot(linvel.x, linvel.z);
    if (!gearboxRef.current) {
      gearboxRef.current = new AutoGearbox(selectedVehicleId);
    }
    const gearState = gearboxRef.current.step(
      approxSpeed,
      controls.accelerate,
      controls.brake > 0.2,
      1 / 60,
    );

    const drive = applyArcadeDriving(
      body,
      controls,
      onRoad,
      1 / 60,
      driveTuning,
      gearState.torqueMul,
      vehicle.mass,
    );
    steerAngle.current = controls.steer;
    scratch.current.gear = gearState.gear;
    scratch.current.steer = controls.steer;

    // Impact feel — only real wall/barrier dumps (sudden lateral kill).
    // AI cars are visuals only and must never fake a hit.
    const nowMs = performance.now();
    const latDelta = Math.abs(drive.lateralSpeed - lastLatSpeed.current);
    lastLatSpeed.current = drive.lateralSpeed;
    let impact = 0;
    if (latDelta > 5.5 && Math.abs(drive.forwardSpeed) > 8) {
      impact = Math.min(1, latDelta / 16);
    }
    if (impact > 0.28 && nowMs - lastImpactAt.current > 180) {
      lastImpactAt.current = nowMs;
      shakeRef.current = Math.max(shakeRef.current, impact);
      if (sparkMesh.current) {
        sparkMesh.current.userData.age = 1;
        sparkMesh.current.visible = true;
      }
      void impactAudioRef.current?.play(impact);
    }
    visualInput.current.accelerate = controls.accelerate;
    visualInput.current.brake = controls.brake;
    visualInput.current.handbrake = controls.handbrake;
    visualInput.current.slip = drive.lateralSpeed;

    void engineRef.current?.ensureStarted();
    engineRef.current?.update({
      rpmNorm: gearState.rpmNorm,
      throttle: controls.accelerate,
      shifting: gearState.shifting,
      paused: false,
    });
    void ambienceRef.current?.ensureStarted();
    ambienceRef.current?.update({
      lateralSpeed: drive.lateralSpeed,
      forwardSpeed: drive.forwardSpeed,
      handbrake: controls.handbrake,
      offRoad: !onRoad,
      paused: false,
    });

    visualPitch.current = THREE.MathUtils.lerp(
      visualPitch.current,
      hit.pitch * 0.85,
      0.18,
    );

    // Write telemetry for the minimap (no React state involved).
    const after = body.translation();
    const rot = body.rotation();
    carTelemetry.x = after.x;
    carTelemetry.z = after.z;
    carTelemetry.speedKph = Math.abs(drive.forwardSpeed) * 3.6;
    carTelemetry.offRoad = !onRoad;
    carTelemetry.gear = gearState.gear;
    carTelemetry.rpm = gearState.rpm;
    carTelemetry.rpmNorm = gearState.rpmNorm;
    const yaw = Math.atan2(2 * rot.w * rot.y, 1 - 2 * rot.y * rot.y);
    carTelemetry.yaw = yaw;
    const elapsedNow = runStartAt.current ? performance.now() - runStartAt.current : 0;
    carTelemetry.elapsedMs = elapsedNow;
    if (runStartAt.current) {
      ghostRecorder.current.sample(elapsedNow, after.x, after.y, after.z, yaw);
    }

    // Checkpoint detection — index-only. Never snap via nearest() here;
    // that was the folded-track "restart" glitch.
    const target = checkpoints[nextCp.current];
    if (target && isInsideCheckpoint(target, after.x, after.z)) {
      respawn.current = {
        x: target.position.x,
        y: target.position.y ?? hit.surfaceY,
        z: target.position.z,
        yaw: target.rotation,
      };

      if (nextCp.current === 0) {
        runStartAt.current = performance.now();
        startRun();
      }

      const passedIndex = nextCp.current;
      nextCp.current += 1;
      const elapsedMs = runStartAt.current
        ? performance.now() - runStartAt.current
        : 0;

      if (passedIndex > 0 && isSectorEnd(passedIndex, checkpoints.length)) {
        ghostRecorder.current.markSector(elapsedMs);
        const sectorIndex = sectorIndexForCheckpoint(
          passedIndex,
          checkpoints.length,
        );
        const tape = loadGhostTape(route.id);
        const pbMs = tape?.sectorMs[sectorIndex] ?? null;
        const sessionMs = sessionBestSectors.current[sectorIndex];
        const tone = splitToneForSector(elapsedMs, pbMs, sessionMs);
        if (sessionMs == null || elapsedMs < sessionMs) {
          sessionBestSectors.current[sectorIndex] = elapsedMs;
        }
        const compareMs = pbMs ?? sessionMs;
        setHud({
          sectorIndex: sectorIndex + 1,
          splitMs: elapsedMs,
          splitDeltaMs: compareMs != null ? elapsedMs - compareMs : null,
          splitTone: tone,
        });
      }

      if (nextCp.current >= checkpoints.length) {
        void raceAudioRef.current?.playFinish();
        const tape = ghostRecorder.current.finish(
          route.id,
          selectedVehicleId,
          elapsedMs,
        );
        if (tape) saveGhostTape(tape);
        finishRun();
        setHud({ checkpointIndex: checkpoints.length, progress: 1 });
      } else {
        void raceAudioRef.current?.playCheckpoint(passedIndex);
        setHud({ checkpointIndex: nextCp.current });
      }
    }

    // Throttle HUD updates to ~11 Hz so React isn't hammered every physics tick.
    const now = performance.now();
    if (now - lastHudAt.current > 88) {
      lastHudAt.current = now;
      setHud({
        speedKph: Math.abs(drive.forwardSpeed) * 3.6,
        elapsedMs: runStartAt.current ? now - runStartAt.current : 0,
        progress: hit.progress,
        gear: gearState.gear,
        rpm: gearState.rpm,
        rpmNorm: gearState.rpmNorm,
      });
    }
  });

  // Re-apply road height AFTER Rapier integrates gravity/collisions.
  // Elevated sections have no floor trimesh — without this lock the car
  // falls through the deck the moment it leaves the racing line briefly.
  useAfterPhysicsStep(() => {
    const body = bodyRef.current;
    if (!body || paused || finished) return;

    const position = body.translation();
    const hit = tracker.nearest(position.x, position.z);
    const supportY = Math.max(C.spawnHeight, hit.surfaceY + C.spawnHeight);
    // On elevated deck, keep supporting well past the asphalt edge so small
    // barrier gaps can't dump the car through the map.
    const elevated = hit.surfaceY > 1.5;
    const supportRadius = hit.width / 2 + (elevated ? 48 : 22);
    const nearRoad = hit.distance <= supportRadius;

    let nextY: number;
    if (nearRoad || (elevated && hit.distance <= hit.width / 2 + 60)) {
      nextY = supportY;
    } else {
      // Far off-track on flat ground: settle gently toward the world floor.
      const fallStep = 3.2 * (1 / 60);
      nextY = Math.max(C.spawnHeight, position.y - fallStep);
    }

    if (Math.abs(position.y - nextY) > 0.0005) {
      body.setTranslation(
        { x: position.x, y: nextY, z: position.z },
        true,
      );
    }
    const lv = body.linvel();
    if (lv.y !== 0) {
      body.setLinvel({ x: lv.x, y: 0, z: lv.z }, true);
    }
  });

  // Mute engine while paused / finished.
  useEffect(() => {
    if (paused || finished) {
      engineRef.current?.update({
        rpmNorm: 0,
        throttle: 0,
        shifting: false,
        paused: true,
      });
      ambienceRef.current?.update({
        lateralSpeed: 0,
        forwardSpeed: 0,
        handbrake: false,
        offRoad: false,
        paused: true,
      });
    }
  }, [paused, finished]);

  // Camera and wheel animation run every render frame.
  useFrame((_, rawDelta) => {
    const body = bodyRef.current;
    if (!body) return;
    if (introActive) return;
    // Clamp to avoid teleport on tab-back or hitch, but allow 60Hz+ frames.
    const delta = Math.min(0.05, Math.max(0.0005, rawDelta));

    const { camTarget, lookAt, lookAtSmooth, camSmooth, forward, quat } =
      scratch.current;
    const pos = body.translation();
    const rot = body.rotation();
    quat.set(rot.x, rot.y, rot.z, rot.w);

    if (meshRef.current) {
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      meshRef.current.quaternion.copy(quat);
      const speedWeight = THREE.MathUtils.clamp(carTelemetry.speedKph / 100, 0, 1);
      const drift = visualInput.current.handbrake ? 1 : 0;
      const targetRoll =
        -steerAngle.current * speedWeight * (0.07 + drift * 0.1) -
        Math.sign(steerAngle.current || visualInput.current.slip) *
          Math.min(0.18, visualInput.current.slip * 0.012);
      const accelPitch =
        (visualInput.current.brake - visualInput.current.accelerate * 0.45) *
        speedWeight *
        0.042;
      visualRoll.current = THREE.MathUtils.lerp(
        visualRoll.current,
        targetRoll,
        1 - Math.exp(-7 * delta),
      );
      // visualPitch already tracks road grade in the physics step; blend in
      // throttle/brake squat on top.
      meshRef.current.rotateZ(visualRoll.current);
      meshRef.current.rotateX(visualPitch.current + accelPitch);
      const slipYaw =
        -Math.sign(steerAngle.current || 1) *
        Math.min(0.16, (visualInput.current.slip * 0.01 + drift * 0.05) * speedWeight);
      meshRef.current.rotateY(slipYaw);
    }

    // Wheel animation removed — meshes are baked per vehicle body.
    forward.set(0, 0, 1).applyQuaternion(quat).normalize();

    const speedKph = carTelemetry.speedKph;
    const speedRatio = THREE.MathUtils.clamp(speedKph / (C.maxSpeedMs * 3.6), 0, 1);
    const chaseLike = cameraMode === "chase" || cameraMode === "far";
    const bumperCam = cameraMode === "bumper";

    if (chaseLike) {
      const look = mouseLook.current;
      if (!look.dragging && performance.now() - look.lastInputAt > 2200) {
        const recenter = 1 - Math.exp(-2.6 * delta);
        look.yaw = THREE.MathUtils.lerp(look.yaw, 0, recenter);
        look.pitch = THREE.MathUtils.lerp(look.pitch, 0, recenter);
      }
      const baseDist = cameraMode === "far" ? C.cameraDistance * 1.55 : C.cameraDistance;
      const baseH = cameraMode === "far" ? C.cameraHeight * 1.25 : C.cameraHeight;
      const distance = baseDist + look.zoom;
      const horizontalDistance = Math.cos(look.pitch) * distance;
      const rearX = -forward.x;
      const rearZ = -forward.z;
      const cosYaw = Math.cos(look.yaw);
      const sinYaw = Math.sin(look.yaw);
      const orbitX = rearX * cosYaw + rearZ * sinYaw;
      const orbitZ = -rearX * sinYaw + rearZ * cosYaw;
      camTarget.set(
        pos.x + orbitX * horizontalDistance,
        pos.y + baseH + Math.sin(look.pitch) * distance,
        pos.z + orbitZ * horizontalDistance,
      );
      camTarget.y = Math.max(pos.y + 0.85, camTarget.y);

      const orbitAmount = Math.min(1, Math.abs(look.yaw) * 2);
      const lookAheadDist = THREE.MathUtils.lerp(
        C.cameraLookAhead + speedKph * 0.06,
        1.5,
        orbitAmount,
      );
      lookAt
        .set(pos.x, pos.y + 0.95, pos.z)
        .addScaledVector(forward, lookAheadDist);
    } else if (bumperCam) {
      camTarget
        .set(pos.x, pos.y + 0.55, pos.z)
        .addScaledVector(forward, 2.15);
      lookAt
        .set(pos.x, pos.y + 0.62, pos.z)
        .addScaledVector(forward, 24);
    } else {
      // Cockpit / windscreen cam — sit in the cabin looking out, not inside
      // the hood mesh. Slightly above the tub, just behind the windscreen.
      const eyeHeight = pos.y + 1.38;
      camTarget
        .set(pos.x, eyeHeight, pos.z)
        .addScaledVector(forward, -0.15);
      lookAt
        .set(pos.x, eyeHeight - 0.08, pos.z)
        .addScaledVector(forward, 28);
    }

    const cam2 = cameraRef.current;
    const modeChanged = prevCameraMode.current !== cameraMode;
    prevCameraMode.current = cameraMode;
    const teleportDist = camSmooth.distanceToSquared(camTarget);
    const jumped = !scratch.current.camReady || modeChanged || teleportDist > 900;
    if (jumped) {
      camSmooth.copy(camTarget);
      lookAtSmooth.copy(lookAt);
      scratch.current.camReady = true;
    } else {
      const followRate = chaseLike ? 9.5 : 14;
      const lookRate = chaseLike ? 11 : 16;
      camSmooth.lerp(camTarget, 1 - Math.exp(-followRate * delta));
      lookAtSmooth.lerp(lookAt, 1 - Math.exp(-lookRate * delta));
    }
    cam2.position.copy(camSmooth);
    cam2.position.y = Math.max(
      cam2.position.y,
      pos.y + (bumperCam ? 0.35 : 0.9),
    );

    if (shakeRef.current > 0.04) {
      const mag = shakeRef.current * 0.1;
      cam2.position.x += (Math.random() - 0.5) * mag;
      cam2.position.y += (Math.random() - 0.5) * mag * 0.45;
      cam2.position.z += (Math.random() - 0.5) * mag;
      shakeRef.current *= Math.exp(-10 * delta);
    } else {
      shakeRef.current = 0;
    }
    if (sparkMesh.current) {
      const age = Math.max(0, (sparkMesh.current.userData.age ?? 0) - delta * 3.2);
      sparkMesh.current.userData.age = age;
      sparkMesh.current.visible = age > 0.05;
      const mat = sparkMesh.current.material;
      if (mat && "opacity" in mat) {
        (mat as THREE.MeshBasicMaterial).opacity = age * 0.55;
      }
    }

    cam2.lookAt(lookAtSmooth);

    // Broadcast position to multiplayer server — throttle more with bigger grids
    if (useMultiplayerStore.getState().racing) {
      const now = performance.now();
      const room = useMultiplayerStore.getState().currentRoom;
      const grid = room?.players.length ?? 2;
      const sendEveryMs = grid >= 6 ? 80 : grid >= 4 ? 55 : 45;
      if (!scratch.current.lastNetSend || now - scratch.current.lastNetSend > sendEveryMs) {
        scratch.current.lastNetSend = now;
        const rot = body.rotation();
        const gs = useGameStore.getState();
        sendCarState({
          x: pos.x, y: pos.y, z: pos.z,
          qx: rot.x, qy: rot.y, qz: rot.z, qw: rot.w,
          speed: speedKph,
          gear: scratch.current.gear ?? 0,
          steer: scratch.current.steer ?? 0,
          checkpointIndex: gs.checkpointIndex ?? 0,
          raceTimeMs: gs.elapsedMs ?? 0,
        });
      }
    }

    // FOV stays nearly fixed so speed doesn't smear the view.
    const cam = cameraRef.current;
    if (cam instanceof THREE.PerspectiveCamera) {
      const restFov = cameraMode === "hood" ? 62 : C.fovRest;
      const topFov = cameraMode === "hood" ? 66 : C.fovTop;
      cam.near = cameraMode === "hood" ? 0.08 : 0.15;
      const nextFov = THREE.MathUtils.lerp(
        cam.fov,
        THREE.MathUtils.lerp(restFov, topFov, speedRatio * 0.5),
        0.08,
      );
      if (Math.abs(nextFov - cam.fov) > 0.05) {
        cam.fov = nextFov;
        cam.updateProjectionMatrix();
      }
    }
  });

  const col = vehicle.collider;

  return (
    <>
      <RigidBody
        key={vehicle.id}
        ref={bodyRef}
        colliders={false}
        position={[spawn.position.x, spawn.position.y + C.spawnHeight, spawn.position.z]}
        rotation={[0, spawn.yaw, 0]}
        mass={vehicle.mass}
        linearDamping={0.06}
        angularDamping={5.2}
        enabledRotations={[false, true, false]}
        canSleep={false}
        ccd
        gravityScale={0}
      >
        <CuboidCollider
          args={[col.halfWidth, col.halfHeight, col.halfLength]}
          position={[0, col.offsetY, 0]}
          friction={0.95}
          restitution={0}
        />
      </RigidBody>

      <group ref={meshRef} visible={cameraMode !== "hood"}>
        <VehicleBody
          id={vehicle.id}
          paint={visual.paint}
          paintDark={visual.paintDark}
          bumper={visual.bumper}
          wing={visual.wing}
          kit={visual.kit}
        />
        <TyreSmoke input={visualInput} />
        <mesh ref={sparkMesh} position={[0, 0.35, 1.6]} visible={false}>
          <sphereGeometry args={[0.18, 6, 6]} />
          <meshBasicMaterial
            color="#ffcc77"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}
