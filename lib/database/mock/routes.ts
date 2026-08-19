import type { LeaderboardEntry, RouteSummary } from "@/types/route";
import { routeSummarySchema } from "@/lib/validation/route-meta";

/**
 * Seeded prototype routes.
 * Distances and checkpoint counts mirror the generated geometry in
 * `public/routes/*.json` — keep them in sync when reseeding.
 */
const rawRoutes: RouteSummary[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    slug: "westminster-sprint",
    name: "Westminster Sprint",
    description:
      "Monaco-style street rhythm — hairpin, riverside harbour run past Big Ben and Parliament, then a tight chicane and Abbey esses.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.4994,
    longitude: -0.1245,
    distanceMetres: 2541,
    estimatedDurationSeconds: 180,
    difficulty: "hard",
    tags: ["monaco-style", "street", "landmarks"],
    thumbnail: "/images/routes/westminster-sprint.svg",
    checkpointCount: 12,
    surfaceType: "asphalt",
    bestTimeMs: 128000,
    attemptCount: 128,
    isPublished: true,
    dataAttribution: "© OpenStreetMap contributors",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    slug: "embankment-run",
    name: "Embankment Run",
    description:
      "Monza-style temple of speed — long Thames straights past the Eye, Lesmo doubles, Ascari chicane and a Parabolica sweep.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5081,
    longitude: -0.118,
    distanceMetres: 2176,
    estimatedDurationSeconds: 155,
    difficulty: "medium",
    tags: ["monza-style", "straights", "riverside"],
    thumbnail: "/images/routes/embankment-run.svg",
    checkpointCount: 12,
    surfaceType: "asphalt",
    bestTimeMs: 118000,
    attemptCount: 94,
    isPublished: true,
    dataAttribution: "© OpenStreetMap contributors",
  },
  {
    id: "c3d4e5f6-a7b8-4012-8def-123456789012",
    slug: "canary-wharf-loop",
    name: "Canary Wharf Circuit",
    description:
      "Silverstone-style flowing lap — Maggotts–Becketts esses between towers, Hangar Straight past Canada Square, then Village and Luffield.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5054,
    longitude: -0.0235,
    distanceMetres: 1960,
    estimatedDurationSeconds: 140,
    difficulty: "hard",
    tags: ["silverstone-style", "flow", "docklands"],
    thumbnail: "/images/routes/canary-wharf-loop.svg",
    checkpointCount: 12,
    surfaceType: "asphalt",
    bestTimeMs: 112000,
    attemptCount: 71,
    isPublished: true,
    dataAttribution: "© OpenStreetMap contributors",
  },
  {
    id: "d0e1f2a3-b4c5-4789-a123-456789abcdef",
    slug: "egypt-pyramids",
    name: "Giza Desert Circuit",
    description:
      "Spa-style desert lap — Eau Rouge compression, Kemmel Straight past the pyramids and Sphinx, Les Combes chicane and Bus Stop.",
    city: "Giza",
    country: "Egypt",
    latitude: 29.9792,
    longitude: 31.1342,
    distanceMetres: 2634,
    estimatedDurationSeconds: 188,
    difficulty: "hard",
    tags: ["spa-style", "desert", "landmarks"],
    thumbnail: "/images/routes/egypt-pyramids.svg",
    checkpointCount: 14,
    surfaceType: "asphalt",
    bestTimeMs: 148000,
    attemptCount: 42,
    isPublished: true,
    dataAttribution: "Stylised Giza circuit — original procedural geometry",
  },
  {
    id: "e1f2a3b4-c5d6-4789-b234-567890abcdef",
    slug: "dubai-marina-circuit",
    name: "Dubai Marina Circuit",
    description:
      "Marina GP loop around a turquoise basin — hairpin at water level, climb to a hotel crest, then a long east straight staring at Burj Khalifa.",
    city: "Dubai",
    country: "United Arab Emirates",
    latitude: 25.0805,
    longitude: 55.1403,
    distanceMetres: 2060,
    estimatedDurationSeconds: 140,
    difficulty: "medium",
    tags: ["marina", "skyline", "glass", "landmarks"],
    thumbnail: "/images/routes/dubai-marina-circuit.svg",
    checkpointCount: 14,
    surfaceType: "asphalt",
    bestTimeMs: 98000,
    attemptCount: 36,
    isPublished: true,
    dataAttribution: "Stylised Dubai Marina / Downtown circuit — original procedural geometry",
  },
  {
    id: "f2a3b4c5-d6e7-4890-b345-678901abcdef",
    slug: "new-york-harbor-circuit",
    name: "New York Harbor Circuit",
    description:
      "Street GP fantasy — Times Square hairpin, Midtown canyon, Hudson riverside blast past Liberty, then climb Hudson Yards.",
    city: "New York",
    country: "United States",
    latitude: 40.758,
    longitude: -73.9855,
    distanceMetres: 1764,
    estimatedDurationSeconds: 130,
    difficulty: "hard",
    tags: ["street", "harbor", "skyline", "landmarks"],
    thumbnail: "/images/routes/new-york-harbor-circuit.svg",
    checkpointCount: 14,
    surfaceType: "asphalt",
    bestTimeMs: 92000,
    attemptCount: 28,
    isPublished: true,
    dataAttribution: "Stylised New York Midtown / Harbor circuit — original procedural geometry",
  },
];

function validateRoutes(routes: RouteSummary[]): RouteSummary[] {
  return routes.map((route, index) => {
    const parsed = routeSummarySchema.safeParse(route);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid mock route at index ${index}: ${details}`);
    }
    return parsed.data;
  });
}

export const MOCK_ROUTES: RouteSummary[] = validateRoutes(rawRoutes);

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: "d4e5f6a7-b8c9-0123-def0-234567890123",
    routeId: MOCK_ROUTES[0].id,
    displayName: "RiverFox",
    completionTimeMs: 121200,
    createdAt: "2026-07-12T14:22:00.000Z",
    isGuest: false,
  },
  {
    id: "e5f6a7b8-c9d0-1234-ef01-345678901234",
    routeId: MOCK_ROUTES[0].id,
    displayName: "ThamesPilot",
    completionTimeMs: 128800,
    createdAt: "2026-07-18T09:01:00.000Z",
    isGuest: false,
  },
  {
    id: "f6a7b8c9-d0e1-2345-f012-456789012345",
    routeId: MOCK_ROUTES[1].id,
    displayName: "EmberLane",
    completionTimeMs: 109400,
    createdAt: "2026-07-20T16:44:00.000Z",
    isGuest: false,
  },
  {
    id: "a7b8c9d0-e1f2-3456-0123-567890123456",
    routeId: MOCK_ROUTES[1].id,
    displayName: "Guest_4821",
    completionTimeMs: 121200,
    createdAt: "2026-07-22T11:10:00.000Z",
    isGuest: true,
  },
  {
    id: "b8c9d0e1-f2a3-4567-1234-678901234567",
    routeId: MOCK_ROUTES[2].id,
    displayName: "DocksideDev",
    completionTimeMs: 105500,
    createdAt: "2026-07-25T19:33:00.000Z",
    isGuest: false,
  },
  {
    id: "c9d0e1f2-a3b4-5678-2345-789012345678",
    routeId: MOCK_ROUTES[2].id,
    displayName: "WharfWhisper",
    completionTimeMs: 114800,
    createdAt: "2026-07-28T08:15:00.000Z",
    isGuest: false,
  },
  {
    id: "e1f2a3b4-c5d6-4789-b012-678901234abc",
    routeId: MOCK_ROUTES[3].id,
    displayName: "DesertFox",
    completionTimeMs: 141200,
    createdAt: "2026-08-02T12:00:00.000Z",
    isGuest: false,
  },
  {
    id: "f2a3b4c5-d6e7-4890-c123-789012345bcd",
    routeId: MOCK_ROUTES[3].id,
    displayName: "SphinxRunner",
    completionTimeMs: 152400,
    createdAt: "2026-08-05T09:30:00.000Z",
    isGuest: false,
  },
];
