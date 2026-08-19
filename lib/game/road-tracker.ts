import type { RoadSample } from "@/lib/game/road-mesh";

export interface RoadHit {
  index: number;
  distance: number;
  width: number;
  yaw: number;
  /** Metres above local origin along the road surface. */
  surfaceY: number;
  /** Longitudinal pitch in radians (positive = climbing). */
  pitch: number;
  progress: number;
}

/**
 * Flat lookup over the sampled centreline so per-tick queries stay allocation
 * free. Searches start near the last known index, which keeps cost constant
 * while the car follows the road.
 */
export class RoadTracker {
  private readonly xs: Float32Array;
  private readonly ys: Float32Array;
  private readonly zs: Float32Array;
  private readonly widths: Float32Array;
  private readonly yaws: Float32Array;
  private readonly pitches: Float32Array;
  private lastIndex = 0;

  readonly count: number;

  constructor(samples: RoadSample[]) {
    this.count = samples.length;
    this.xs = new Float32Array(this.count);
    this.ys = new Float32Array(this.count);
    this.zs = new Float32Array(this.count);
    this.widths = new Float32Array(this.count);
    this.yaws = new Float32Array(this.count);
    this.pitches = new Float32Array(this.count);

    for (let i = 0; i < this.count; i += 1) {
      const sample = samples[i];
      this.xs[i] = sample.position.x;
      this.ys[i] = Math.max(0, sample.position.y);
      this.zs[i] = sample.position.z;
      this.widths[i] = sample.width;
      this.yaws[i] = Math.atan2(sample.tangent.x, sample.tangent.z);
      const horiz = Math.hypot(sample.tangent.x, sample.tangent.z) || 1;
      this.pitches[i] = Math.atan2(sample.tangent.y, horiz);
    }
  }

  private distanceSqAt(index: number, x: number, z: number): number {
    const dx = x - this.xs[index];
    const dz = z - this.zs[index];
    return dx * dx + dz * dz;
  }

  nearest(x: number, z: number, window = 55): RoadHit {
    let bestIndex = this.lastIndex;
    let bestDistanceSq = this.distanceSqAt(bestIndex, x, z);

    // Stay on the current ribbon. Parallel/return legs on the same circuit
    // are often closer in XZ than the piece you are actually driving.
    const n = this.count;
    const span = Math.min(window, n - 1);
    for (let step = 1; step <= span; step += 1) {
      const forward = (this.lastIndex + step) % n;
      const back = (this.lastIndex - step + n) % n;
      const dFwd = this.distanceSqAt(forward, x, z);
      if (dFwd < bestDistanceSq) {
        bestDistanceSq = dFwd;
        bestIndex = forward;
      }
      const dBack = this.distanceSqAt(back, x, z);
      if (dBack < bestDistanceSq) {
        bestDistanceSq = dBack;
        bestIndex = back;
      }
    }

    // Only abandon the ribbon after a real teleport / fall-off.
    if (Math.sqrt(bestDistanceSq) > 80) {
      for (let i = 0; i < n; i += 1) {
        const d = this.distanceSqAt(i, x, z);
        if (d < bestDistanceSq) {
          bestDistanceSq = d;
          bestIndex = i;
        }
      }
    }

    this.lastIndex = bestIndex;

    // Interpolate elevation along the nearest centreline segment so hills
    // don't stair-step and briefly leave the car unsupported.
    let surfaceY = this.ys[bestIndex];
    let pitch = this.pitches[bestIndex];
    let yaw = this.yaws[bestIndex];
    let width = this.widths[bestIndex];
    let distance = Math.sqrt(bestDistanceSq);

    if (this.count >= 2) {
      const i0 = Math.max(0, bestIndex - 1);
      const i1 = Math.min(this.count - 1, bestIndex + 1);
      let segBest = bestIndex;
      let segT = 0;
      let segDistSq = bestDistanceSq;
      for (const [a, b] of [
        [i0, bestIndex],
        [bestIndex, i1],
      ] as const) {
        if (a === b) continue;
        const ax = this.xs[a];
        const az = this.zs[a];
        const bx = this.xs[b] - ax;
        const bz = this.zs[b] - az;
        const lenSq = bx * bx + bz * bz || 1;
        const t = Math.max(
          0,
          Math.min(1, ((x - ax) * bx + (z - az) * bz) / lenSq),
        );
        const px = ax + bx * t;
        const pz = az + bz * t;
        const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (dSq < segDistSq) {
          segDistSq = dSq;
          segBest = a;
          segT = t;
        }
      }
      const b = Math.min(this.count - 1, segBest + 1);
      surfaceY = this.ys[segBest] + (this.ys[b] - this.ys[segBest]) * segT;
      pitch = this.pitches[segBest] + (this.pitches[b] - this.pitches[segBest]) * segT;
      // Prefer the nearer sample's yaw/width for on-road tests.
      const useB = segT > 0.5 ? b : segBest;
      yaw = this.yaws[useB];
      width = this.widths[useB];
      distance = Math.sqrt(segDistSq);
      bestIndex = useB;
      this.lastIndex = useB;
    }

    return {
      index: bestIndex,
      distance,
      width,
      yaw,
      surfaceY: Math.max(0, surfaceY),
      pitch,
      progress: this.count > 1 ? bestIndex / (this.count - 1) : 0,
    };
  }

  isOnRoad(hit: RoadHit, tolerance: number): boolean {
    return hit.distance <= hit.width / 2 + tolerance;
  }

  spawn(): { position: { x: number; y: number; z: number }; yaw: number } {
    return {
      position: { x: this.xs[0], y: Math.max(0, this.ys[0]), z: this.zs[0] },
      yaw: this.yaws[0],
    };
  }

  reset(): void {
    this.lastIndex = 0;
  }
}
