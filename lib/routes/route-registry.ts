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

  cache.set(slug, parsed.data);
  return parsed.data;
}
