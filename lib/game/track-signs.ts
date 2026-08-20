import type { RoadSample } from "@/lib/game/road-mesh";

export interface TrackSign {
  key: string;
  position: [number, number, number];
  yaw: number;
  /** -1 = turn left, +1 = turn right (from driver view). */
  turn: -1 | 1;
  severity: "mild" | "sharp" | "hairpin";
  /** Metres remaining to the apex when you pass this board. */
  metres: 100 | 50 | 25;
}

function sampleBend(samples: RoadSample[], i: number): number {
  if (i <= 0 || i >= samples.length - 1) return 0;
  const prev = samples[i - 1].position;
  const cur = samples[i].position;
  const next = samples[i + 1].position;
  const ax = cur.x - prev.x;
  const az = cur.z - prev.z;
  const bx = next.x - cur.x;
  const bz = next.z - cur.z;
  const la = Math.hypot(ax, az) || 1;
  const lb = Math.hypot(bx, bz) || 1;
  const dot = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)));
  return Math.acos(dot);
}

function bendCross(samples: RoadSample[], i: number): number {
  const prev = samples[i - 1].position;
  const cur = samples[i].position;
  const next = samples[i + 1].position;
  const ax = cur.x - prev.x;
  const az = cur.z - prev.z;
  const bx = next.x - cur.x;
  const bz = next.z - cur.z;
  return ax * bz - az * bx;
}

function arcLengthTo(
  samples: RoadSample[],
  from: number,
  to: number,
): number {
  let arc = 0;
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  for (let i = a + 1; i <= b; i += 1) {
    arc += samples[i].position.distanceTo(samples[i - 1].position);
  }
  return arc;
}

function indexAtDistanceBack(
  samples: RoadSample[],
  apex: number,
  metres: number,
): number {
  let remaining = metres;
  for (let i = apex; i > 1; i -= 1) {
    const step = samples[i].position.distanceTo(samples[i - 1].position);
    remaining -= step;
    if (remaining <= 0) return i - 1;
  }
  return Math.max(1, apex - 1);
}

function headingChange(samples: RoadSample[], from: number, to: number): number {
  const a = samples[from].tangent;
  const b = samples[to].tangent;
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z));
  return Math.acos(dot);
}

/**
 * Place 100 / 50 / 25 m boards before corners. Regenerates from the live
 * centreline so layout edits move the signs automatically.
 */
export function buildTurnSigns(samples: RoadSample[]): TrackSign[] {
  const out: TrackSign[] = [];
  if (samples.length < 30) return out;

  const LOOKAHEAD = 16;
  const MIN_GAP = 14;
  let lastApex = -999;

  for (let i = 10; i < samples.length - LOOKAHEAD - 2; i += 2) {
    let peak = 0;
    let peakAt = i;
    for (let j = i; j < i + LOOKAHEAD; j += 1) {
      const local = sampleBend(samples, j);
      const sweep = headingChange(samples, Math.max(0, j - 4), Math.min(samples.length - 1, j + 4));
      const b = Math.max(local, sweep * 0.55);
      if (b > peak) {
        peak = b;
        peakAt = j;
      }
    }
    if (peak < 0.12) continue;
    if (peakAt - lastApex < MIN_GAP) continue;

    const cross = bendCross(samples, peakAt);
    const turn: -1 | 1 = cross > 0 ? -1 : 1;
    const side = turn;
    const severity: TrackSign["severity"] =
      peak > 0.85 ? "hairpin" : peak > 0.5 ? "sharp" : "mild";

    // Mild bends only get a 50 m board; sharper get the full countdown.
    const markers: Array<100 | 50 | 25> =
      severity === "mild"
        ? [100, 50]
        : [100, 50, 25];

    for (const metres of markers) {
      const warnAt = indexAtDistanceBack(samples, peakAt, metres);
      if (arcLengthTo(samples, warnAt, peakAt) < metres * 0.55) continue;
      const s = samples[warnAt];
      const offset = s.width / 2 + 6.4;
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      out.push({
        key: `sign-${peakAt}-${metres}-${turn}`,
        position: [
          s.position.x + s.normal.x * offset * side,
          Math.max(0, s.position.y),
          s.position.z + s.normal.z * offset * side,
        ],
        yaw: yaw + Math.PI,
        turn,
        severity,
        metres,
      });
    }

    lastApex = peakAt;
  }

  return out;
}
