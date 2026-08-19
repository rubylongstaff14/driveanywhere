import { describe, expect, it } from "vitest";
import { sampleRoad } from "@/lib/game/road-mesh";
import { buildTurnSigns } from "@/lib/game/track-signs";
import { getRouteData, getRouteDataSlugs } from "@/lib/routes/route-registry";

describe.each(getRouteDataSlugs())("turn signs: %s", (slug) => {
  it("places warning signs before corners from the live layout", () => {
    const route = getRouteData(slug);
    if (!route) throw new Error(`Missing route ${slug}`);
    const samples = sampleRoad(route.roadPoints, 10);
    const signs = buildTurnSigns(samples);
    expect(signs.length).toBeGreaterThanOrEqual(3);
    for (const sign of signs) {
      expect(sign.turn === -1 || sign.turn === 1).toBe(true);
      expect(["mild", "sharp", "hairpin"]).toContain(sign.severity);
      expect([100, 50, 25]).toContain(sign.metres);
      expect(sign.position[1]).toBeGreaterThanOrEqual(0);
    }
  });
});
