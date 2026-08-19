import { getAppEnv } from "@/lib/config/env";
import { MOCK_LEADERBOARD, MOCK_ROUTES } from "@/lib/database/mock/routes";
import type { LeaderboardEntry, RouteSummary } from "@/types/route";

/**
 * Route data access. Milestone 1 uses mock data only.
 * Supabase-backed queries arrive in Milestone 6.
 */
export async function getPublishedRoutes(): Promise<RouteSummary[]> {
  const env = getAppEnv();

  if (env.mode === "supabase") {
    // Placeholder until Milestone 6 — fall back safely to mock data.
    console.info(
      "[routes] Supabase mode detected but route queries are not implemented yet. Using mock routes.",
    );
  }

  return MOCK_ROUTES.filter((route) => route.isPublished);
}

export async function getRouteBySlug(
  slug: string,
): Promise<RouteSummary | null> {
  const routes = await getPublishedRoutes();
  return routes.find((route) => route.slug === slug) ?? null;
}

export async function getFeaturedRoutes(limit = 3): Promise<RouteSummary[]> {
  const routes = await getPublishedRoutes();
  return routes.slice(0, limit);
}

export async function getLeaderboardPreview(
  limit = 5,
): Promise<LeaderboardEntry[]> {
  return [...MOCK_LEADERBOARD]
    .sort((a, b) => a.completionTimeMs - b.completionTimeMs)
    .slice(0, limit);
}

export async function getRouteLeaderboard(
  routeId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  return MOCK_LEADERBOARD.filter((entry) => entry.routeId === routeId)
    .sort((a, b) => a.completionTimeMs - b.completionTimeMs)
    .slice(0, limit);
}
