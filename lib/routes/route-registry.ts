import alpsMountainPass from "@/public/routes/alps-mountain-pass.json";
import canaryWharfLoop from "@/public/routes/canary-wharf-loop.json";
import dubaiMarinaCircuit from "@/public/routes/dubai-marina-circuit.json";
import egyptPyramids from "@/public/routes/egypt-pyramids.json";
import embankmentRun from "@/public/routes/embankment-run.json";
import newYorkHarborCircuit from "@/public/routes/new-york-harbor-circuit.json";
import rioCoastCircuit from "@/public/routes/rio-coast-circuit.json";
import tokyoDriftCircuit from "@/public/routes/tokyo-drift-circuit.json";
import westminsterSprint from "@/public/routes/westminster-sprint.json";
import { routeDataSchema, type RouteData } from "@/lib/validation/route-data";
import { sampleRoad } from "@/lib/game/road-mesh";
import { aabbAsphaltClearance } from "@/lib/game/building-road-clearance";

/**
 * Route geometry is imported statically rather than fetched at runtime.
 *
 * A network fetch could 404, serve a stale cached failure, or race the dev
 * server while files are being reseeded. Bundling the JSON means a route that
 * exists at build time can never go missing at play time, and a malformed
 * route fails the production build instead of the player's session.
 */
const RAW_ROUTES: Record<string, unknown> = {
  "westminster-sprint": westminsterSprint,
  "embankment-run": embankmentRun,
  "canary-wharf-loop": canaryWharfLoop,
  "egypt-pyramids": egyptPyramids,
  "dubai-marina-circuit": dubaiMarinaCircuit,
  "new-york-harbor-circuit": newYorkHarborCircuit,
  "tokyo-drift-circuit": tokyoDriftCircuit,
  "alps-mountain-pass": alpsMountainPass,
  "rio-coast-circuit": rioCoastCircuit,
};

const cache = new Map<string, RouteData>();

export function getRouteDataSlugs(): string[] {
  return Object.keys(RAW_ROUTES);
}

export function hasRouteData(slug: string): boolean {
  return slug in RAW_ROUTES;
}

/**
 * Returns validated geometry for a slug, or null when no such route exists.
 * Throws only when a bundled route is structurally invalid, which is a
 * developer error worth surfacing loudly.
 */
export function getRouteData(slug: string): RouteData | null {
  const cached = cache.get(slug);
  if (cached) return cached;

  const raw = RAW_ROUTES[slug];
  if (!raw) return null;

  const parsed = routeDataSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Bundled route "${slug}" is invalid: ${details}`);
  }

  // Published source data can contain dense city-fill footprints that clip the
  // racing ribbon. Remove those boxes once at load time so they cannot render
  // as scenery or become invisible physics blockers on any quality preset.
  const roadSamples = sampleRoad(parsed.data.roadPoints, 10);
  const buildings = parsed.data.buildings.filter((building) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const point of building.footprint) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
    return (
      aabbAsphaltClearance(
        roadSamples,
        (minX + maxX) / 2,
        (minZ + maxZ) / 2,
        Math.max(0.9, (maxX - minX) / 2),
        Math.max(0.9, (maxZ - minZ) / 2),
      ) >= 0.5
    );
  });
  const safeRoute =
    buildings.length === parsed.data.buildings.length
      ? parsed.data
      : { ...parsed.data, buildings };

  cache.set(slug, safeRoute);
  return safeRoute;
}
