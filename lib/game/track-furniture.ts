import type { RoadSample } from "@/lib/game/road-mesh";
import type { TrackBarrier } from "@/lib/game/track-barriers";

export type TrackFurnitureKind = "tyres" | "bollard" | "post";

export interface TrackFurniture {
  key: string;
  kind: TrackFurnitureKind;
  pos: [number, number, number];
  rot: [number, number, number];
}

function outwardFromRoad(
  samples: RoadSample[],
  x: number,
  z: number,
): [number, number] {
  let best = Infinity;
  let sx = x;
  let sz = z;
  const step = Math.max(1, Math.floor(samples.length / 180));
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i];
    const d = Math.hypot(x - s.position.x, z - s.position.z);
    if (d < best) {
      best = d;
      sx = s.position.x;
      sz = s.position.z;
    }
  }
  let nx = x - sx;
  let nz = z - sz;
  const len = Math.hypot(nx, nz) || 1;
  return [nx / len, nz / len];
}

/**
 * Visual-only circuit furniture anchored to Tecpro modules — tyre stacks,
 * bollards, marshal posts. No colliders; never placed on the racing line.
 */
export function buildTracksideFurniture(
  samples: RoadSample[],
  walls: TrackBarrier[],
): TrackFurniture[] {
  const out: TrackFurniture[] = [];
  if (samples.length < 3 || walls.length === 0) return out;

  walls.forEach((wall, index) => {
    const [ox, oz] = outwardFromRoad(samples, wall.pos[0], wall.pos[2]);
    const y = wall.pos[1];
    const yaw = wall.rot[1];

    if (index % 5 === 0) {
      out.push({
        key: `tyres-${wall.key}`,
        kind: "tyres",
        pos: [wall.pos[0] + ox * 1.25, y - 0.12, wall.pos[2] + oz * 1.25],
        rot: [0, yaw, 0],
      });
    }
    if (index % 3 === 1) {
      out.push({
        key: `bollard-${wall.key}`,
        kind: "bollard",
        pos: [wall.pos[0] + ox * 0.85, y - 0.28, wall.pos[2] + oz * 0.85],
        rot: [0, yaw, 0],
      });
    }
    if (index % 8 === 3) {
      out.push({
        key: `post-${wall.key}`,
        kind: "post",
        pos: [wall.pos[0] + ox * 1.55, y - 0.2, wall.pos[2] + oz * 1.55],
        rot: [0, yaw, 0],
      });
    }
  });

  return out;
}
