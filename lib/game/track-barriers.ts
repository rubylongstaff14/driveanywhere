import type { RoadSample } from "@/lib/game/road-mesh";

export interface TrackBarrier {
  key: string;
  pos: [number, number, number];
  rot: [number, number, number];
  /** Half-length along the wall tangent (metres). */
  hl: number;
  stripe: 0 | 1;
}

/** Signed distance from a point to the asphalt edge (negative = on asphalt). */
function clearanceToRibbon(
  samples: RoadSample[],
  x: number,
  z: number,
): number {
  let best = Infinity;
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i].position;
    const b = samples[i + 1].position;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lenSq = abx * abx + abz * abz || 1;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / lenSq),
    );
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const halfW =
      samples[i].width / 2 + (samples[i + 1].width - samples[i].width) * t * 0.5;
    best = Math.min(best, Math.hypot(x - px, z - pz) - halfW);
  }
  return best;
}

/**
 * Variable-length Tecpro modules along a smoothed offset of the centreline.
 * Path runs break whenever a bend is skipped so modules never chord across
 * the racing line. Every module is ribbon-clearance gated.
 */
export function buildTrackBarriers(samples: RoadSample[]): TrackBarrier[] {
  const out: TrackBarrier[] = [];
  if (samples.length < 3) return out;

  const GAP = 0.08;
  const MIN_EDGE_CLEAR = 1.38;

  for (const side of [-1, 1] as const) {
    type PathPt = {
      x: number;
      y: number;
      z: number;
      bend: number;
      width: number;
      sampleIndex: number;
    };
    const runs: PathPt[][] = [];
    let run: PathPt[] = [];
    let smoothOff = samples[0].width / 2 + 1.68;
    let lastIndex = -999;

    for (let i = 1; i < samples.length - 1; i += 1) {
      const cur = samples[i];
      const prev = samples[i - 1];
      const next = samples[i + 1];
      const step = Math.hypot(
        cur.position.x - prev.position.x,
        cur.position.z - prev.position.z,
      );
      if (step < 0.08) continue;

      const ax = cur.position.x - prev.position.x;
      const az = cur.position.z - prev.position.z;
      const bx = next.position.x - cur.position.x;
      const bz = next.position.z - cur.position.z;
      const la = Math.hypot(ax, az) || 1;
      const lb = Math.hypot(bx, bz) || 1;
      const dot = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)));
      const bend = Math.acos(dot);

      // Open a new run instead of bridging across a skipped apex — bridging
      // is what produced walls that looked like they sealed the track.
      // On elevated deck, keep walls continuous so exits aren't open pits.
      const elevated = cur.position.y > 3.2;
      let skip = false;
      if (bend > (elevated ? 0.98 : 0.8)) skip = true;
      if (bend > (elevated ? 0.45 : 0.22)) {
        const cross = ax * bz - az * bx;
        const insideSide = cross > 0 ? 1 : -1;
        if (side === insideSide) skip = true;
      }
      // Elevated outsides are never skipped for mild bends — seal the drop.
      if (elevated && bend <= 0.45) skip = false;
      if (skip) {
        if (run.length >= 2) runs.push(run);
        run = [];
        lastIndex = -999;
        continue;
      }

      const flare = elevated ? 1.15 : 1.45;
      const targetOff = cur.width / 2 + (elevated ? 1.95 : 1.68) + bend * flare;
      smoothOff += (targetOff - smoothOff) * Math.min(1, step / 3.2);

      // Also break if we jumped several samples (defensive).
      if (run.length > 0 && i - lastIndex > 2) {
        if (run.length >= 2) runs.push(run);
        run = [];
      }

      run.push({
        x: cur.position.x + cur.normal.x * smoothOff * side,
        y: Math.max(0.48, cur.position.y + 0.48),
        z: cur.position.z + cur.normal.z * smoothOff * side,
        bend,
        width: cur.width,
        sampleIndex: i,
      });
      lastIndex = i;
    }
    if (run.length >= 2) runs.push(run);

    let moduleIndex = 0;
    for (const path of runs) {
      const arcs = new Float32Array(path.length);
      for (let i = 1; i < path.length; i += 1) {
        arcs[i] =
          arcs[i - 1] +
          Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      }
      const total = arcs[arcs.length - 1];
      if (total < 1.2) continue;

      const sampleAt = (s: number) => {
        const t = Math.max(0, Math.min(total, s));
        let lo = 0;
        for (let i = 1; i < arcs.length; i += 1) {
          if (arcs[i] >= t) {
            lo = i - 1;
            break;
          }
          lo = i - 1;
        }
        const hi = Math.min(path.length - 1, lo + 1);
        const span = Math.max(1e-6, arcs[hi] - arcs[lo]);
        const u = (t - arcs[lo]) / span;
        const a = path[lo];
        const b = path[hi];
        return {
          x: a.x + (b.x - a.x) * u,
          y: a.y + (b.y - a.y) * u,
          z: a.z + (b.z - a.z) * u,
          bend: a.bend + (b.bend - a.bend) * u,
          width: a.width,
        };
      };

      let cursor = 0;
      while (cursor < total - 0.6) {
        const here = sampleAt(cursor);
        const len = Math.min(3.2, Math.max(0.7, 3.2 - here.bend * 4.2));
        if (cursor + len > total) break;

        const start = sampleAt(cursor);
        const end = sampleAt(cursor + len);
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const chord = Math.hypot(dx, dz);
        if (chord < 0.55) {
          cursor += len * 0.5;
          continue;
        }
        // Chord much shorter than arc ⇒ path folded; skip rather than seal.
        if (chord < len * 0.72) {
          cursor += Math.max(0.4, len * 0.4);
          continue;
        }

        const mx = (start.x + end.x) / 2;
        const my = (start.y + end.y) / 2;
        const mz = (start.z + end.z) / 2;
        const yaw = Math.atan2(dx, dz);
        const half = chord / 2;

        let clear = true;
        for (let u = -1; u <= 1; u += 0.25) {
          const qx = mx + (dx / chord) * half * u;
          const qz = mz + (dz / chord) * half * u;
          if (clearanceToRibbon(samples, qx, qz) < MIN_EDGE_CLEAR) {
            clear = false;
            break;
          }
        }

        if (clear) {
          out.push({
            key: `w-${side}-${moduleIndex}`,
            pos: [mx, my, mz],
            rot: [0, yaw, 0],
            hl: half,
            stripe: (moduleIndex % 2) as 0 | 1,
          });
          moduleIndex += 1;
          cursor += chord + GAP;
        } else {
          cursor += Math.max(0.4, len * 0.4);
        }
      }
    }
  }
  return out;
}

/** True if a world XZ point lies inside the drivable asphalt ribbon. */
export function pointOnAsphalt(
  samples: RoadSample[],
  x: number,
  z: number,
  margin = 0,
): boolean {
  return clearanceToRibbon(samples, x, z) < margin;
}

/**
 * Closest centreline distance for a barrier module (centre + both ends).
 * Returns the minimum distance to any road sample.
 */
export function barrierMinClearance(
  samples: RoadSample[],
  wall: TrackBarrier,
): number {
  const yaw = wall.rot[1];
  const tx = Math.sin(yaw);
  const tz = Math.cos(yaw);
  const probes = [
    [wall.pos[0], wall.pos[2]],
    [wall.pos[0] + tx * wall.hl, wall.pos[2] + tz * wall.hl],
    [wall.pos[0] - tx * wall.hl, wall.pos[2] - tz * wall.hl],
  ] as const;
  let best = Infinity;
  for (const [qx, qz] of probes) {
    for (const sample of samples) {
      best = Math.min(
        best,
        Math.hypot(qx - sample.position.x, qz - sample.position.z),
      );
    }
  }
  return best;
}
