import { describe, expect, it } from "vitest";
import { isInsideCheckpoint } from "@/lib/game/checkpoints";
import { sampleRoad } from "@/lib/game/road-mesh";
import { validateRouteData } from "@/lib/routes/load-route-data";

const sampleRoute = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  slug: "westminster-sprint",
  name: "Westminster Sprint",
  description: "Test route description for validation coverage.",
  city: "London",
  country: "United Kingdom",
  latitude: 51.5,
  longitude: -0.12,
  distanceMetres: 720,
  estimatedDurationSeconds: 75,
  difficulty: "easy" as const,
  tags: ["sprint"],
  thumbnail: "/images/routes/westminster-sprint.svg",
  startPosition: { x: 0, y: 0.7, z: 0 },
  startRotation: 0,
  roadWidth: 10,
  roadPoints: [
    {
      x: 0,
      y: 0,
      z: 0,
      width: 10,
      banking: 0,
      surfaceType: "asphalt" as const,
    },
    {
      x: 0,
      y: 0,
      z: 40,
      width: 10,
      banking: 0,
      surfaceType: "asphalt" as const,
    },
  ],
  checkpoints: [
    {
      id: "start",
      index: 0,
      position: { x: 0, y: 0, z: 5 },
      rotation: 0,
      width: 10,
      required: true,
    },
    {
      id: "finish",
      index: 1,
      position: { x: 0, y: 0, z: 35 },
      rotation: 0,
      width: 10,
      required: true,
    },
  ],
  buildings: [],
  sceneryObjects: [],
  spawnPoints: [],
  metadata: { version: 1, generatedBy: "test" },
  dataAttribution: "© OpenStreetMap contributors",
};

describe("route data", () => {
  it("validates a well-formed route", () => {
    expect(() => validateRouteData(sampleRoute)).not.toThrow();
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      validateRouteData({ ...sampleRoute, slug: "Bad Slug" }),
    ).toThrow(/Invalid route data/i);
  });

  it("samples a smooth road path", () => {
    const samples = sampleRoad(sampleRoute.roadPoints, 4);
    expect(samples.length).toBeGreaterThan(2);
  });

  it("detects checkpoint containment", () => {
    expect(
      isInsideCheckpoint(sampleRoute.checkpoints[0], 0, 5),
    ).toBe(true);
    expect(
      isInsideCheckpoint(sampleRoute.checkpoints[0], 40, 5),
    ).toBe(false);
  });
});
