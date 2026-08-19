export interface Wgs84Point {
  latitude: number;
  longitude: number;
  elevationMetres?: number;
}

export interface LocalPoint {
  x: number;
  y: number;
  z: number;
}

export interface LocalProjection {
  /** Spatial reference used for stable metre calculations. */
  crs: "EPSG:27700";
  /** WGS84 geographic point which maps to local (0, 0, 0). */
  origin: Wgs84Point;
  /** Easting/northing of the origin in EPSG:27700 metres. */
  originEasting: number;
  originNorthing: number;
  /** Local coordinate orientation: +x east, +z north, +y up. */
  axes: "x-east-y-up-z-north";
}

export interface SourceReference {
  type:
    | "road_geometry"
    | "building_footprints"
    | "street_features"
    | "elevation"
    | "imagery";
  provider: string;
  licence: string;
  attribution: string;
  retrievedAt?: string;
  cachePath?: string;
}

export interface SourceRoadSegment {
  osmWayId: number;
  name: string | null;
  highway: string;
  oneWay: boolean;
  lanes: number | null;
  maxSpeedKph: number | null;
  surface: string | null;
  bridge: boolean;
  tunnel: boolean;
  layer: number | null;
  points: Wgs84Point[];
}

export interface SourceBuilding {
  osmWayId: number;
  footprint: Wgs84Point[];
  buildingType: string | null;
  heightMetres: number | null;
  levels: number | null;
  roofShape: string | null;
  tags: Record<string, string>;
}

export interface SourceGeometry {
  roads: SourceRoadSegment[];
  buildings: SourceBuilding[];
  features: Array<{
    osmType: "node" | "way";
    osmId: number;
    type: "tree" | "street_light" | "traffic_signal" | "crossing";
    position: Wgs84Point;
    tags: Record<string, string>;
  }>;
}

export interface GameplayAdjustment {
  type:
    | "junction_smoothing"
    | "road_width_override"
    | "temporary_barrier"
    | "checkpoint_placement"
    | "spawn_adjustment";
  reason: string;
  sourceSegmentIds: string[];
  details?: string;
}

export interface PlayableRoadSegment {
  sourceWayIds: number[];
  points: LocalPoint[];
  widthMetres: number;
  laneCount: number;
  oneWay: boolean;
  surfaceType: "asphalt" | "concrete" | "mixed";
}

export interface PlayableGeometry {
  centreline: LocalPoint[];
  roadSegments: PlayableRoadSegment[];
  gameplayAdjustments: GameplayAdjustment[];
}

export interface GeneratedRouteManifest {
  version: 1;
  routeSlug: string;
  generatedAt: string;
  generatorVersion: string;
  sources: SourceReference[];
  projection: LocalProjection;
  sourceGeometry: SourceGeometry;
  playableGeometry: PlayableGeometry;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}
