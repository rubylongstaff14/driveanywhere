import { describe, expect, it } from "vitest";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";
import { getPublishedRoutes, getRouteBySlug } from "@/lib/routes/get-routes";
import { routeSummarySchema } from "@/lib/validation/route-meta";

describe("mock routes", () => {
  it("seeds nine published routes including Dubai, Tokyo, and New York", async () => {
    const routes = await getPublishedRoutes();
    expect(routes).toHaveLength(9);
    expect(routes.every((route) => route.isPublished)).toBe(true);
    expect(routes.map((route) => route.slug)).toEqual(
      expect.arrayContaining([
        "westminster-sprint",
        "embankment-run",
        "canary-wharf-loop",
        "egypt-pyramids",
        "dubai-marina-circuit",
        "new-york-harbor-circuit",
        "tokyo-drift-circuit",
        "alps-mountain-pass",
        "rio-coast-circuit",
      ]),
    );
    expect(routes.some((route) => route.city === "Giza")).toBe(true);
    expect(routes.some((route) => route.city === "Dubai")).toBe(true);
    expect(routes.some((route) => route.city === "New York")).toBe(true);
    expect(routes.some((route) => route.city === "Tokyo")).toBe(true);
  });

  it("validates every mock route against the Zod schema", () => {
    for (const route of MOCK_ROUTES) {
      const parsed = routeSummarySchema.safeParse(route);
      expect(parsed.success).toBe(true);
    }
  });

  it("loads a route by slug", async () => {
    const route = await getRouteBySlug("westminster-sprint");
    expect(route?.name).toBe("Westminster Sprint");
  });

  it("returns null for unknown slugs", async () => {
    const route = await getRouteBySlug("does-not-exist");
    expect(route).toBeNull();
  });

  it("rejects invalid route metadata", () => {
    const result = routeSummarySchema.safeParse({
      ...MOCK_ROUTES[0],
      slug: "Invalid Slug",
      distanceMetres: -10,
    });
    expect(result.success).toBe(false);
  });
});
