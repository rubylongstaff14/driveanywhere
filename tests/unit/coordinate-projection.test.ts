import { describe, expect, it } from "vitest";
import {
  createLocalProjection,
  localDistanceMetres,
  localToWgs84,
  wgs84ToLocal,
} from "@/lib/geo/coordinate-projection";

describe("British National Grid local projection", () => {
  const origin = { latitude: 51.503585, longitude: -0.025232 };
  const projection = createLocalProjection(origin);

  it("maps its origin to local zero", () => {
    const local = wgs84ToLocal(origin, projection);
    expect(local.x).toBeCloseTo(0, 5);
    expect(local.z).toBeCloseTo(0, 5);
  });

  it("round-trips WGS84 coordinates at Canary Wharf", () => {
    const point = { latitude: 51.500169, longitude: -0.016282 };
    const roundTrip = localToWgs84(wgs84ToLocal(point, projection), projection);
    expect(roundTrip.latitude).toBeCloseTo(point.latitude, 6);
    expect(roundTrip.longitude).toBeCloseTo(point.longitude, 6);
  });

  it("reports a plausible metre distance rather than degree distance", () => {
    const a = wgs84ToLocal(origin, projection);
    const b = wgs84ToLocal(
      { latitude: 51.503585, longitude: -0.024232 },
      projection,
    );
    expect(localDistanceMetres(a, b)).toBeGreaterThan(60);
    expect(localDistanceMetres(a, b)).toBeLessThan(80);
  });
});
