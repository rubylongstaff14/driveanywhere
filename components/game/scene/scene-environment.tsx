"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sky, Environment } from "@react-three/drei";
import type { DirectionalLight } from "three";
import { carTelemetry } from "@/lib/game/telemetry";
import type { WeatherId } from "@/lib/game/weather";
import type { QualityConfig } from "@/stores/settings-store";

interface SceneEnvironmentProps {
  quality: QualityConfig;
  dusk?: boolean;
  desert?: boolean;
  weather?: WeatherId;
}

export function SceneEnvironment({
  quality,
  dusk = false,
  desert = false,
  weather = "clear",
}: SceneEnvironmentProps) {
  const sunRef = useRef<DirectionalLight>(null);
  const night = weather === "night";
  const rain = weather === "rain";
  const duskLook = weather === "dusk" || (weather === "clear" && dusk);
  const sunOffset = desert && weather === "clear"
    ? ([140, 110, -60] as const)
    : night
      ? ([40, 18, -90] as const)
      : rain
        ? ([60, 55, -100] as const)
        : duskLook
          ? ([-120, 45, -180] as const)
          : ([80, 90, -140] as const);
  const useEnvironmentMap = quality.drawDistance >= 360 && !desert && !night;

  useFrame(() => {
    const light = sunRef.current;
    if (!light || !quality.shadows) return;
    light.position.set(
      carTelemetry.x + sunOffset[0],
      sunOffset[1],
      carTelemetry.z + sunOffset[2],
    );
    light.target.position.set(carTelemetry.x, 0, carTelemetry.z);
    light.target.updateMatrixWorld();
  });

  const fogNear = rain
    ? quality.fogFar * 0.28
    : night
      ? quality.fogFar * 0.35
      : desert
        ? quality.fogFar * 0.55
        : quality.fogFar * 0.55;
  const fogFar = rain
    ? Math.max(quality.fogFar * 0.85, 220)
    : night
      ? Math.max(quality.fogFar * 0.9, 260)
      : desert
        ? Math.max(quality.fogFar * 1.6, 700)
        : quality.fogFar;
  const fogColor = rain
    ? "#6a7684"
    : night
      ? "#070b14"
      : desert
        ? "#d8c49a"
        : duskLook
          ? "#152636"
          : "#6f8298";

  const skySun: [number, number, number] = desert && weather === "clear"
    ? [140, 40, -60]
    : night
      ? [40, 2, -90]
      : rain
        ? [60, 12, -100]
        : duskLook
          ? [-120, 8, -180]
          : [80, 30, -140];

  return (
    <>
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <Sky
        distance={4500}
        sunPosition={skySun}
        turbidity={night ? 12 : rain ? 14 : desert ? 4 : duskLook ? 9 : 7}
        rayleigh={night ? 0.35 : rain ? 1.1 : desert ? 0.9 : duskLook ? 3.2 : 2.0}
        mieCoefficient={night ? 0.02 : rain ? 0.018 : desert ? 0.004 : 0.009}
        mieDirectionalG={0.84}
        inclination={night ? 0.62 : 0.52}
        azimuth={0.22}
      />

      <hemisphereLight
        args={[
          night ? "#3a4e72" : rain ? "#9aa8b8" : desert ? "#ffe8c0" : duskLook ? "#547fa8" : "#c8daf0",
          night ? "#080a10" : rain ? "#2a3038" : desert ? "#8a6040" : duskLook ? "#171c25" : "#3a2818",
          night ? 0.28 : rain ? 0.5 : desert ? 0.85 : duskLook ? 0.42 : 0.7,
        ]}
      />
      <ambientLight intensity={night ? 0.04 : rain ? 0.12 : desert ? 0.22 : duskLook ? 0.06 : 0.1} />

      <directionalLight
        ref={sunRef}
        castShadow={quality.shadows}
        intensity={night ? 0.35 : rain ? 0.85 : desert ? 2.6 : duskLook ? 1.7 : 2.2}
        position={[...sunOffset]}
        color={night ? "#8aa4d4" : rain ? "#c8d4e0" : desert ? "#fff2c8" : duskLook ? "#ffb77d" : "#fff0cc"}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
      />

      <directionalLight
        intensity={night ? 0.12 : duskLook ? 0.2 : 0.3}
        position={[-60, 40, 80]}
        color={night ? "#4a6288" : duskLook ? "#789bc6" : "#a8c0e0"}
      />

      {useEnvironmentMap ? (
        <Environment preset="city" background={false} />
      ) : null}
    </>
  );
}
