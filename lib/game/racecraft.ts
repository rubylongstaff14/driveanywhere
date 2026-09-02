export type BalanceState = "braking" | "balanced" | "power";

/** 0–1 draft quality from distance and how directly the rival is ahead. */
export function slipstreamStrength(distanceM: number, forwardAlignment: number): number {
  if (distanceM < 3 || distanceM > 24 || forwardAlignment < 0.68) return 0;
  const distanceScore = Math.max(0, Math.min(1, (24 - distanceM) / 17));
  const alignmentScore = Math.max(
    0,
    Math.min(1, (forwardAlignment - 0.68) / 0.27),
  );
  return distanceScore * alignmentScore;
}

/** Kerb band at the asphalt edge; outside it is treated as excessive cutting. */
export function kerbUse(distanceFromCentreM: number, roadWidthM: number) {
  const edge = roadWidthM / 2;
  const distance = Math.abs(distanceFromCentreM);
  return {
    onKerb: distance >= edge - 1.15 && distance <= edge + 0.45,
    excessive: distance > edge + 0.45,
  };
}

export function balanceState(accelerate: number, brake: number): BalanceState {
  if (brake > 0.2) return "braking";
  if (accelerate > 0.35) return "power";
  return "balanced";
}
