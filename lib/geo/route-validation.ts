import { localDistanceMetres } from "@/lib/geo/coordinate-projection";
import type { LocalPoint } from "@/lib/geo/route-generation-types";

export interface PolylineValidationResult {
  valid: boolean;
  errors: string[];
  maxDeviationMetres: number;
  maxGradient: number;
}

function distanceToSegment(point: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const lengthSquared = abx * abx + aby * aby + abz * abz;
  if (lengthSquared === 0) return localDistanceMetres(point, a);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * abx + (point.y - a.y) * aby + (point.z - a.z) * abz) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    point.x - (a.x + abx * t),
    point.y - (a.y + aby * t),
    point.z - (a.z + abz * t),
  );
}

function orientation(a: LocalPoint, b: LocalPoint, c: LocalPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsIntersect(a: LocalPoint, b: LocalPoint, c: LocalPoint, d: LocalPoint): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

export function validatePlayablePolyline(
  source: LocalPoint[],
  playable: LocalPoint[],
  options: { maxDeviationMetres?: number; maxGradient?: number } = {},
): PolylineValidationResult {
  const maxAllowedDeviation = options.maxDeviationMetres ?? 3;
  const maxAllowedGradient = options.maxGradient ?? 0.2;
  const errors: string[] = [];
  let maxDeviationMetres = 0;
  let maxGradient = 0;

  if (source.length < 2) errors.push("Source centreline needs at least two points.");
  if (playable.length < 2) errors.push("Playable centreline needs at least two points.");

  for (let index = 1; index < playable.length; index += 1) {
    const a = playable[index - 1];
    const b = playable[index];
    const segmentLength = localDistanceMetres(a, b);
    if (segmentLength < 0.05) errors.push(`Segment ${index - 1} is shorter than 5cm.`);
    const horizontal = Math.hypot(b.x - a.x, b.z - a.z);
    const gradient = horizontal === 0 ? Infinity : Math.abs(b.y - a.y) / horizontal;
    maxGradient = Math.max(maxGradient, gradient);
  }

  for (const point of playable) {
    let nearest = Infinity;
    for (let index = 1; index < source.length; index += 1) {
      nearest = Math.min(nearest, distanceToSegment(point, source[index - 1], source[index]));
    }
    maxDeviationMetres = Math.max(maxDeviationMetres, nearest);
  }

  for (let left = 0; left < playable.length - 1; left += 1) {
    for (let right = left + 2; right < playable.length - 1; right += 1) {
      if (right === left + 1) continue;
      if (
        segmentsIntersect(
          playable[left],
          playable[left + 1],
          playable[right],
          playable[right + 1],
        )
      ) {
        errors.push(`Segments ${left} and ${right} intersect.`);
      }
    }
  }

  if (maxDeviationMetres > maxAllowedDeviation) {
    errors.push(
      `Playable centreline deviates ${maxDeviationMetres.toFixed(2)}m; maximum is ${maxAllowedDeviation}m.`,
    );
  }
  if (maxGradient > maxAllowedGradient) {
    errors.push(
      `Maximum gradient ${(maxGradient * 100).toFixed(1)}% exceeds ${(maxAllowedGradient * 100).toFixed(1)}%.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    maxDeviationMetres,
    maxGradient,
  };
}
