import type { RoadSample } from "@/lib/game/road-mesh";

export interface TerrainBlock {
  key: string;
  pos: [number, number, number];
  rot: [number, number, number];
  /** halfExtents: width (perpendicular), height, length (along road) */
  halfExtents: [number, number, number];
  /** Visual-only tint hint. */
  variant: "rock" | "snow" | "grass";
}

function samplePitch(samples: RoadSample[], i: number): number {
  if (i <= 0 || i >= samples.length - 1) return 0;
  const a = samples[i - 1].position;
  const b = samples[i + 1].position;
  const horiz = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return (b.y - a.y) / horiz;
}

/**
 * Raised ground pads follow the ribbon on climbs so cars cannot drop to y=0
 * beside the asphalt and clip through backdrop peaks.
 */
export function buildAlpineTerrainPads(
  samples: RoadSample[],
  roadWidth: number,
): TerrainBlock[] {
  const out: TerrainBlock[] = [];
  const step = Math.max(6, Math.floor(samples.length / 48));
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i];
    if (s.position.y < 1.5) continue;
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const halfW = roadWidth / 2 + 42;
    const halfL = 22;
    out.push({
      key: `alps-pad-${i}`,
      pos: [s.position.x, Math.max(3.2, s.position.y - 0.8), s.position.z],
      rot: [0, yaw, 0],
      halfExtents: [halfW, 3.2, halfL],
      variant: s.position.y > 35 ? "snow" : "grass",
    });
  }
  return out;
}

/**
 * Rock faces hug the outside of the climbing ribbon — collidable and visible.
 */
export function buildAlpineCliffs(
  samples: RoadSample[],
  roadWidth: number,
): TerrainBlock[] {
  const out: TerrainBlock[] = [];
  const step = Math.max(4, Math.floor(samples.length / 72));

  for (let i = 2; i < samples.length - 2; i += step) {
    const s = samples[i];
    const y = s.position.y;
    if (y < 2) continue;

    const pitch = samplePitch(samples, i);
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const edge = roadWidth / 2 + 3.2;

    for (const side of [-1, 1] as const) {
      const uphill = pitch * side > 0.012;
      const height = uphill
        ? Math.min(110, 22 + y * 0.72)
        : Math.min(16, 5 + y * 0.06);
      const depth = uphill ? 14 : 6;
      const dist = edge + depth / 2 + 0.6;
      const px = s.position.x + s.normal.x * side * dist;
      const pz = s.position.z + s.normal.z * side * dist;
      const baseY = Math.max(0, s.position.y - 1.2);

      out.push({
        key: `alps-cliff-${i}-${side}`,
        pos: [px, baseY + height / 2, pz],
        rot: [0, yaw, 0],
        halfExtents: [depth / 2, height / 2, 11],
        variant: y > 42 && uphill ? "snow" : "rock",
      });
    }
  }
  return out;
}
