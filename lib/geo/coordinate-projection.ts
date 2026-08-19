import proj4 from "proj4";
import type {
  LocalPoint,
  LocalProjection,
  Wgs84Point,
} from "@/lib/geo/route-generation-types";

const WGS84 = "EPSG:4326";
const BRITISH_NATIONAL_GRID =
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 " +
  "+y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs";

const BNG_NAME = "DRIVEANYWHERE:EPSG27700";
proj4.defs(BNG_NAME, BRITISH_NATIONAL_GRID);

/**
 * Converts WGS84 to a local coordinate system measured in metres.  British
 * National Grid is used for UK routes rather than treating degrees as metres.
 */
export function createLocalProjection(origin: Wgs84Point): LocalProjection {
  const [originEasting, originNorthing] = proj4(WGS84, BNG_NAME, [
    origin.longitude,
    origin.latitude,
  ]) as number[];

  return {
    crs: "EPSG:27700",
    origin,
    originEasting,
    originNorthing,
    axes: "x-east-y-up-z-north",
  };
}

export function wgs84ToLocal(
  point: Wgs84Point,
  projection: LocalProjection,
): LocalPoint {
  const [easting, northing] = proj4(WGS84, BNG_NAME, [
    point.longitude,
    point.latitude,
  ]) as number[];

  return {
    x: easting - projection.originEasting,
    y: point.elevationMetres ?? 0,
    z: northing - projection.originNorthing,
  };
}

export function localToWgs84(
  point: LocalPoint,
  projection: LocalProjection,
): Wgs84Point {
  const [longitude, latitude] = proj4(BNG_NAME, WGS84, [
    point.x + projection.originEasting,
    point.z + projection.originNorthing,
  ]) as number[];

  return {
    latitude,
    longitude,
    elevationMetres: point.y,
  };
}

export function localDistanceMetres(a: LocalPoint, b: LocalPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}
