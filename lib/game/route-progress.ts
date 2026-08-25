import type { RoadPoint } from "@/lib/validation/route-data";

/** Sample of how far along the circuit a car was at a given race time. */
export interface RacePathSample {
  /** 0 = start, 1 = finish (along road centreline arc-length) */
  p: number;
  /** Elapsed race time in ms when this progress was reached */
  t: number;
}

/**
 * Fractional progress 0–1 along the road centreline nearest to (x,z).
 * Uses cumulative arc length so heatmap segments align across clients.
 */
export function progressAlongRoad(
  roadPoints: Array<Pick<RoadPoint, "x" | "z">>,
  x: number,
  z: number,
): number {
  if (roadPoints.length < 2) return 0;

  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < roadPoints.length; i += 1) {
    const a = roadPoints[i - 1];
    const b = roadPoints[i];
    total += Math.hypot(b.x - a.x, b.z - a.z);
    lengths.push(total);
  }
  if (total < 1e-6) return 0;

  let bestDist = Infinity;
  let bestAlong = 0;
  for (let i = 0; i < roadPoints.length - 1; i += 1) {
    const a = roadPoints[i];
    const b = roadPoints[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz) || 1;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (segLen * segLen)),
    );
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestDist) {
      bestDist = d;
      bestAlong = lengths[i] + segLen * t;
    }
  }
  return Math.max(0, Math.min(1, bestAlong / total));
}

/** Keep path compact for WS — ~1 sample / 2% of track, monotonic in p and t. */
export function compactPathSamples(
  samples: RacePathSample[],
  maxPoints = 64,
): RacePathSample[] {
  if (samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => a.p - b.p || a.t - b.t);
  const out: RacePathSample[] = [{ p: 0, t: sorted[0].t }];
  const step = 1 / Math.max(8, maxPoints - 1);
  for (let target = step; target < 0.999; target += step) {
    let best: RacePathSample | null = null;
    for (const s of sorted) {
      if (s.p >= target) {
        best = s;
        break;
      }
    }
    if (best) out.push({ p: Number(best.p.toFixed(4)), t: Math.round(best.t) });
  }
  const last = sorted[sorted.length - 1];
  out.push({ p: 1, t: Math.round(last.t) });
  // Ensure monotonic time
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].t < out[i - 1].t) out[i].t = out[i - 1].t;
  }
  return out;
}

/** Interpolate race time at a given progress along a path. */
export function timeAtProgress(path: RacePathSample[], p: number): number | null {
  if (!path.length) return null;
  if (p <= path[0].p) return path[0].t;
  if (p >= path[path.length - 1].p) return path[path.length - 1].t;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (p >= a.p && p <= b.p) {
      const u = (p - a.p) / Math.max(1e-6, b.p - a.p);
      return a.t + (b.t - a.t) * u;
    }
  }
  return null;
}
