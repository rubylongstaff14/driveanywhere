import { routeDataSchema, type RouteData } from "@/lib/validation/route-data";

export class RouteLoadError extends Error {
  constructor(
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = "RouteLoadError";
  }
}

/**
 * Validates arbitrary route JSON and reports every problem at once.
 *
 * Used by the seeding script and by the bundled route registry; the game
 * itself never loads geometry over the network.
 */
export function validateRouteData(data: unknown): RouteData {
  const parsed = routeDataSchema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new RouteLoadError("Invalid route data.", details);
  }
  return parsed.data;
}
