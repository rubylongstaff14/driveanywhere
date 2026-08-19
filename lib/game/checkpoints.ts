import type { RouteCheckpoint } from "@/lib/validation/route-data";

export function checkpointDistanceSq(
  checkpoint: RouteCheckpoint,
  x: number,
  z: number,
): number {
  const dx = x - checkpoint.position.x;
  const dz = z - checkpoint.position.z;
  return dx * dx + dz * dz;
}

export function isInsideCheckpoint(
  checkpoint: RouteCheckpoint,
  x: number,
  z: number,
): boolean {
  const radius = checkpoint.width * 0.65;
  return checkpointDistanceSq(checkpoint, x, z) <= radius * radius;
}
