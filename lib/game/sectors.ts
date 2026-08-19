export type SplitTone = "purple" | "green" | "red";

/** Three equal sectors from the checkpoint list (start gate is CP 0). */
export function sectorEndCheckpoints(checkpointCount: number): [number, number, number] {
  const n = Math.max(3, checkpointCount);
  const s1 = Math.max(0, Math.floor(n / 3) - 1);
  const s2 = Math.max(s1 + 1, Math.floor((2 * n) / 3) - 1);
  const s3 = n - 1;
  return [s1, s2, s3];
}

export function sectorIndexForCheckpoint(
  checkpointIndex: number,
  checkpointCount: number,
): number {
  const [a, b] = sectorEndCheckpoints(checkpointCount);
  if (checkpointIndex <= a) return 0;
  if (checkpointIndex <= b) return 1;
  return 2;
}

export function isSectorEnd(
  passedCheckpointIndex: number,
  checkpointCount: number,
): boolean {
  return sectorEndCheckpoints(checkpointCount).includes(passedCheckpointIndex);
}

/**
 * Purple = beat stored PB sector. Green = faster than this session's best
 * (but not the PB). Red = slower than the comparison. Null on the first
 * unmarked sector so we never invent a restart or a fake delta.
 */
export function splitToneForSector(
  thisMs: number,
  pbMs: number | null,
  sessionBestMs: number | null,
): SplitTone | null {
  if (!Number.isFinite(thisMs) || thisMs < 0) return null;
  if (pbMs != null && thisMs < pbMs) return "purple";
  if (sessionBestMs != null && thisMs < sessionBestMs) return "green";
  if (pbMs != null || sessionBestMs != null) return "red";
  return null;
}
