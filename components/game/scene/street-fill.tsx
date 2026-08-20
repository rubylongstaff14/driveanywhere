"use client";

import { useMemo } from "react";
import { Instance, Instances } from "@react-three/drei";
import type { RoadSample } from "@/lib/game/road-mesh";
import { aabbAsphaltClearance } from "@/lib/game/building-road-clearance";
import type { CityRegion } from "@/components/game/scene/city-block-detail";

const PALETTE: Record<CityRegion, [string, string, string]> = {
  london: ["#7a5c4a", "#8a6c54", "#6b7d94"],
  dubai: ["#87a9bd", "#b8c7d0", "#6b7d94"],
  egypt: ["#c4a06a", "#b88850", "#9a8058"],
  tokyo: ["#4a5860", "#8898a8", "#2a3438"],
  rio: ["#8a7060", "#c8b898", "#6a8498"],
  alps: ["#8a6848", "#7a8898", "#a88868"],
  nyc: ["#6b7d94", "#b8b4a8", "#4a5858"],
};

interface Occupied {
  x: number;
  z: number;
  r: number;
}

export function StreetFill({
  samples,
  occupied,
  region,
  density,
}: {
  samples: RoadSample[];
  occupied: Occupied[];
  region: CityRegion;
  density: number;
}) {
  const fills = useMemo(() => {
    if (!samples.length) return [];
    const out: Array<{
      x: number;
      y: number;
      z: number;
      w: number;
      d: number;
      h: number;
      color: string;
    }> = [];
    const pal = PALETTE[region];
    const stride = Math.max(10, Math.round(14 / Math.max(0.4, density)));
    for (let i = 6; i < samples.length - 6; i += stride) {
      const s = samples[i];
      for (const side of [-1, 1] as const) {
        const dist = 58 + ((i + side) % 5) * 6;
        const x = s.position.x + s.normal.x * side * dist;
        const z = s.position.z + s.normal.z * side * dist;
        const w = 10 + (i % 7);
        const d = 9 + ((i + 3) % 6);
        if (aabbAsphaltClearance(samples, x, z, w / 2, d / 2) < 8) continue;
        let blocked = false;
        for (const o of occupied) {
          const dx = x - o.x;
          const dz = z - o.z;
          if (dx * dx + dz * dz < (o.r + 16) * (o.r + 16)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const h = 14 + ((i * 13 + side) % 28);
        out.push({
          x,
          y: s.position.y,
          z,
          w,
          d,
          h,
          color: pal[Math.abs(i + side) % pal.length],
        });
      }
    }
    return out.slice(0, 96);
  }, [density, occupied, region, samples]);

  if (!fills.length) return null;

  return (
    <Instances limit={96} range={fills.length} castShadow={false} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.12} />
      {fills.map((b, i) => (
        <Instance
          key={i}
          position={[b.x, b.y + b.h / 2, b.z]}
          scale={[b.w, b.h, b.d]}
          color={b.color}
        />
      ))}
    </Instances>
  );
}
