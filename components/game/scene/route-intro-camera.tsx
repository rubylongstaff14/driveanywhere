"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildRouteIntroPath,
  ROUTE_INTRO_SECONDS,
  sampleIntroPath,
} from "@/lib/game/route-intro";
import type { RoadSample } from "@/lib/game/road-mesh";
import { RoadTracker } from "@/lib/game/road-tracker";
import type { RouteData } from "@/lib/validation/route-data";
import { useGameStore } from "@/stores/game-store";

interface RouteIntroCameraProps {
  route: RouteData;
  samples: RoadSample[];
}

const UP = new THREE.Vector3(0, 1, 0);
const lookMatrix = new THREE.Matrix4();
const targetQuat = new THREE.Quaternion();

/** ~7 s establishing fly-through, then hands off to the start lights. */
export function RouteIntroCamera({ route, samples }: RouteIntroCameraProps) {
  const { camera } = useThree();
  const introActive = useGameStore((s) => s.introActive);
  const restartToken = useGameStore((s) => s.restartToken);
  const beginCountdown = useGameStore((s) => s.beginCountdown);
  const finishIntro = useGameStore((s) => s.finishIntro);

  const elapsed = useRef(0);
  const finished = useRef(false);
  const smoothQuat = useRef(new THREE.Quaternion());
  const spawn = useMemo(() => {
    const s = new RoadTracker(samples).spawn();
    return {
      position: new THREE.Vector3(s.position.x, s.position.y, s.position.z),
      yaw: s.yaw,
    };
  }, [samples]);
  const path = useMemo(
    () =>
      buildRouteIntroPath(route, samples, {
        position: spawn.position,
        yaw: spawn.yaw,
      }),
    [route, samples, spawn],
  );

  useEffect(() => {
    if (!introActive) {
      elapsed.current = 0;
      finished.current = false;
      return;
    }
    elapsed.current = 0;
    finished.current = false;
    const seed = sampleIntroPath(path, 0);
    lookMatrix.lookAt(seed.position, seed.lookAt, UP);
    smoothQuat.current.setFromRotationMatrix(lookMatrix);
    camera.position.copy(seed.position);
    camera.quaternion.copy(smoothQuat.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = seed.fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, introActive, path, restartToken]);

  useFrame((_, delta) => {
    if (!introActive || finished.current) return;

    elapsed.current += Math.min(0.05, delta);
    const u = elapsed.current / ROUTE_INTRO_SECONDS;
    const { position, lookAt, fov } = sampleIntroPath(path, u);

    camera.position.copy(position);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 1 - Math.exp(-6 * delta));
      camera.updateProjectionMatrix();
    }

    lookMatrix.lookAt(camera.position, lookAt, UP);
    targetQuat.setFromRotationMatrix(lookMatrix);
    const turnRate = 1 - Math.exp(-7.5 * delta);
    smoothQuat.current.slerp(targetQuat, turnRate);
    camera.quaternion.copy(smoothQuat.current);

    if (u >= 1) {
      finished.current = true;
      finishIntro();
      beginCountdown();
    }
  });

  return null;
}
