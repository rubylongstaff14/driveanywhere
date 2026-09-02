import type { RoadSample } from "@/lib/game/road-mesh";

export interface TerrainBlock {
  key: string;
  pos: [number, number, number];
  rot: [number, number, number];
  /** halfExtents: width (perpendicular), height, length (along road) */
  halfExtents: [number, number, number];
  /** Visual-only tint hint. */
  variant: "rock" | "snow" | "grass" | "scree";
  /** Shape hint for richer meshes. */
  shape: "box" | "wedge" | "boulder";
}

function samplePitch(samples: RoadSample[], i: number): number {
  if (i <= 0 || i >= samples.length - 1) return 0;
  const a = samples[i - 1].position;
  const b = samples[i + 1].position;
  const horiz = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return (b.y - a.y) / horiz;
}

/**
 * Shoulder pads sit BESIDE the asphalt (never under it) so cars keep grip on
 * climbs without invisible road-blocking colliders.
 */
export function buildAlpineTerrainPads(
  samples: RoadSample[],
  roadWidth: number,
): TerrainBlock[] {
  const out: TerrainBlock[] = [];
  const step = Math.max(5, Math.floor(samples.length / 56));
  const padHalfW = 10;
  const padHalfL = 8;
  const roadHalf = roadWidth / 2;
  // Keep a clear channel for the car + kerb.
  const clearMargin = 9;
  const centreDist = roadHalf + clearMargin + padHalfW;

  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i];
    if (s.position.y < 1.2) continue;
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    // Top of pad sits just below road surface so it supports drops, not the car.
    const topY = s.position.y - 0.15;
    const halfH = Math.min(8, Math.max(2.4, s.position.y * 0.12 + 2.2));
    const posY = topY - halfH;
    const variant: TerrainBlock["variant"] =
      s.position.y > 55 ? "snow" : s.position.y > 28 ? "scree" : "grass";

    for (const side of [-1, 1] as const) {
      out.push({
        key: `alps-pad-${i}-${side}`,
        pos: [
          s.position.x + s.normal.x * side * centreDist,
          posY + halfH,
          s.position.z + s.normal.z * side * centreDist,
        ],
        rot: [0, yaw, 0],
        halfExtents: [padHalfW, halfH, padHalfL],
        variant,
        shape: "box",
      });
    }
  }
  return out;
}

/**
 * Rock faces hug the outside of the climbing ribbon — collidable and visible.
 * Near edge stays ≥ roadHalf + 5.5 m clear of asphalt.
 */
export function buildAlpineCliffs(
  samples: RoadSample[],
  roadWidth: number,
): TerrainBlock[] {
  const out: TerrainBlock[] = [];
  const step = Math.max(3, Math.floor(samples.length / 90));
  const roadHalf = roadWidth / 2;
  const minClear = 11;

  for (let i = 2; i < samples.length - 2; i += step) {
    const s = samples[i];
    const y = s.position.y;
    if (y < 1.8) continue;

    const pitch = samplePitch(samples, i);
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const jitter = ((i * 17) % 7) * 0.15;

    for (const side of [-1, 1] as const) {
      const uphill = pitch * side > 0.01;
      // Downhill / valley side: lower retaining wall. Uphill: tall rock face.
      const height = uphill
        ? Math.min(95, 16 + y * 0.65 + jitter * 4)
        : Math.min(14, 4.5 + y * 0.05);
      const depth = uphill ? 11 + (i % 3) : 5.5;
      const halfLen = uphill ? 5.5 + (i % 3) * 0.5 : 5;
      const nearEdge = roadHalf + minClear;
      const dist = nearEdge + depth / 2;
      const px = s.position.x + s.normal.x * side * dist;
      const pz = s.position.z + s.normal.z * side * dist;
      // Base sits slightly below road so it visually anchors into the slope.
      const baseY = Math.max(0, s.position.y - 2.4);
      const variant: TerrainBlock["variant"] =
        y > 48 && uphill ? "snow" : y > 30 ? "rock" : "scree";

      out.push({
        key: `alps-cliff-${i}-${side}`,
        pos: [px, baseY + height / 2, pz],
        rot: [0, yaw + (side * (i % 5) - 2) * 0.02, 0],
        halfExtents: [depth / 2, height / 2, halfLen],
        variant,
        shape: uphill && height > 28 ? "wedge" : "box",
      });

      // Occasional roadside boulder further out (visual + soft collision).
      if (uphill && i % (step * 3) === 0) {
        const bDist = dist + depth / 2 + 6 + (i % 4);
        const br = 2.2 + (i % 5) * 0.35;
        out.push({
          key: `alps-boulder-${i}-${side}`,
          pos: [
            s.position.x + s.normal.x * side * bDist,
            s.position.y + br * 0.55,
            s.position.z + s.normal.z * side * bDist,
          ],
          rot: [0, yaw * 0.4 + i * 0.2, 0],
          halfExtents: [br, br * 0.85, br * 0.9],
          variant: y > 45 ? "snow" : "rock",
          shape: "boulder",
        });
      }
    }
  }
  return out;
}

/** Far backdrop peaks for the Matterhorn / ridge silhouette. */
export function buildAlpineBackdropPeaks(samples: RoadSample[]): Array<{
  key: string;
  pos: [number, number, number];
  radius: number;
  height: number;
  snow: boolean;
}> {
  if (samples.length < 4) return [];
  const out: Array<{
    key: string;
    pos: [number, number, number];
    radius: number;
    height: number;
    snow: boolean;
  }> = [];
  const step = Math.max(5, Math.floor(samples.length / 14));
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i];
    for (const side of [-1, 1] as const) {
      const dist = 220 + (i % 4) * 55 + (side === 1 ? 30 : 0);
      const height = 240 + (i % 5) * 70;
      const radius = 70 + (i % 3) * 22;
      out.push({
        key: `peak-${i}-${side}`,
        pos: [
          s.position.x + s.normal.x * side * dist,
          Math.max(0, s.position.y - 40),
          s.position.z + s.normal.z * side * dist,
        ],
        radius,
        height,
        snow: true,
      });
    }
  }

  // Hero Matterhorn — single iconic twin-peak silhouette mid-circuit.
  const mid = samples[Math.floor(samples.length * 0.55)] ?? samples[0];
  const side = mid.normal.x >= 0 ? 1 : -1;
  out.push({
    key: "matterhorn",
    pos: [
      mid.position.x + mid.normal.x * side * 380,
      Math.max(20, mid.position.y - 10),
      mid.position.z + mid.normal.z * side * 380,
    ],
    radius: 110,
    height: 520,
    snow: true,
  });
  return out;
}
