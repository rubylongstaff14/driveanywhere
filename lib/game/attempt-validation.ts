import { MOCK_ROUTES } from "@/lib/database/mock/routes";

export interface AttemptSubmission {
  routeId: string;
  routeSlug: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
  completionTimeMs: number;
  checkpointCount: number;
  requiredCheckpointCount: number;
  isValidClient: boolean;
  invalidReason?: string | null;
}

export interface AttemptRecord {
  id: string;
  routeId: string;
  routeSlug: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
  completionTimeMs: number;
  isValid: boolean;
  invalidReason: string | null;
  checkpointCount: number;
  createdAt: string;
  telemetrySummary: {
    checkpointCount: number;
    source: "mock-client";
  };
}

export interface AttemptValidationResult {
  ok: boolean;
  reason: string | null;
  minimumMs: number;
}

/** No car in this game can average more than this, so anything faster is bogus. */
const MAX_PLAUSIBLE_AVERAGE_MS = 45;
const ABSOLUTE_FLOOR_MS = 8_000;

export function getMinimumTimeMs(routeSlug: string): number {
  const route = MOCK_ROUTES.find((item) => item.slug === routeSlug);
  if (!route) {
    return ABSOLUTE_FLOOR_MS;
  }
  return Math.max(
    ABSOLUTE_FLOOR_MS,
    Math.round((route.distanceMetres / MAX_PLAUSIBLE_AVERAGE_MS) * 1000),
  );
}

export function validateAttemptSubmission(
  submission: AttemptSubmission,
): AttemptValidationResult {
  const route = MOCK_ROUTES.find((item) => item.id === submission.routeId);
  const minimumMs = getMinimumTimeMs(submission.routeSlug);

  if (!route || route.slug !== submission.routeSlug) {
    return { ok: false, reason: "Unknown route", minimumMs };
  }

  if (!submission.userId) {
    return { ok: false, reason: "Invalid user ID", minimumMs };
  }

  if (!Number.isFinite(submission.completionTimeMs)) {
    return { ok: false, reason: "Invalid completion time", minimumMs };
  }

  if (submission.completionTimeMs < 0) {
    return { ok: false, reason: "Impossible negative time", minimumMs };
  }

  if (submission.completionTimeMs < minimumMs) {
    return { ok: false, reason: "Time below route minimum", minimumMs };
  }

  if (submission.checkpointCount < submission.requiredCheckpointCount) {
    return { ok: false, reason: "Missing checkpoints", minimumMs };
  }

  if (!submission.isValidClient) {
    return {
      ok: false,
      reason: submission.invalidReason ?? "Client marked run invalid",
      minimumMs,
    };
  }

  return { ok: true, reason: null, minimumMs };
}
