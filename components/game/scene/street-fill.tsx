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

const FILL_CAP = 160;
const SKYLINE_CAP = 72;

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
    const stride = Math.max(4, Math.round(10 / Math.max(0.45, density)));
    const cityTall =
      region === "dubai" ||
      region === "nyc" ||
      region === "tokyo" ||
      region === "london";
    const alpine = region === "egypt" || region === "alps" || region === "rio";

    for (let i = 4; i < samples.length - 4; i += stride) {
      const s = samples[i];
      for (const side of [-1, 1] as const) {
        if (out.length >= FILL_CAP) break;
        const dist = 48 + ((i + side) % 6) * 5;
        const x = s.position.x + s.normal.x * side * dist;
        const z = s.position.z + s.normal.z * side * dist;
        const w = 9 + (i % 7);
        const d = 8 + ((i + 3) % 6);
        if (aabbAsphaltClearance(samples, x, z, w / 2, d / 2) < 8) continue;
        let blocked = false;
        for (const o of occupied) {
          const dx = x - o.x;
          const dz = z - o.z;
          if (dx * dx + dz * dz < (o.r + 14) * (o.r + 14)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const base = alpine ? 10 : 16;
        const span = alpine ? 22 : 38;
        const h = base + ((i * 13 + side) % span);
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

    // Far skyline ring — matches Unreal da_driveable._place_skyline distances.
    let sky = 0;
    const skyStride = Math.max(1, Math.floor(samples.length / Math.max(20, SKYLINE_CAP)));
    for (let i = 0; i < samples.length && sky < SKYLINE_CAP; i += skyStride) {
      const s = samples[i];
      const side = sky % 2 === 0 ? 1 : -1;
      const ring = sky % 3 === 0 ? 0 : 1;
      const dist = (ring === 0 ? 180 : 265) + (sky % 8) * 14;
      const x = s.position.x + s.normal.x * side * dist;
      const z = s.position.z + s.normal.z * side * dist;
      const w = 10 + (sky % 9);
      const d = 9 + ((sky + 2) % 7);
      if (aabbAsphaltClearance(samples, x, z, w / 2, d / 2) < 50) {
        sky += 1;
        continue;
      }
      let h = 55 + (sky % 16) * 9;
      if (cityTall) h *= 1.35;
      if (alpine) h *= 0.55;
      h = Math.min(210, h);
      out.push({
        x,
        y: s.position.y,
        z,
        w,
        d,
        h,
        color: pal[sky % pal.length],
      });
      sky += 1;
    }

    return out;
  }, [density, occupied, region, samples]);

  if (!fills.length) return null;

  const limit = FILL_CAP + SKYLINE_CAP;

  return (
    <Instances limit={limit} range={fills.length} castShadow={false} receiveShadow>
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
