import {
  getLocalLeaderboard,
} from "@/lib/database/mock/attempts";
import { MOCK_LEADERBOARD } from "@/lib/database/mock/routes";
import type { LeaderboardEntry } from "@/types/route";

function toEntry(attempt: {
  id: string;
  routeId: string;
  displayName: string;
  completionTimeMs: number;
  createdAt: string;
  isGuest: boolean;
}): LeaderboardEntry {
  return {
    id: attempt.id,
    routeId: attempt.routeId,
    displayName: attempt.displayName,
    completionTimeMs: attempt.completionTimeMs,
    createdAt: attempt.createdAt,
    isGuest: attempt.isGuest,
  };
}

export function getMergedRouteLeaderboard(
  routeId: string,
  limit = 10,
): LeaderboardEntry[] {
  const seeded = MOCK_LEADERBOARD.filter((entry) => entry.routeId === routeId);
  const local = getLocalLeaderboard(routeId, 20).map(toEntry);

  return [...seeded, ...local]
    .sort((a, b) => a.completionTimeMs - b.completionTimeMs)
    .slice(0, limit);
}

export function getMergedLeaderboardPreview(limit = 8): LeaderboardEntry[] {
  const routeIds = [...new Set(MOCK_LEADERBOARD.map((entry) => entry.routeId))];
  const merged: LeaderboardEntry[] = [...MOCK_LEADERBOARD];

  for (const routeId of routeIds) {
    for (const attempt of getLocalLeaderboard(routeId, 10)) {
      merged.push(toEntry(attempt));
    }
  }

  return merged
    .sort((a, b) => a.completionTimeMs - b.completionTimeMs)
    .slice(0, limit);
}
