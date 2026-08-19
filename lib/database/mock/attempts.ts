import {
  validateAttemptSubmission,
  type AttemptRecord,
  type AttemptSubmission,
} from "@/lib/game/attempt-validation";

export type { AttemptRecord, AttemptSubmission };

const ATTEMPTS_KEY = "driveanywhere.attempts";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readAttempts(): AttemptRecord[] {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AttemptRecord[];
  } catch {
    return [];
  }
}

function writeAttempts(attempts: AttemptRecord[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

export function submitAttempt(
  submission: AttemptSubmission,
): { ok: true; attempt: AttemptRecord } | { ok: false; message: string } {
  const validation = validateAttemptSubmission(submission);
  const attempt: AttemptRecord = {
    id: crypto.randomUUID(),
    routeId: submission.routeId,
    routeSlug: submission.routeSlug,
    userId: submission.userId,
    displayName: submission.displayName,
    isGuest: submission.isGuest,
    completionTimeMs: Math.round(submission.completionTimeMs),
    isValid: validation.ok,
    invalidReason: validation.reason,
    checkpointCount: submission.checkpointCount,
    createdAt: new Date().toISOString(),
    telemetrySummary: {
      checkpointCount: submission.checkpointCount,
      source: "mock-client",
    },
  };

  const existing = readAttempts();
  writeAttempts([attempt, ...existing].slice(0, 200));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("driveanywhere-attempts"));
  }

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.reason ?? "Attempt rejected",
    };
  }

  return { ok: true, attempt };
}

export function getPersonalBest(
  userId: string,
  routeId: string,
): number | null {
  const times = readAttempts()
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        attempt.routeId === routeId &&
        attempt.isValid,
    )
    .map((attempt) => attempt.completionTimeMs);
  if (times.length === 0) return null;
  return Math.min(...times);
}

export function getRecentAttempts(
  userId: string,
  limit = 10,
): AttemptRecord[] {
  return readAttempts()
    .filter((attempt) => attempt.userId === userId)
    .slice(0, limit);
}

export function getLocalLeaderboard(
  routeId: string,
  limit = 10,
): AttemptRecord[] {
  const bestByUser = new Map<string, AttemptRecord>();
  for (const attempt of readAttempts()) {
    if (!attempt.isValid || attempt.routeId !== routeId) continue;
    const current = bestByUser.get(attempt.userId);
    if (!current || attempt.completionTimeMs < current.completionTimeMs) {
      bestByUser.set(attempt.userId, attempt);
    }
  }
  return [...bestByUser.values()]
    .sort((a, b) => a.completionTimeMs - b.completionTimeMs)
    .slice(0, limit);
}
