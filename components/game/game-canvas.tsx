"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  ToneMapping,
  HueSaturation,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useState } from "react";
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
import {
  QUALITY_PRESETS,
  useSettingsStore,
  type QualityPreset,
} from "@/stores/settings-store";

interface GameCanvasProps {
  paused: boolean;
  route: RouteData;
}

export function GameCanvas({ paused, route }: GameCanvasProps) {
  // One shared centreline sampling drives the mesh, collision and the car.
  const samples = useMemo(() => sampleRoad(route.roadPoints, 10), [route]);
  const selectedQuality = useSettingsStore((s) => s.quality);
  const [runtimeQuality, setRuntimeQuality] =
    useState<QualityPreset>(selectedQuality);
  const quality = QUALITY_PRESETS[runtimeQuality];
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
              lapCount: useGameStore.getState().lapCount,
            },
            selectedVehicleId,
          )
        : [],
    [
      aiCount,
      difficulty,
      raceMode,
      selectedVehicleId,
      sessionConfirmed,
      weather,
    ],
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

  useEffect(() => setRuntimeQuality(selectedQuality), [selectedQuality]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) return;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (cores <= 6 || (memory !== undefined && memory <= 6)) {
      setRuntimeQuality("low");
    } else {
      setRuntimeQuality((current) => (current === "high" ? "medium" : current));
    }
  }, [selectedQuality]);

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
        <PerformanceMonitor
          bounds={(refreshRate) =>
            refreshRate > 90 ? [48, 84] : refreshRate > 55 ? [42, 58] : [28, 44]
          }
          flipflops={2}
          onDecline={() =>
            setRuntimeQuality((current) =>
              current === "high"
                ? "medium"
                : current === "medium"
                  ? "low"
                  : "low",
            )
          }
        />
        <AdaptiveDpr />
        <SceneEnvironment
          quality={quality}
          dusk={Boolean(route.realWorld)}
          desert={
            route.slug === "egypt-pyramids" ||
            route.slug === "dubai-marina-circuit"
          }
          alpine={route.slug === "alps-mountain-pass"}
          weather={weather}
        />
        <RouteIntroCamera route={route} samples={samples} />
        <Physics gravity={[0, -20, 0]} paused={paused} timeStep={1 / 60}>
          <RouteWorld
            route={route}
            samples={samples}
            quality={quality}
            desert={
              route.slug === "egypt-pyramids" ||
              route.slug === "dubai-marina-circuit"
            }
          />
          {!spectating ? <Vehicle route={route} samples={samples} /> : null}
        </Physics>
        {opponents.length > 0 &&
        (raceMode === "ai" || raceMode === "online") ? (
          <AiPack samples={samples} opponents={opponents} />
        ) : null}
        {ghostEnabled && raceMode === "solo" ? (
          <GhostCar routeId={route.id} />
        ) : null}
        <RemotePlayers />
        <RainField wet={weather === "rain"} />
        {quality.drawDistance >= 300 && (
          <EffectComposer>
            {quality.shadows ? (
              <>
                <Bloom
                  intensity={0.32}
                  luminanceThreshold={0.76}
                  luminanceSmoothing={0.35}
                  mipmapBlur
                />
                <Vignette offset={0.45} darkness={0.42} />
                <ChromaticAberration
                  offset={[0.00035, 0.00035]}
                  radialModulation={false}
                  modulationOffset={0}
                />
                <HueSaturation saturation={0.12} />
                <BrightnessContrast brightness={-0.015} contrast={0.08} />
              </>
            ) : null}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
