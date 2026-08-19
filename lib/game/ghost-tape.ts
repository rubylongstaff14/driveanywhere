import type { VehicleId } from "@/lib/game/vehicles";

const MAX_FRAMES = 8000;
const STORAGE_PREFIX = "driveanywhere.ghost.";

export interface GhostFrame {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface GhostTape {
  routeId: string;
  vehicleId: VehicleId;
  totalMs: number;
  sectorMs: number[];
  frames: GhostFrame[];
}

export class GhostRecorder {
  private t = new Float32Array(MAX_FRAMES);
  private x = new Float32Array(MAX_FRAMES);
  private y = new Float32Array(MAX_FRAMES);
  private z = new Float32Array(MAX_FRAMES);
  private yaw = new Float32Array(MAX_FRAMES);
  private count = 0;
  private tick = 0;
  private sectorMs: number[] = [];

  reset() {
    this.count = 0;
    this.tick = 0;
    this.sectorMs = [];
  }

  /** Call from the physics step after the clock has started. */
  sample(elapsedMs: number, x: number, y: number, z: number, yaw: number) {
    this.tick += 1;
    if (this.tick % 3 !== 0) return;
    if (this.count >= MAX_FRAMES) return;
    const i = this.count;
    this.t[i] = elapsedMs;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.yaw[i] = yaw;
    this.count += 1;
  }

  markSector(elapsedMs: number) {
    this.sectorMs.push(Math.round(elapsedMs));
  }

  finish(
    routeId: string,
    vehicleId: VehicleId,
    totalMs: number,
  ): GhostTape | null {
    if (this.count < 8) return null;
    const frames: GhostFrame[] = [];
    for (let i = 0; i < this.count; i += 1) {
      frames.push({
        t: this.t[i],
        x: this.x[i],
        y: this.y[i],
        z: this.z[i],
        yaw: this.yaw[i],
      });
    }
    return {
      routeId,
      vehicleId,
      totalMs: Math.round(totalMs),
      sectorMs: this.sectorMs.slice(0, 3),
      frames,
    };
  }
}

export function sampleGhostPose(
  tape: GhostTape,
  elapsedMs: number,
): GhostFrame | null {
  const frames = tape.frames;
  if (frames.length === 0) return null;
  if (elapsedMs <= frames[0].t) return frames[0];
  if (elapsedMs >= frames[frames.length - 1].t) return frames[frames.length - 1];

  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < elapsedMs) lo = mid + 1;
    else hi = mid;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const span = Math.max(1, frames[i1].t - frames[i0].t);
  const u = (elapsedMs - frames[i0].t) / span;
  let dyaw = frames[i1].yaw - frames[i0].yaw;
  if (dyaw > Math.PI) dyaw -= Math.PI * 2;
  if (dyaw < -Math.PI) dyaw += Math.PI * 2;
  return {
    t: elapsedMs,
    x: frames[i0].x + (frames[i1].x - frames[i0].x) * u,
    y: frames[i0].y + (frames[i1].y - frames[i0].y) * u,
    z: frames[i0].z + (frames[i1].z - frames[i0].z) * u,
    yaw: frames[i0].yaw + dyaw * u,
  };
}

function storageKey(routeId: string): string {
  return `${STORAGE_PREFIX}${routeId}`;
}

export function loadGhostTape(routeId: string): GhostTape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(routeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GhostTape;
    if (!parsed?.frames?.length || !parsed.totalMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGhostTape(tape: GhostTape): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadGhostTape(tape.routeId);
    if (existing && existing.totalMs <= tape.totalMs) return;
    window.localStorage.setItem(storageKey(tape.routeId), JSON.stringify(tape));
  } catch {
    // Quota / private mode — skip; the time still saves via attempts.
  }
}

export function hasGhostTape(routeId: string): boolean {
  return loadGhostTape(routeId) !== null;
}
