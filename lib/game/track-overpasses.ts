import type { RoadSample } from "@/lib/game/road-mesh";

export interface TrackOverpass {
  key: string;
  /** Centre of the arch on the lower (or host) deck. */
  position: [number, number, number];
  yaw: number;
  /** Clear width under the arch (metres). */
  span: number;
  /** Road-surface height the car drives on under the arch. */
  roadY: number;
  /** Vertical clearance from road surface to soffit. */
  clearance: number;
  kind: "crossing" | "flyover";
}

const MIN_INDEX_GAP = 35;
const MIN_VERT = 5.5; // metres of vertical separation to treat as a flyover

/**
 * Find centreline near-approaches that are vertically separated enough to
 * pass under each other, and add a few scenic flyover arches on crests.
 */
export function findTrackOverpasses(samples: RoadSample[]): TrackOverpass[] {
  const out: TrackOverpass[] = [];
  if (samples.length < 40) return out;

  // --- Elevation-separated near approaches (true over/under) ---
  for (let i = 0; i < samples.length; i += 4) {
    const a = samples[i];
    for (let j = i + MIN_INDEX_GAP; j < samples.length; j += 4) {
      if (j > samples.length - MIN_INDEX_GAP && i < MIN_INDEX_GAP) continue;
      const b = samples[j];
      const dist = Math.hypot(
        a.position.x - b.position.x,
        a.position.z - b.position.z,
      );
      const need = (a.width + b.width) / 2 + 2;
      if (dist > need) continue;
      const dy = Math.abs(a.position.y - b.position.y);
      if (dy < MIN_VERT) continue;

      const lower = a.position.y <= b.position.y ? a : b;
      const upper = a.position.y <= b.position.y ? b : a;
      const yaw = Math.atan2(lower.tangent.x, lower.tangent.z);
      out.push({
        key: `cross-${i}-${j}`,
        position: [
          lower.position.x,
          Math.max(0, lower.position.y),
          lower.position.z,
        ],
        yaw,
        span: Math.max(a.width, b.width) + 8,
        roadY: Math.max(0, lower.position.y),
        clearance: Math.max(5.5, upper.position.y - lower.position.y - 0.5),
        kind: "crossing",
      });
    }
  }

  // Scenic crest flyovers removed — on street circuits they read as gates
  // sitting on the racing line even when the soffit is clear.

  return out;
}

/**
 * Ribbon near-approach is only a playability failure when the decks are not
 * vertically separated enough for an overpass.
 */
export function countBlockingRibbonOverlaps(samples: RoadSample[]): number {
  let count = 0;
  for (let i = 0; i < samples.length; i += 3) {
    for (let j = i + MIN_INDEX_GAP; j < samples.length; j += 3) {
      if (j > samples.length - MIN_INDEX_GAP && i < MIN_INDEX_GAP) continue;
      const a = samples[i];
      const b = samples[j];
      const dist = Math.hypot(
        a.position.x - b.position.x,
        a.position.z - b.position.z,
      );
      const need = (a.width + b.width) / 2 + 1;
      if (dist >= need) continue;
      if (Math.abs(a.position.y - b.position.y) >= MIN_VERT) continue;
      count += 1;
    }
  }
  return count;
}
