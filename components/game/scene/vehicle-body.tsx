"use client";

import { createContext, useContext } from "react";
import { RoundedBox } from "@react-three/drei";
import { CarAeroParts } from "@/components/game/scene/car-aero-parts";
import type { BumperStyle, KitStyle, WingStyle } from "@/lib/game/cosmetics";
import type { VehicleId } from "@/lib/game/vehicles";

const SimpleCarCtx = createContext(false);
const GhostCarCtx = createContext(false);

/** Tyre facing along X so the disc faces outward (not a roller on its side). */
function Wheel({
  x,
  y,
  z,
  radius,
  width,
  rim = "#c8d0da",
  simple = false,
}: {
  x: number;
  y: number;
  z: number;
  radius: number;
  width: number;
  rim?: string;
  simple?: boolean;
}) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 16]} />
        <meshStandardMaterial color="#121212" roughness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, width * 1.06, 14]} />
        <meshStandardMaterial color={rim} metalness={0.82} roughness={0.22} />
      </mesh>
      {simple
        ? null
        : Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} rotation={[0, (i / 5) * Math.PI, 0]}>
              <boxGeometry args={[radius * 0.08, width * 0.35, radius * 1.05]} />
              <meshStandardMaterial color={rim} metalness={0.7} roughness={0.28} />
            </mesh>
          ))}
      <mesh>
        <cylinderGeometry args={[radius * 0.16, radius * 0.16, width * 1.18, 8]} />
        <meshStandardMaterial color="#1c2026" metalness={0.45} roughness={0.45} />
      </mesh>
    </group>
  );
}

function BodyPaint({ color }: { color: string }) {
  const simple = useContext(SimpleCarCtx);
  const ghost = useContext(GhostCarCtx);
  if (ghost) {
    return (
      <meshStandardMaterial
        color={color}
        metalness={0.22}
        roughness={0.42}
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    );
  }
  if (simple) {
    return (
      <meshStandardMaterial
        color={color}
        metalness={0.28}
        roughness={0.42}
        emissive={color}
        emissiveIntensity={0.18}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.42}
      roughness={0.28}
      clearcoat={0.85}
      clearcoatRoughness={0.12}
      envMapIntensity={1.1}
    />
  );
}

function Glass({ opacity = 0.42 }: { opacity?: number }) {
  const simple = useContext(SimpleCarCtx);
  if (simple) {
    return (
      <meshStandardMaterial
        color="#0c1824"
        metalness={0.2}
        roughness={0.18}
        transparent
        opacity={opacity}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color="#0c1824"
      metalness={0.15}
      roughness={0.06}
      transmission={0.35}
      thickness={0.4}
      transparent
      opacity={opacity}
      envMapIntensity={1.3}
    />
  );
}

export function VehicleBody({
  id,
  paint,
  paintDark,
  bumper = "stock",
  wing = "none",
  kit = "none",
  simple = false,
  ghost = false,
}: {
  id: VehicleId;
  paint: string;
  paintDark: string;
  bumper?: BumperStyle;
  wing?: WingStyle;
  kit?: KitStyle;
  simple?: boolean;
  ghost?: boolean;
}) {
  return (
    <SimpleCarCtx.Provider value={simple}>
      <GhostCarCtx.Provider value={ghost}>
        <VehicleMesh
          id={id}
          paint={paint}
          paintDark={paintDark}
          simple={simple}
          bumper={bumper}
          wing={wing}
          kit={kit}
        />
      </GhostCarCtx.Provider>
    </SimpleCarCtx.Provider>
  );
}

function VehicleMesh({
  id,
  paint,
  paintDark,
  simple,
  bumper,
  wing,
  kit,
}: {
  id: VehicleId;
  paint: string;
  paintDark: string;
  simple: boolean;
  bumper: BumperStyle;
  wing: WingStyle;
  kit: KitStyle;
}) {
  const carbon = "#12151a";
  const rimBright = "#d6dde6";
  const rimDark = "#8a929c";

  if (id === "f1") {
    return (
      <group>
        {/* Narrow monocoque */}
        <RoundedBox args={[0.72, 0.28, 3.6]} radius={0.05} position={[0, 0.32, 0.1]} castShadow>
          <BodyPaint color={paint} />
        </RoundedBox>
        <mesh position={[0, 0.28, 0.15]} castShadow>
          <boxGeometry args={[0.95, 0.16, 2.4]} />
          <meshStandardMaterial color={carbon} roughness={0.55} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 0.26, 1.85]} castShadow>
          <boxGeometry args={[0.35, 0.14, 0.9]} />
          <BodyPaint color={paint} />
        </mesh>
        {/* Factory front wing — replaced by bumper cosmetics when not stock */}
        {bumper === "stock" ? (
          <group>
            <RoundedBox args={[1.85, 0.06, 0.38]} radius={0.02} position={[0, 0.18, 2.15]} castShadow>
              <BodyPaint color={paint} />
            </RoundedBox>
            <mesh position={[0, 0.14, 2.15]}>
              <boxGeometry args={[1.7, 0.04, 0.12]} />
              <meshStandardMaterial color={paintDark} />
            </mesh>
          </group>
        ) : null}
        {/* Factory rear wing — replaced by cosmetic wing when not "none" */}
        {wing === "none" ? (
          <group>
            <mesh position={[0, 0.55, -1.85]} castShadow>
              <boxGeometry args={[0.08, 0.55, 0.08]} />
              <meshStandardMaterial color="#bbb" metalness={0.6} roughness={0.3} />
            </mesh>
            <RoundedBox args={[0.95, 0.06, 0.32]} radius={0.02} position={[0, 0.82, -1.85]} castShadow>
              <meshStandardMaterial color={paintDark} />
            </RoundedBox>
            <RoundedBox args={[1.75, 0.05, 0.28]} radius={0.02} position={[0, 0.22, -1.95]} castShadow>
              <meshStandardMaterial color={paintDark} metalness={0.3} roughness={0.35} />
            </RoundedBox>
          </group>
        ) : (
          <RoundedBox args={[1.75, 0.05, 0.28]} radius={0.02} position={[0, 0.22, -1.95]} castShadow>
            <meshStandardMaterial color={paintDark} metalness={0.3} roughness={0.35} />
          </RoundedBox>
        )}
        {/* Halo / cockpit */}
        <mesh position={[0, 0.58, -0.15]} castShadow>
          <boxGeometry args={[0.5, 0.32, 0.85]} />
          <meshStandardMaterial color={carbon} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.72, -0.05]}>
          <boxGeometry args={[0.42, 0.12, 0.55]} />
          <Glass opacity={0.45} />
        </mesh>
        {/* Sidepods */}
        {([-1, 1] as const).map((side) => (
          <RoundedBox
            key={`pod-${side}`}
            args={[0.38, 0.28, 1.5]}
            radius={0.06}
            position={[side * 0.55, 0.34, -0.2]}
            castShadow
          >
          <BodyPaint color={paint} />
        </RoundedBox>
        ))}
        {/* Open-wheel — wide track, clear of body */}
        <Wheel x={-0.95} y={0.28} z={1.45} radius={0.3} width={0.32} rim={rimBright} simple={simple} />
        <Wheel x={0.95} y={0.28} z={1.45} radius={0.3} width={0.32} rim={rimBright} simple={simple} />
        <Wheel x={-1.0} y={0.3} z={-1.35} radius={0.34} width={0.38} rim={rimBright} simple={simple} />
        <Wheel x={1.0} y={0.3} z={-1.35} radius={0.34} width={0.38} rim={rimBright} simple={simple} />
        <CarAeroParts vehicleId={id} bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />
      </group>
    );
  }

  if (id === "gwagon") {
    return (
      <group>
        {/* Boxy body */}
        <RoundedBox args={[2.05, 1.05, 4.15]} radius={0.06} position={[0, 1.0, 0]} castShadow>
          <BodyPaint color={paint} />
        </RoundedBox>
        {/* Roof */}
        <mesh position={[0, 1.58, -0.05]} castShadow>
          <boxGeometry args={[1.95, 0.12, 2.6]} />
          <meshStandardMaterial color={paintDark} roughness={0.55} />
        </mesh>
        {/* Greenhouse */}
        <mesh position={[0, 1.38, 0.05]}>
          <boxGeometry args={[1.88, 0.48, 2.35]} />
          <Glass opacity={0.5} />
        </mesh>
        {/* Hood ledge */}
        <mesh position={[0, 0.82, 1.55]} castShadow>
          <boxGeometry args={[1.9, 0.35, 1.1]} />
          <BodyPaint color={paint} />
        </mesh>
        {/* Grille / lamps */}
        <mesh position={[0, 0.78, 2.12]}>
          <boxGeometry args={[1.55, 0.35, 0.08]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.7} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={`lamp-${side}`} position={[side * 0.72, 0.72, 2.14]}>
            <boxGeometry args={[0.28, 0.16, 0.06]} />
            <meshStandardMaterial color="#f2f0e6" emissive="#fff4d0" emissiveIntensity={0.35} />
          </mesh>
        ))}
        {/* Side steps */}
        {([-1, 1] as const).map((side) => (
          <mesh key={`step-${side}`} position={[side * 1.08, 0.42, 0]}>
            <boxGeometry args={[0.12, 0.08, 2.4]} />
            <meshStandardMaterial color="#2a2e32" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        <Wheel x={-0.98} y={0.42} z={1.4} radius={0.42} width={0.34} rim={rimDark} simple={simple} />
        <Wheel x={0.98} y={0.42} z={1.4} radius={0.42} width={0.34} rim={rimDark} simple={simple} />
        <Wheel x={-0.98} y={0.42} z={-1.4} radius={0.42} width={0.34} rim={rimDark} simple={simple} />
        <Wheel x={0.98} y={0.42} z={-1.4} radius={0.42} width={0.34} rim={rimDark} simple={simple} />
        <CarAeroParts vehicleId={id} bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />
      </group>
    );
  }

  if (id === "corsa") {
    return (
      <group>
        {/* Hatch body */}
        <RoundedBox args={[1.72, 0.52, 3.55]} radius={0.14} position={[0, 0.52, 0.05]} castShadow>
          <BodyPaint color={paint} />
        </RoundedBox>
        {/* Cabin / roof bubble */}
        <RoundedBox args={[1.5, 0.42, 1.55]} radius={0.12} position={[0, 0.92, -0.25]} castShadow>
          <BodyPaint color={paint} />
        </RoundedBox>
        <mesh position={[0, 0.98, -0.2]}>
          <boxGeometry args={[1.38, 0.32, 1.35]} />
          <Glass />
        </mesh>
        {/* Nose / lights */}
        <mesh position={[0, 0.42, 1.78]}>
          <boxGeometry args={[1.5, 0.2, 0.14]} />
          <meshStandardMaterial color={paintDark} roughness={0.4} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={`hl-${side}`} position={[side * 0.58, 0.42, 1.84]}>
            <boxGeometry args={[0.32, 0.12, 0.06]} />
            <meshStandardMaterial color="#f5f3ea" emissive="#fff6d8" emissiveIntensity={0.3} />
          </mesh>
        ))}
        {/* Rear hatch cue */}
        <mesh position={[0, 0.7, -1.7]}>
          <boxGeometry args={[1.4, 0.35, 0.12]} />
          <meshStandardMaterial color={paintDark} roughness={0.4} />
        </mesh>
        <Wheel x={-0.78} y={0.3} z={1.15} radius={0.29} width={0.22} rim={rimBright} simple={simple} />
        <Wheel x={0.78} y={0.3} z={1.15} radius={0.29} width={0.22} rim={rimBright} simple={simple} />
        <Wheel x={-0.78} y={0.3} z={-1.15} radius={0.29} width={0.22} rim={rimBright} simple={simple} />
        <Wheel x={0.78} y={0.3} z={-1.15} radius={0.29} width={0.22} rim={rimBright} simple={simple} />
        <CarAeroParts vehicleId={id} bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />
      </group>
    );
  }

  // Sports GT — lower, wider, clear windshield / side glass / rear deck
  return (
    <group>
      <RoundedBox
        args={[1.92, 0.36, 4.5]}
        radius={0.12}
        smoothness={4}
        position={[0, 0.38, 0.05]}
        castShadow
      >
        <BodyPaint color={paint} />
      </RoundedBox>
      {/* Hood scoop plane */}
      <RoundedBox
        args={[1.58, 0.1, 1.65]}
        radius={0.06}
        smoothness={3}
        position={[0, 0.58, 1.2]}
        castShadow
      >
        <BodyPaint color={paint} />
      </RoundedBox>
      {/* Cabin */}
      <RoundedBox
        args={[1.52, 0.4, 1.55]}
        radius={0.08}
        position={[0, 0.7, -0.32]}
        castShadow
      >
        <BodyPaint color={paint} />
      </RoundedBox>
      <mesh position={[0, 0.8, -0.32]}>
        <boxGeometry args={[1.38, 0.3, 1.3]} />
        <Glass opacity={0.48} />
      </mesh>
      {/* Side windows */}
      {([-1, 1] as const).map((side) => (
        <mesh key={`sw-${side}`} position={[side * 0.76, 0.78, -0.28]} rotation={[0, side * 0.02, 0]}>
          <boxGeometry args={[0.06, 0.26, 1.15]} />
          <Glass opacity={0.4} />
        </mesh>
      ))}
      {/* Rear deck + diffuser cue */}
      <mesh position={[0, 0.52, -2.05]} castShadow>
        <boxGeometry args={[1.7, 0.14, 0.55]} />
        <BodyPaint color={paint} />
      </mesh>
      <mesh position={[0, 0.32, -2.28]}>
        <boxGeometry args={[1.55, 0.1, 0.28]} />
        <meshStandardMaterial color={carbon} roughness={0.5} />
      </mesh>
      {/* Front splitter stock */}
      <mesh position={[0, 0.18, 2.28]}>
        <boxGeometry args={[1.7, 0.06, 0.22]} />
        <meshStandardMaterial color={carbon} roughness={0.55} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={`hl-${side}`} position={[side * 0.64, 0.36, 2.24]}>
          <boxGeometry args={[0.38, 0.1, 0.08]} />
          <meshStandardMaterial color="#fff4d8" emissive="#ffe8a0" emissiveIntensity={0.45} />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh key={`tl-${side}`} position={[side * 0.7, 0.48, -2.3]}>
          <boxGeometry args={[0.28, 0.08, 0.05]} />
          <meshStandardMaterial color="#ff3030" emissive="#ff2020" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh key={`mir-${side}`} position={[side * 0.94, 0.7, 0.4]}>
          <boxGeometry args={[0.14, 0.08, 0.1]} />
          <meshStandardMaterial color="#1a1d22" metalness={0.45} roughness={0.32} />
        </mesh>
      ))}
      {/* Dual exhaust */}
      <mesh position={[0.32, 0.26, -2.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.14, 8]} />
        <meshStandardMaterial color="#2a2e32" metalness={0.65} roughness={0.28} />
      </mesh>
      <mesh position={[-0.32, 0.26, -2.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.14, 8]} />
        <meshStandardMaterial color="#2a2e32" metalness={0.65} roughness={0.28} />
      </mesh>
      <Wheel x={-0.9} y={0.3} z={1.38} radius={0.33} width={0.3} rim={rimBright} simple={simple} />
      <Wheel x={0.9} y={0.3} z={1.38} radius={0.33} width={0.3} rim={rimBright} simple={simple} />
      <Wheel x={-0.9} y={0.3} z={-1.38} radius={0.33} width={0.3} rim={rimBright} simple={simple} />
      <Wheel x={0.9} y={0.3} z={-1.38} radius={0.33} width={0.3} rim={rimBright} simple={simple} />
      <CarAeroParts vehicleId={id} bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />
    </group>
  );
}
