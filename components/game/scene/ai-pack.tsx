"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import {
  aiLaneOffset,
  aiPersonality,
  aiStartDistance,
  getAiArc,
  stepAiAlongRoad,
} from "@/lib/game/ai-driver";
import type { RoadSample } from "@/lib/game/road-mesh";
import type { ResolvedAiOpponent } from "@/lib/game/race-setup";
import { AutoGearbox } from "@/lib/game/gearbox";
import { getVehicle, type VehicleId } from "@/lib/game/vehicles";
import { weatherGripMul } from "@/lib/game/weather";
import { useGameStore } from "@/stores/game-store";

interface AiPackProps {
  samples: RoadSample[];
  opponents: ResolvedAiOpponent[];
}

export function AiPack({ samples, opponents }: AiPackProps) {
  const groups = useRef<Array<THREE.Group | null>>([]);
  const distances = useRef<Float32Array>(new Float32Array(0));
  const speeds = useRef<Float32Array>(new Float32Array(0));
  const poses = useRef<
    Array<ReturnType<typeof stepAiAlongRoad>["pose"] | undefined>
  >([]);
  const placed = useRef(false);
  const tickAcc = useRef(0);
  const gearboxes = useRef<AutoGearbox[]>([]);
  const paused = useGameStore((s) => s.paused);
  const finished = useGameStore((s) => s.finished);
  const introActive = useGameStore((s) => s.introActive);
  const countdown = useGameStore((s) => s.countdown);
  const garageConfirmed = useGameStore((s) => s.garageConfirmed);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const restartToken = useGameStore((s) => s.restartToken);
  const weather = useGameStore((s) => s.weather);
  const weatherGrip = weatherGripMul(weather);

  const arc = useMemo(() => getAiArc(samples), [samples]);
  const vehicles = useMemo(
    () => opponents.map((opp) => getVehicle(opp.vehicleId)),
    [opponents],
  );

  useEffect(() => {
    gearboxes.current = opponents.map(
      (opp) => new AutoGearbox(opp.vehicleId as VehicleId),
    );
  }, [opponents, restartToken]);
  const laterals = useMemo(
    () => opponents.map((opp) => aiLaneOffset(opp.gridIndex)),
    [opponents],
  );
  const starts = useMemo(
    () => opponents.map((opp) => aiStartDistance(samples, opp.startOffsetM, arc)),
    [arc, opponents, samples],
  );

  const placePack = () => {
    if (opponents.length === 0) return;
    distances.current = Float32Array.from(starts);
    speeds.current = new Float32Array(opponents.length);
    opponents.forEach((opp, i) => {
      const group = groups.current[i];
      if (!group) return;
      const { pose } = stepAiAlongRoad(
        samples,
        starts[i],
        vehicles[i],
        opp.paceMul,
        0,
        false,
        laterals[i],
        arc,
        0,
        opp.skill,
        weatherGrip,
        gearboxes.current[i] ?? null,
        aiPersonality(opp.gridIndex),
      );
      poses.current[i] = pose;
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.set(0, pose.yaw, 0);
      group.visible = true;
    });
    placed.current = true;
  };

  useEffect(() => {
    placed.current = false;
    placePack();
    // place after refs attach
    const id = requestAnimationFrame(placePack);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on grid / restart only
  }, [arc, laterals, opponents, samples, starts, restartToken, vehicles]);

  useFrame((_, delta) => {
    if (opponents.length === 0) return;
    if (!placed.current) placePack();
    // Lights out: garage done, countdown finished, not paused/finished.
    // Do NOT wait for `started` — that only flips at the first checkpoint.
    const racing =
      garageConfirmed &&
      sessionConfirmed &&
      !introActive &&
      countdown === null &&
      !paused &&
      !finished;
    if (!racing) {
      tickAcc.current = 0;
      return;
    }
    // Same 1/60 catch-up as Rapier — one useFrame step was losing time
    // whenever the renderer dropped below 60, so the pack looked slow.
    const stepDt = 1 / 60;
    tickAcc.current += Math.min(0.12, delta);
    let steps = 0;
    while (tickAcc.current >= stepDt && steps < 5) {
      tickAcc.current -= stepDt;
      steps += 1;
      for (let i = 0; i < opponents.length; i += 1) {
        const stepped = stepAiAlongRoad(
          samples,
          distances.current[i] ?? starts[i],
          vehicles[i],
          opponents[i].paceMul,
          stepDt,
          true,
          laterals[i],
          arc,
          speeds.current[i] ?? 0,
          opponents[i].skill,
          weatherGrip,
          gearboxes.current[i] ?? null,
          aiPersonality(opponents[i].gridIndex),
        );
        distances.current[i] = stepped.distanceM;
        speeds.current[i] = stepped.speedMs;
        poses.current[i] = stepped.pose;
      }
    }
    for (let i = 0; i < opponents.length; i += 1) {
      const group = groups.current[i];
      const pose = poses.current[i];
      if (!group || !pose) continue;
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.set(0, pose.yaw, 0);
    }
  });

  return (
    <group>
      {opponents.map((opp, i) => (
        <group
          key={`${opp.id}-${restartToken}`}
          ref={(node) => {
            groups.current[i] = node;
          }}
          frustumCulled
        >
          <VehicleBody
            id={opp.vehicleId}
            paint={opp.paint}
            paintDark={opp.paintDark}
            simple
          />
        </group>
      ))}
    </group>
  );
}
