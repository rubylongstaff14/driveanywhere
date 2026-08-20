"use client";

import { useMemo } from "react";
import type { RoadSample } from "@/lib/game/road-mesh";
import { aabbAsphaltClearance } from "@/lib/game/building-road-clearance";
import {
  circuitLandmarksFor,
  type CircuitLandmarkDef,
  type LandmarkKindId,
} from "@/lib/game/circuit-landmarks";

function Mat({
  color,
  metal = 0.28,
  rough = 0.42,
}: {
  color: string;
  metal?: number;
  rough?: number;
}) {
  return (
    <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
  );
}

function Glass({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={0.45}
      roughness={0.16}
      transparent
      opacity={0.9}
      emissive={color}
      emissiveIntensity={0.18}
    />
  );
}

function LandmarkMesh({
  kind,
  h,
  paint,
  accent,
}: {
  kind: LandmarkKindId;
  h: number;
  paint: string;
  accent: string;
}) {
  const w = Math.max(8, h * 0.22);
  switch (kind) {
    case "lattice-spire":
      return (
        <group>
          {[0.12, 0.38, 0.62, 0.82].map((t, i) => (
            <mesh key={t} position={[0, h * t, 0]} castShadow>
              <cylinderGeometry args={[w * (0.28 - t * 0.18), w * (0.34 - t * 0.18), h * 0.22, 8]} />
              <Mat color={i % 2 === 0 ? paint : accent} rough={0.5} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.98, 0]}>
            <coneGeometry args={[w * 0.06, h * 0.12, 8]} />
            <Mat color="#f4f4f1" metal={0.7} rough={0.2} />
          </mesh>
        </group>
      );
    case "pagoda":
      return (
        <group>
          {[0.18, 0.42, 0.66, 0.88].map((t, i) => (
            <group key={t}>
              <mesh position={[0, h * t * 0.85, 0]} castShadow>
                <boxGeometry args={[w * (0.9 - i * 0.14), h * 0.12, w * (0.9 - i * 0.14)]} />
                <Mat color={paint} rough={0.55} />
              </mesh>
              <mesh position={[0, h * t * 0.85 + h * 0.07, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[w * (0.72 - i * 0.12), h * 0.06, 4]} />
                <Mat color={accent} metal={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "torii":
      return (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * w * 0.45, h * 0.42, 0]} castShadow>
              <boxGeometry args={[w * 0.1, h * 0.84, w * 0.1]} />
              <Mat color={paint} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.82, 0]} castShadow>
            <boxGeometry args={[w * 1.35, h * 0.08, w * 0.16]} />
            <Mat color={accent} />
          </mesh>
          <mesh position={[0, h * 0.7, 0]}>
            <boxGeometry args={[w * 1.05, h * 0.05, w * 0.1]} />
            <Mat color={paint} />
          </mesh>
        </group>
      );
    case "capsule":
      return (
        <mesh position={[0, h * 0.5, 0]} scale={[w * 0.22, h * 0.92, w * 0.16]} castShadow>
          <capsuleGeometry args={[1, 1, 4, 12]} />
          <Glass color={paint} />
        </mesh>
      );
    case "clock-spire":
      return (
        <group>
          <mesh position={[0, h * 0.38, 0]} castShadow>
            <boxGeometry args={[w * 0.55, h * 0.76, w * 0.55]} />
            <Mat color={paint} />
          </mesh>
          <mesh position={[0, h * 0.82, w * 0.29]}>
            <circleGeometry args={[w * 0.16, 16]} />
            <meshStandardMaterial color="#f4efe4" emissive={accent} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, h * 0.96, 0]}>
            <coneGeometry args={[w * 0.12, h * 0.16, 8]} />
            <Mat color={accent} metal={0.5} />
          </mesh>
        </group>
      );
    case "sail":
      return (
        <group>
          <mesh position={[0, h * 0.48, 0]} rotation={[0, 0, 0.18]} castShadow>
            <boxGeometry args={[w * 0.12, h * 0.96, w * 0.85]} />
            <Glass color={paint} />
          </mesh>
          <mesh position={[w * 0.08, h * 0.5, 0]} rotation={[0, 0, -0.35]} castShadow>
            <boxGeometry args={[w * 0.08, h * 0.9, w * 0.7]} />
            <Mat color={accent} metal={0.55} rough={0.28} />
          </mesh>
        </group>
      );
    case "twist":
      return (
        <group>
          {Array.from({ length: 10 }, (_, i) => {
            const t = i / 10;
            return (
              <mesh
                key={i}
                position={[0, h * (t + 0.05), 0]}
                rotation={[0, t * 1.6, 0]}
                castShadow
              >
                <boxGeometry args={[w * (0.7 - t * 0.25), h * 0.11, w * (0.55 - t * 0.18)]} />
                <Glass color={paint} />
              </mesh>
            );
          })}
        </group>
      );
    case "tri-needle":
      return (
        <group>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
            <mesh
              key={a}
              position={[Math.cos(a) * w * 0.12, h * 0.5, Math.sin(a) * w * 0.12]}
              castShadow
            >
              <cylinderGeometry args={[w * 0.05, w * 0.16, h, 8]} />
              <Glass color={paint} />
            </mesh>
          ))}
          <mesh position={[0, h * 1.02, 0]}>
            <sphereGeometry args={[w * 0.06, 8, 8]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case "gold-frame":
      return (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * w * 0.42, h * 0.5, 0]} castShadow>
              <boxGeometry args={[w * 0.12, h, w * 0.12]} />
              <Mat color={paint} metal={0.7} rough={0.22} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.96, 0]} castShadow>
            <boxGeometry args={[w * 1.05, h * 0.1, w * 0.14]} />
            <Mat color={accent} metal={0.75} rough={0.2} />
          </mesh>
          <mesh position={[0, h * 0.08, 0]}>
            <boxGeometry args={[w * 1.05, h * 0.08, w * 0.14]} />
            <Mat color={accent} metal={0.75} rough={0.2} />
          </mesh>
        </group>
      );
    case "torus-museum":
      return (
        <group>
          <mesh position={[0, h * 0.42, 0]} rotation={[Math.PI / 2.4, 0, 0.4]} castShadow>
            <torusGeometry args={[w * 0.55, w * 0.16, 10, 24]} />
            <Glass color={paint} />
          </mesh>
          <mesh position={[0, h * 0.12, 0]}>
            <cylinderGeometry args={[w * 0.22, w * 0.28, h * 0.16, 10]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "pyramid":
      return (
        <mesh position={[0, h * 0.5, 0]} castShadow>
          <coneGeometry args={[w * 0.85, h, 4]} />
          <Mat color={paint} rough={0.85} metal={0.05} />
        </mesh>
      );
    case "sphinx":
      return (
        <group>
          <mesh position={[0, h * 0.22, 0]} castShadow>
            <boxGeometry args={[w * 1.4, h * 0.32, w * 0.7]} />
            <Mat color={paint} rough={0.8} />
          </mesh>
          <mesh position={[0, h * 0.52, w * 0.15]} castShadow>
            <boxGeometry args={[w * 0.45, h * 0.4, w * 0.4]} />
            <Mat color={accent} rough={0.75} />
          </mesh>
        </group>
      );
    case "pylon-gate":
      return (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * w * 0.5, h * 0.5, 0]} castShadow>
              <boxGeometry args={[w * 0.28, h, w * 0.18]} />
              <Mat color={paint} rough={0.7} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.78, 0]}>
            <boxGeometry args={[w * 1.15, h * 0.12, w * 0.16]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "obelisk":
      return (
        <group>
          <mesh position={[0, h * 0.48, 0]} castShadow>
            <cylinderGeometry args={[w * 0.08, w * 0.16, h * 0.92, 4]} />
            <Mat color={paint} rough={0.55} />
          </mesh>
          <mesh position={[0, h * 0.98, 0]}>
            <coneGeometry args={[w * 0.09, h * 0.12, 4]} />
            <Mat color={accent} metal={0.4} />
          </mesh>
        </group>
      );
    case "statue":
      return (
        <group>
          <mesh position={[0, h * 0.12, 0]}>
            <cylinderGeometry args={[w * 0.28, w * 0.34, h * 0.16, 8]} />
            <Mat color={accent} />
          </mesh>
          <mesh position={[0, h * 0.48, 0]} castShadow>
            <capsuleGeometry args={[w * 0.14, h * 0.42, 4, 8]} />
            <Mat color={paint} rough={0.6} />
          </mesh>
          <mesh position={[0, h * 0.82, 0]}>
            <sphereGeometry args={[w * 0.12, 10, 10]} />
            <Mat color={paint} />
          </mesh>
        </group>
      );
    case "gothic-spire":
      return (
        <group>
          <mesh position={[0, h * 0.28, 0]} castShadow>
            <boxGeometry args={[w * 0.7, h * 0.5, w * 0.55]} />
            <Mat color={paint} rough={0.62} />
          </mesh>
          <mesh position={[0, h * 0.72, 0]} castShadow>
            <coneGeometry args={[w * 0.22, h * 0.55, 8]} />
            <Mat color={accent} metal={0.25} />
          </mesh>
        </group>
      );
    case "dome":
      return (
        <group>
          <mesh position={[0, h * 0.28, 0]} castShadow>
            <cylinderGeometry args={[w * 0.55, w * 0.62, h * 0.48, 12]} />
            <Mat color={paint} />
          </mesh>
          <mesh position={[0, h * 0.62, 0]}>
            <sphereGeometry args={[w * 0.52, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={accent} metal={0.35} />
          </mesh>
        </group>
      );
    case "mill":
      return (
        <group>
          <mesh position={[0, h * 0.4, 0]} castShadow>
            <cylinderGeometry args={[w * 0.22, w * 0.28, h * 0.8, 10]} />
            <Mat color={paint} />
          </mesh>
          <mesh position={[0, h * 0.72, w * 0.08]} rotation={[0, 0, Math.PI / 5]}>
            <boxGeometry args={[w * 1.1, h * 0.06, h * 0.05]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "chalet":
      return (
        <group>
          <mesh position={[0, h * 0.28, 0]} castShadow>
            <boxGeometry args={[w * 1.1, h * 0.5, w * 0.8]} />
            <Mat color={paint} rough={0.7} />
          </mesh>
          <mesh position={[0, h * 0.62, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[w * 0.85, h * 0.38, 4]} />
            <Mat color={accent} rough={0.65} />
          </mesh>
        </group>
      );
    case "cable-pylon":
      return (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * w * 0.18, h * 0.5, 0]} castShadow>
              <boxGeometry args={[w * 0.06, h, w * 0.06]} />
              <Mat color={paint} metal={0.55} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.92, 0]}>
            <boxGeometry args={[w * 0.9, h * 0.06, w * 0.08]} />
            <Mat color={accent} metal={0.6} />
          </mesh>
        </group>
      );
    case "lighthouse":
      return (
        <group>
          <mesh position={[0, h * 0.45, 0]} castShadow>
            <cylinderGeometry args={[w * 0.14, w * 0.24, h * 0.9, 10]} />
            <Mat color={paint} />
          </mesh>
          <mesh position={[0, h * 0.95, 0]}>
            <cylinderGeometry args={[w * 0.16, w * 0.16, h * 0.12, 10]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} />
          </mesh>
        </group>
      );
    case "ferris":
      return (
        <group>
          <mesh position={[0, h * 0.55, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[h * 0.42, h * 0.025, 8, 24]} />
            <Mat color={paint} metal={0.55} />
          </mesh>
          <mesh position={[0, h * 0.12, 0]}>
            <boxGeometry args={[w * 0.12, h * 0.28, w * 0.12]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "bridge-tower":
      return (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * w * 0.38, h * 0.5, 0]} castShadow>
              <boxGeometry args={[w * 0.22, h, w * 0.22]} />
              <Mat color={paint} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.72, 0]}>
            <boxGeometry args={[w * 1.05, h * 0.08, w * 0.12]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "art-deco":
      return (
        <group>
          {[0.2, 0.45, 0.68].map((t, i) => (
            <mesh key={t} position={[0, h * t, 0]} castShadow>
              <boxGeometry args={[w * (0.85 - i * 0.18), h * 0.24, w * (0.7 - i * 0.14)]} />
              <Mat color={paint} metal={0.22} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.92, 0]}>
            <cylinderGeometry args={[w * 0.06, w * 0.1, h * 0.2, 8]} />
            <Mat color={accent} metal={0.6} />
          </mesh>
        </group>
      );
    case "copper-steps":
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              position={[i * w * 0.12, h * (0.2 + i * 0.18), 0]}
              castShadow
            >
              <boxGeometry args={[w * 0.5, h * 0.22, w * 0.5]} />
              <Mat color={paint} metal={0.45} rough={0.35} />
            </mesh>
          ))}
        </group>
      );
    case "neon-drum":
      return (
        <group>
          <mesh position={[0, h * 0.45, 0]} castShadow>
            <cylinderGeometry args={[w * 0.48, w * 0.52, h * 0.88, 16]} />
            <Mat color={paint} rough={0.32} />
          </mesh>
          <mesh position={[0, h * 0.72, w * 0.52]}>
            <boxGeometry args={[w * 0.7, h * 0.1, 0.12]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      );
    case "sugarloaf":
      return (
        <mesh position={[0, h * 0.48, 0]} castShadow>
          <coneGeometry args={[w * 0.7, h, 7]} />
          <Mat color={paint} rough={0.9} metal={0.02} />
        </mesh>
      );
    case "cristo":
      return (
        <group>
          <mesh position={[0, h * 0.42, 0]} castShadow>
            <capsuleGeometry args={[w * 0.1, h * 0.55, 4, 8]} />
            <Mat color={paint} rough={0.55} />
          </mesh>
          <mesh position={[0, h * 0.62, 0]}>
            <boxGeometry args={[w * 1.15, h * 0.08, w * 0.1]} />
            <Mat color={paint} />
          </mesh>
          <mesh position={[0, h * 0.88, 0]}>
            <sphereGeometry args={[w * 0.1, 8, 8]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "portico":
      return (
        <group>
          {[-0.45, -0.15, 0.15, 0.45].map((x) => (
            <mesh key={x} position={[x * w, h * 0.38, w * 0.3]} castShadow>
              <cylinderGeometry args={[w * 0.06, w * 0.07, h * 0.7, 8]} />
              <Mat color={paint} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.78, 0]}>
            <boxGeometry args={[w * 1.3, h * 0.12, w * 0.85]} />
            <Mat color={accent} />
          </mesh>
        </group>
      );
    case "ziggurat":
      return (
        <group>
          {[0.18, 0.4, 0.62, 0.82].map((t, i) => (
            <mesh key={t} position={[0, h * t, 0]} castShadow>
              <boxGeometry args={[w * (1.2 - i * 0.22), h * 0.18, w * (1.1 - i * 0.2)]} />
              <Mat color={paint} rough={0.75} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

function PlacedLandmark({
  def,
  x,
  z,
  y,
}: {
  def: CircuitLandmarkDef;
  x: number;
  y: number;
  z: number;
}) {
  return (
    <group position={[x, y, z]}>
      <LandmarkMesh
        kind={def.kind}
        h={def.height}
        paint={def.color}
        accent={def.accent}
      />
    </group>
  );
}

export function UniqueCircuitLandmarks({
  slug,
  samples,
}: {
  slug: string;
  samples: RoadSample[];
}) {
  const placed = useMemo(() => {
    const defs = circuitLandmarksFor(slug);
    if (!samples.length || !defs.length) return [];
    const out: Array<{
      def: CircuitLandmarkDef;
      x: number;
      y: number;
      z: number;
    }> = [];
    for (let i = 0; i < Math.min(12, defs.length); i += 1) {
      const def = defs[i];
      const sample =
        samples[Math.floor((i + 0.5) * (samples.length / 12)) % samples.length];
      const side = i % 2 === 0 ? 1 : -1;
      const height = Math.min(def.height, 64);
      const half = Math.max(7, height * 0.14);
      let placedPoint: { x: number; y: number; z: number } | null = null;
      for (const dist of [110, 128, 148, 170]) {
        const x = sample.position.x + sample.normal.x * side * dist;
        const z = sample.position.z + sample.normal.z * side * dist;
        if (aabbAsphaltClearance(samples, x, z, half, half) >= 10) {
          placedPoint = { x, y: sample.position.y, z };
          break;
        }
      }
      if (!placedPoint) continue;
      out.push({ def: { ...def, height }, ...placedPoint });
    }
    return out;
  }, [samples, slug]);

  return (
    <group name="unique-circuit-landmarks">
      {placed.map((p) => (
        <PlacedLandmark key={p.def.name} def={p.def} x={p.x} y={p.y} z={p.z} />
      ))}
    </group>
  );
}
