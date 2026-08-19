/**
 * Route metadata used by the website (listing, detail, cards).
 * Full playable geometry (roadPoints, buildings, etc.) arrives in Milestone 4.
 */
export type RouteDifficulty = "easy" | "medium" | "hard";

export type RouteSurfaceType = "asphalt" | "concrete" | "mixed";

export interface RouteSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  distanceMetres: number;
  estimatedDurationSeconds: number;
  difficulty: RouteDifficulty;
  tags: string[];
  thumbnail: string;
  checkpointCount: number;
  surfaceType: RouteSurfaceType;
  bestTimeMs: number | null;
  attemptCount: number;
  isPublished: boolean;
  dataAttribution: string;
}

export interface LeaderboardEntry {
  id: string;
  routeId: string;
  displayName: string;
  completionTimeMs: number;
  createdAt: string;
  isGuest: boolean;
}
