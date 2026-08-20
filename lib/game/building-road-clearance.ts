import type { RoadSample } from "@/lib/game/road-mesh";

/**
 * Signed clearance of an axis-aligned building box from the asphalt edge.
 * Negative = box intersects the racing ribbon (would block the car).
 */
export function aabbAsphaltClearance(
  samples: RoadSample[],
  cx: number,
  cz: number,
  halfWidth: number,
  halfDepth: number,
): number {
  const probes: Array<[number, number]> = [
    [cx, cz],
    [cx - halfWidth, cz - halfDepth],
    [cx - halfWidth, cz + halfDepth],
    [cx + halfWidth, cz - halfDepth],
    [cx + halfWidth, cz + halfDepth],
    [cx, cz - halfDepth],
    [cx, cz + halfDepth],
    [cx - halfWidth, cz],
    [cx + halfWidth, cz],
  ];

  let best = Infinity;
  for (const [qx, qz] of probes) {
    let nearest = Infinity;
    for (let i = 0; i < samples.length; i += 1) {
      const s = samples[i];
      nearest = Math.min(
        nearest,
        Math.hypot(qx - s.position.x, qz - s.position.z) - s.width / 2,
      );
    }
    best = Math.min(best, nearest);
  }
  return best;
}
