import { describe, expect, it } from "vitest";
import { getRouteData } from "@/lib/routes/route-registry";

describe("Canary Wharf circuit landmarks", () => {
  const route = getRouteData("canary-wharf-loop");

  it("bundles a playable Canary Wharf circuit", () => {
    expect(route).not.toBeNull();
    expect(route?.slug).toBe("canary-wharf-loop");
    expect(route?.distanceMetres).toBeGreaterThan(1500);
  });

  it("includes recognisable named Canary Wharf buildings", () => {
    const names = new Set(
      route?.buildings.map((building) => building.name).filter(Boolean),
    );
    for (const required of [
      "One Canada Square",
      "HSBC UK",
      "Citi",
      "Newfoundland Quay",
      "Landmark Pinnacle",
      "South Quay Plaza",
    ]) {
      expect(names).toContain(required);
    }

    const oneCanadaSquare = route?.buildings.find(
      (building) => building.name === "One Canada Square",
    );
    expect(oneCanadaSquare?.height).toBeGreaterThanOrEqual(235);
    expect(
      (oneCanadaSquare?.height ?? 0) - (oneCanadaSquare?.baseHeight ?? 0),
    ).toBe(235);
    expect(oneCanadaSquare?.roofType).toBe("pyramidal");
  });

  it("keeps landmark towers clear of the racing line", () => {
    const landmarks = (route?.buildings ?? []).filter((b) => b.name);
    expect(landmarks.length).toBeGreaterThanOrEqual(15);
    // Flagship skyline towers stay tall; shorter labelled sights (gardens,
    // museums) are allowed as long as they remain named.
    const tall = landmarks.filter((b) => b.height >= 100);
    expect(tall.length).toBeGreaterThan(5);
  });
});

describe.each([
  "westminster-sprint",
  "embankment-run",
  "canary-wharf-loop",
  "egypt-pyramids",
  "dubai-marina-circuit",
  "new-york-harbor-circuit",
] as const)("labelled landmarks: %s", (slug) => {
  it("includes at least 10 named labelled buildings", () => {
    const route = getRouteData(slug);
    const named = (route?.buildings ?? []).filter((b) => b.name);
    expect(named.length).toBeGreaterThanOrEqual(10);
  });
});

describe("Dubai and New York skyline landmarks", () => {
  it("includes 30+ iconic Dubai towers with Burj Khalifa", () => {
    const route = getRouteData("dubai-marina-circuit");
    const named = (route?.buildings ?? []).filter((b) => b.name);
    expect(named.length).toBeGreaterThanOrEqual(30);
    const names = new Set(named.map((b) => b.name));
    expect(names).toContain("Burj Khalifa");
    expect(names).toContain("Burj Al Arab");
    expect(names).toContain("Cayan Tower");
    expect(names).toContain("Museum of the Future");
    const burj = named.find((b) => b.name === "Burj Khalifa");
    expect(burj?.height).toBeGreaterThanOrEqual(300);
  });

  it("includes 30+ iconic New York towers with Empire State", () => {
    const route = getRouteData("new-york-harbor-circuit");
    const named = (route?.buildings ?? []).filter((b) => b.name);
    expect(named.length).toBeGreaterThanOrEqual(30);
    const names = new Set(named.map((b) => b.name));
    expect(names).toContain("Empire State Building");
    expect(names).toContain("Chrysler Building");
    expect(names).toContain("One World Trade Center");
    expect(names).toContain("Statue of Liberty");
    expect(names).toContain("Flatiron");
  });
});
