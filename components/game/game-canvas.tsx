"use client";

import { AdaptiveDpr } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  ToneMapping,
} from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { AiPack } from "@/components/game/scene/ai-pack";
import { GhostCar } from "@/components/game/scene/ghost-car";
import { RemotePlayers } from "@/components/game/scene/remote-players";
import { RainField } from "@/components/game/scene/rain-field";
import { RouteIntroCamera } from "@/components/game/scene/route-intro-camera";
import { RouteWorld } from "@/components/game/scene/route-world";
import { SceneEnvironment } from "@/components/game/scene/scene-environment";
import { Vehicle } from "@/components/game/scene/vehicle";
import { resolveAiOpponents } from "@/lib/game/race-setup";
import { sampleRoad } from "@/lib/game/road-mesh";
import type { RouteData } from "@/lib/validation/route-data";
import { useGameStore } from "@/stores/game-store";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useQualityConfig } from "@/stores/settings-store";

interface GameCanvasProps {
  paused: boolean;
  route: RouteData;
}

export function GameCanvas({ paused, route }: GameCanvasProps) {
  // One shared centreline sampling drives the mesh, collision and the car.
  const samples = useMemo(() => sampleRoad(route.roadPoints, 10), [route]);
  const quality = useQualityConfig();
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const raceMode = useGameStore((s) => s.raceMode);
  const spectating = useMultiplayerStore((s) => s.spectating);
  const aiCount = useGameStore((s) => s.aiCount);
  const difficulty = useGameStore((s) => s.difficulty);
  const ghostEnabled = useGameStore((s) => s.ghostEnabled);
  const weather = useGameStore((s) => s.weather);
  const opponents = useMemo(
    () =>
      sessionConfirmed
        ? resolveAiOpponents(
            {
              mode: raceMode,
              aiCount,
              difficulty,
              ghost: false,
              weather,
              vehicleId: selectedVehicleId,
            },
            selectedVehicleId,
          )
        : [],
    [aiCount, difficulty, raceMode, selectedVehicleId, sessionConfirmed, weather],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        useGameStore.getState().setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // "soft" maps to PCFSoftShadowMap, which Three has deprecated.
  const shadowMode = quality.shadows ? "percentage" : false;

  return (
    <Canvas
      shadows={shadowMode}
      dpr={quality.dpr}
      performance={{ min: 0.5, debounce: 200 }}
      camera={{
        fov: 65,
        near: 0.12,
        far: quality.fogFar + 180,
        position: [0, 6, -12],
      }}
      gl={{
        antialias: quality.antialias,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
        toneMappingExposure: 1.0,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          useGameStore.getState().setPaused(true);
        });
      }}
    >
      <Suspense fallback={null}>
        <AdaptiveDpr />
        <SceneEnvironment
          quality={quality}
          dusk={Boolean(route.realWorld)}
          desert={
            route.slug === "egypt-pyramids" ||
            route.slug === "dubai-marina-circuit"
          }
          weather={weather}
        />
        <RouteIntroCamera route={route} samples={samples} />
        <Physics gravity={[0, -20, 0]} paused={paused} timeStep={1 / 60}>
          <RouteWorld route={route} samples={samples} quality={quality} desert={route.slug === "egypt-pyramids" || route.slug === "dubai-marina-circuit"} />
          {!spectating ? <Vehicle route={route} samples={samples} /> : null}
        </Physics>
        {opponents.length > 0 && (raceMode === "ai" || raceMode === "online") ? (
          <AiPack samples={samples} opponents={opponents} />
        ) : null}
        {ghostEnabled && raceMode === "solo" ? (
          <GhostCar routeId={route.id} />
        ) : null}
        <RemotePlayers />
        <RainField wet={weather === "rain"} />
        {quality.drawDistance >= 300 && (
          <EffectComposer>
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.7}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <Vignette offset={0.4} darkness={0.55} />
            <ChromaticAberration
              offset={[0.0005, 0.0005]}
              radialModulation={false}
              modulationOffset={0}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
