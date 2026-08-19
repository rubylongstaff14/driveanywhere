"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import {
  loadGhostTape,
  sampleGhostPose,
} from "@/lib/game/ghost-tape";
import { carTelemetry } from "@/lib/game/telemetry";
import { getVehicle } from "@/lib/game/vehicles";
import { useGameStore } from "@/stores/game-store";

interface GhostCarProps {
  routeId: string;
}

export function GhostCar({ routeId }: GhostCarProps) {
  const group = useRef<THREE.Group>(null);
  const tape = useMemo(() => loadGhostTape(routeId), [routeId]);
  const vehicle = useMemo(
    () => getVehicle(tape?.vehicleId),
    [tape?.vehicleId],
  );
  const started = useGameStore((s) => s.started);
  const paused = useGameStore((s) => s.paused);
  const finished = useGameStore((s) => s.finished);
  const introActive = useGameStore((s) => s.introActive);
  const countdown = useGameStore((s) => s.countdown);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const ghostEnabled = useGameStore((s) => s.ghostEnabled);
  const raceMode = useGameStore((s) => s.raceMode);

  const active =
    Boolean(tape) &&
    ghostEnabled &&
    raceMode === "solo" &&
    sessionConfirmed &&
    !introActive &&
    countdown === null;

  useEffect(() => {
    const node = group.current;
    if (!node || !tape) return;
    const first = tape.frames[0];
    node.position.set(first.x, first.y, first.z);
    node.rotation.set(0, first.yaw, 0);
    node.visible = active;
  }, [active, tape]);

  useFrame(() => {
    const node = group.current;
    if (!node || !tape || !active) {
      if (node) node.visible = false;
      return;
    }
    node.visible = true;
    if (!started || paused || finished) return;
    const pose = sampleGhostPose(tape, carTelemetry.elapsedMs);
    if (!pose) return;
    node.position.set(pose.x, pose.y, pose.z);
    node.rotation.set(0, pose.yaw, 0);
  });

  if (!tape) return null;

  return (
    <group ref={group} frustumCulled>
      <group>
        <VehicleBody
          id={vehicle.id}
          paint="#d8dee8"
          paintDark="#8a929c"
          simple
          ghost
        />
      </group>
    </group>
  );
}

export function ghostTapeReady(routeId: string) {
  return loadGhostTape(routeId);
}
