import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createLocalProjection,
  localDistanceMetres,
  wgs84ToLocal,
} from "../../lib/geo/coordinate-projection";
import { validatePlayablePolyline } from "../../lib/geo/route-validation";
import type {
  LocalPoint,
  OverpassElement,
  OverpassResponse,
  SourceBuilding,
  SourceRoadSegment,
  Wgs84Point,
} from "../../lib/geo/route-generation-types";
import { validateRouteData } from "../../lib/routes/load-route-data";
import type { RouteData } from "../../lib/validation/route-data";

const rawPath = path.join(
  process.cwd(),
  "data/routes/canary-wharf/raw/osm-area.json",
);
const outputPath = path.join(process.cwd(), "public/routes/canary-wharf-loop.json");
const manifestPath = path.join(
  process.cwd(),
  "data/routes/canary-wharf/processed/manifest.json",
);

/**
 * Verified connected OSM ways forming the public, approximately 800m Marsh
 * Wall course. Direction is the race direction; source IDs are retained.
 */
const MARSH_WALL_ROUTE_WAYS = [
  { id: 142296529, reverse: false },
  { id: 1390577486, reverse: false },
  { id: 142296526, reverse: false },
  { id: 1390577488, reverse: false },
  { id: 372805561, reverse: false },
  { id: 618388846, reverse: false },
  { id: 372805562, reverse: false },
] as const;

const REQUIRED_SKYLINE_BUILDINGS = new Set([
  "One Canada Square",
  "South Quay Plaza",
  "Novotel London Canary Wharf",
]);

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseSpeedKph(value: string | undefined): number | null {
  if (!value) return null;
  const number = Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(number) || number <= 0) return null;
  return value.includes("mph") ? Math.round(number * 1.60934) : number;
}

function isEligibleMarshWall(element: OverpassElement): boolean {
  const tags = element.tags;
  if (
    element.type !== "way" ||
    !element.geometry ||
    !element.nodes ||
    tags?.name !== "Marsh Wall" ||
    !tags.highway
  ) {
    return false;
  }

  return (
    tags.access !== "private" &&
    tags.access !== "no" &&
    tags.bridge !== "yes" &&
    tags.tunnel !== "yes" &&
    (tags.layer === undefined || tags.layer === "0") &&
    (tags.level === undefined || tags.level === "0")
  );
}

function distanceToPolyline(point: LocalPoint, line: LocalPoint[]): number {
  let best = Infinity;
  for (let index = 1; index < line.length; index += 1) {
    const a = line[index - 1];
    const b = line[index];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lengthSquared = abx * abx + abz * abz;
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.z - a.z) * abz) / lengthSquared));
    best = Math.min(best, Math.hypot(point.x - (a.x + abx * t), point.z - (a.z + abz * t)));
  }
  return best;
}

function footprintDistanceToPolyline(
  footprint: Wgs84Point[],
  projection: ReturnType<typeof createLocalProjection>,
  line: LocalPoint[],
): number {
  return Math.min(
    ...footprint.map((point) =>
      distanceToPolyline(wgs84ToLocal(point, projection), line),
    ),
  );
}

function inferBuildingStyle(building: SourceBuilding): RouteData["buildings"][number]["style"] {
  const type = building.buildingType ?? "";
  const material = building.tags["building:material"] ?? "";
  const name = building.tags.name ?? building.tags["addr:housename"] ?? "";
  const height = building.heightMetres ?? (building.levels ?? 0) * 3.4;
  if (name === "One Canada Square") return "steel_and_glass_tower";
  if (type.includes("warehouse")) return "dockside_warehouse";
  if (type.includes("apartments") || type.includes("residential")) {
    return "contemporary_apartment";
  }
  if (type.includes("retail")) return "brick_commercial";
  if (height >= 80) return "generic_distant_tower";
  if (material.includes("glass") || height >= 35) return "glass_curtain_wall";
  if (type.includes("commercial") || type.includes("office")) {
    return "modern_office_podium";
  }
  return "concrete_office";
}

function estimatedBuildingHeight(building: SourceBuilding): number {
  return building.heightMetres ?? (building.levels ? building.levels * 3.4 : 18);
}

function sourceFacadeColor(building: SourceBuilding): string | undefined {
  const value =
    building.tags["building:colour"] ?? building.tags["building:color"];
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed) || /^[a-z]{3,20}$/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

function pointAtDistance(points: LocalPoint[], target: number): LocalPoint {
  let travelled = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const length = localDistanceMetres(a, b);
    if (travelled + length >= target) {
      const t = (target - travelled) / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
    travelled += length;
  }
  return points[points.length - 1];
}

function yawAtDistance(points: LocalPoint[], target: number): number {
  const a = pointAtDistance(points, Math.max(0, target - 2));
  const b = pointAtDistance(points, target + 2);
  return Math.atan2(b.x - a.x, b.z - a.z);
}

async function main() {
  const raw = JSON.parse(await readFile(rawPath, "utf8")) as OverpassResponse;
  const eligible = raw.elements.filter(isEligibleMarshWall);
  if (eligible.length === 0) throw new Error("No eligible public Marsh Wall ways in OSM cache.");

  const eligibleById = new Map(eligible.map((way) => [way.id, way]));
  const orderedWays = MARSH_WALL_ROUTE_WAYS.map(({ id, reverse }) => {
    const way = eligibleById.get(id);
    if (!way?.geometry || !way.nodes) {
      throw new Error(`Required eligible source way ${id} is missing from OSM cache.`);
    }
    return reverse
      ? {
          ...way,
          nodes: [...way.nodes].reverse(),
          geometry: [...way.geometry].reverse(),
        }
      : way;
  });

  const sourceRoads: SourceRoadSegment[] = orderedWays.map((way) => ({
    osmWayId: way.id,
    name: way.tags?.name ?? null,
    highway: way.tags?.highway ?? "unclassified",
    oneWay: way.tags?.oneway === "yes",
    lanes: parsePositiveInt(way.tags?.lanes),
    maxSpeedKph: parseSpeedKph(way.tags?.maxspeed),
    surface: way.tags?.surface ?? null,
    bridge: way.tags?.bridge === "yes",
    tunnel: way.tags?.tunnel === "yes",
    layer: way.tags?.layer ? Number(way.tags.layer) : null,
    points: (way.geometry ?? []).map((point) => ({
      latitude: point.lat,
      longitude: point.lon,
    })),
  }));

  const projection = createLocalProjection(sourceRoads[0].points[0]);
  const sourceCentreline = sourceRoads.flatMap((road, index) =>
    road.points.slice(index === 0 ? 0 : 1).map((point) => wgs84ToLocal(point, projection)),
  );
  const centreline = sourceCentreline;
  const geometryValidation = validatePlayablePolyline(
    sourceCentreline,
    centreline,
    { maxDeviationMetres: 0.1, maxGradient: 0.2 },
  );
  if (!geometryValidation.valid) {
    throw new Error(`Generated geometry is invalid: ${geometryValidation.errors.join(" ")}`);
  }
  const distanceMetres = Math.round(
    centreline.slice(1).reduce(
      (sum, point, index) => sum + localDistanceMetres(centreline[index], point),
      0,
    ),
  );
  if (distanceMetres < 780 || distanceMetres > 1500) {
    throw new Error(`Selected Marsh Wall path is ${distanceMetres}m; expected approximately 800–1500m.`);
  }

  const sourceBuildings: SourceBuilding[] = raw.elements
    .filter(
      (element) =>
        element.type === "way" &&
        (element.tags?.building || element.tags?.["building:part"]) &&
        element.geometry,
    )
    .map((element) => ({
      osmWayId: element.id,
      footprint: (element.geometry ?? []).map((point) => ({
        latitude: point.lat,
        longitude: point.lon,
      })),
      buildingType:
        element.tags?.building ?? element.tags?.["building:part"] ?? null,
      heightMetres: Number(element.tags?.height) || null,
      levels: parsePositiveInt(element.tags?.["building:levels"]),
      roofShape: element.tags?.["roof:shape"] ?? null,
      tags: element.tags ?? {},
    }))
    .map((building) => ({
      building,
      distance: footprintDistanceToPolyline(
        building.footprint, projection, centreline,
      ),
    }))
    .filter(({ building, distance }) => {
      // Keep genuinely nearby buildings, but exclude geometry touching the
      // vehicle corridor. High-rises define the wider Canary Wharf skyline.
      const skyline =
        REQUIRED_SKYLINE_BUILDINGS.has(
          building.tags.name ?? building.tags["addr:housename"] ?? "",
        ) ||
        estimatedBuildingHeight(building) >= 80 ||
        (building.levels ?? 0) >= 24;
      return skyline
        ? distance >= 4.6 && distance <= 1100
        : distance >= 8 && distance <= 420;
    })
    .sort((a, b) => {
      const aSkyline = estimatedBuildingHeight(a.building) >= 80;
      const bSkyline = estimatedBuildingHeight(b.building) >= 80;
      if (aSkyline !== bSkyline) return aSkyline ? -1 : 1;
      return a.distance - b.distance;
    })
    .slice(0, 320)
    .map(({ building }) => building);

  const routeWayIds = new Set(sourceRoads.map((road) => road.osmWayId));
  const contextRoadTypes = new Set([
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "residential",
    "unclassified",
    "service",
  ]);
  const contextRoads = raw.elements
    .filter(
      (element) =>
        element.type === "way" &&
        element.geometry &&
        element.tags?.highway &&
        contextRoadTypes.has(element.tags.highway) &&
        element.tags.access !== "private" &&
        element.tags.access !== "no" &&
        !routeWayIds.has(element.id),
    )
    .map((element) => ({
      osmWayId: element.id,
      name: element.tags?.name ?? null,
      highway: element.tags?.highway ?? "service",
      points: (element.geometry ?? []).map((point) => ({
        latitude: point.lat,
        longitude: point.lon,
      })),
    }))
    .filter((road) =>
      road.points.some(
        (point) =>
          distanceToPolyline(wgs84ToLocal(point, projection), centreline) <= 420,
      ),
    );

  const contextAreas = raw.elements
    .filter(
      (element) =>
        element.type === "way" &&
        element.geometry &&
        (element.tags?.natural === "water" ||
          element.tags?.waterway === "riverbank" ||
          element.tags?.landuse === "grass" ||
          element.tags?.landuse === "recreation_ground"),
    )
    .map((element) => ({
      osmWayId: element.id,
      kind:
        element.tags?.natural === "water" ||
        element.tags?.waterway === "riverbank"
          ? ("water" as const)
          : ("green" as const),
      points: (element.geometry ?? []).map((point) => ({
        latitude: point.lat,
        longitude: point.lon,
      })),
    }));

  const streetLights: RouteData["sceneryObjects"] = raw.elements
    .filter(
      (element) =>
        element.type === "node" &&
        element.tags?.highway === "street_lamp" &&
        element.lat !== undefined &&
        element.lon !== undefined,
    )
    .map((element) => ({
      id: `osm-street-lamp-${element.id}`,
      type: "street_light" as const,
      position: wgs84ToLocal(
        { latitude: element.lat ?? 0, longitude: element.lon ?? 0 },
        projection,
      ),
      rotation: 0,
      scale: 1,
    }))
    .filter(
      (light) => distanceToPolyline(light.position, centreline) <= 55,
    );

  // OSM street lamps are sparse along Marsh Wall — fill gaps with original
  // circuit furniture so the roadside does not look empty.
  const syntheticScenery: RouteData["sceneryObjects"] = [];
  const stepMetres = 18;
  for (let distance = 8; distance < distanceMetres - 8; distance += stepMetres) {
    const point = pointAtDistance(centreline, distance);
    const yaw = yawAtDistance(centreline, distance);
    const sideways = {
      x: Math.cos(yaw),
      z: -Math.sin(yaw),
    };
    const offset = 7.2;
    for (const side of [-1, 1] as const) {
      const index = Math.round(distance / stepMetres);
      syntheticScenery.push({
        id: `circuit-light-${index}-${side}`,
        type: "street_light",
        position: {
          x: point.x + sideways.x * offset * side,
          y: 0,
          z: point.z + sideways.z * offset * side,
        },
        rotation: yaw,
        scale: 1,
      });
      if (index % 2 === 0) {
        syntheticScenery.push({
          id: `circuit-tree-${index}-${side}`,
          type: "tree",
          position: {
            x: point.x + sideways.x * (offset + 2.4) * side,
            y: 0,
            z: point.z + sideways.z * (offset + 2.4) * side,
          },
          rotation: yaw + side * 0.2,
          scale: 0.9 + (index % 3) * 0.08,
        });
      }
    }
  }

  const sceneryObjects = [...streetLights, ...syntheticScenery];

  const roadWidth = 10;
  const checkpointCount = Math.max(5, Math.min(7, Math.round(distanceMetres / 160)));
  const checkpoints = Array.from({ length: checkpointCount }, (_, index) => {
    const distance = 12 + (index / (checkpointCount - 1)) * (distanceMetres - 24);
    const point = pointAtDistance(centreline, distance);
    return {
      id: `canary-wharf-marsh-wall-cp-${index}`,
      index,
      position: point,
      rotation: yawAtDistance(centreline, distance),
      width: roadWidth,
      required: true,
    };
  });

  const route: RouteData = {
    id: "c3d4e5f6-a7b8-4012-8def-123456789012",
    slug: "canary-wharf-loop",
    name: "Canary Wharf · Marsh Wall Run",
    description:
      "A closed-road race conversion following a genuine section of Marsh Wall in Canary Wharf. Source road and building data are retained in the route manifest.",
    city: "London",
    country: "United Kingdom",
    latitude: projection.origin.latitude,
    longitude: projection.origin.longitude,
    distanceMetres,
    estimatedDurationSeconds: Math.round(distanceMetres / 14),
    difficulty: "medium",
    tags: ["canary-wharf", "osm-backed", "point-to-point"],
    thumbnail: "/images/routes/canary-wharf-loop.svg",
    startPosition: centreline[0],
    startRotation: yawAtDistance(centreline, 0),
    roadWidth,
    checkpoints,
    roadPoints: centreline.map((point) => ({
      ...point,
      width: roadWidth,
      banking: 0,
      speedRecommendation: 18,
      surfaceType: "asphalt",
    })),
    buildings: sourceBuildings.map((building) => {
      const height = estimatedBuildingHeight(building);
      const explicitMinHeight = Number(building.tags.min_height);
      const minLevel = parsePositiveInt(building.tags["building:min_level"]);
      const baseHeight =
        Number.isFinite(explicitMinHeight) && explicitMinHeight > 0
          ? explicitMinHeight
          : minLevel
            ? minLevel * 3.4
            : 0;
      const style = inferBuildingStyle(building);
      const sourceMaterial = building.tags["building:material"] ?? "";
      const facadeMaterial =
        sourceMaterial.includes("brick") ||
        style === "brick_commercial" ||
        style === "dockside_warehouse"
          ? "brick"
          : sourceMaterial.includes("glass") ||
              style === "glass_curtain_wall" ||
              style === "steel_and_glass_tower" ||
              style === "generic_distant_tower"
            ? "glass"
            : "concrete";
      const roofType =
        building.roofShape === "pyramidal"
          ? "pyramidal"
          : building.roofShape === "round"
            ? "round"
            : building.roofShape === "gabled" ||
                building.roofShape === "hipped"
              ? "pitched"
              : "flat";
      return {
        id: `osm-building-${building.osmWayId}`,
        name: building.tags.name ?? building.tags["addr:housename"],
        footprint: building.footprint.map((point) => wgs84ToLocal(point, projection)),
        height,
        baseHeight: Math.min(baseHeight, Math.max(0, height - 1)),
        floors: building.levels ?? Math.max(1, Math.round(height / 3.4)),
        style,
        facadeMaterial,
        facadeColor: sourceFacadeColor(building),
        roofType,
        confidence: building.heightMetres ? 0.95 : building.levels ? 0.8 : 0.45,
        source: `OpenStreetMap way/${building.osmWayId}`,
      };
    }),
    sceneryObjects,
    spawnPoints: [centreline[0]],
    metadata: {
      version: 4,
      generatedBy: "scripts/geo/generate-canary-wharf-route.ts",
      notes:
        "Genuine OSM source geometry. Widths, barriers, checkpoints, and smoothing are gameplay adaptations recorded in realWorld.playableGeometry.",
    },
    dataAttribution: "© OpenStreetMap contributors (ODbL) — Marsh Wall route and nearby building footprints",
    realWorld: {
      projection,
      sources: [
        {
          type: "road_geometry",
          provider: "OpenStreetMap",
          licence: "ODbL",
          attribution: "© OpenStreetMap contributors",
          retrievedAt: new Date().toISOString(),
          cachePath: "data/routes/canary-wharf/raw/osm-area.json",
        },
        {
          type: "building_footprints",
          provider: "OpenStreetMap",
          licence: "ODbL",
          attribution: "© OpenStreetMap contributors",
          retrievedAt: new Date().toISOString(),
          cachePath: "data/routes/canary-wharf/raw/osm-area.json",
        },
      ],
      sourceGeometry: {
        roads: sourceRoads,
        buildings: sourceBuildings,
      },
      contextGeometry: {
        roads: contextRoads,
        waterAreas: contextAreas
          .filter((area) => area.kind === "water")
          .map(({ osmWayId, points }) => ({ osmWayId, points })),
        greenAreas: contextAreas
          .filter((area) => area.kind === "green")
          .map(({ osmWayId, points }) => ({ osmWayId, points })),
      },
      playableGeometry: {
        gameplayAdjustments: [
          {
            type: "road_width_override",
            reason: "A consistent playable lane width is required while detailed lane geometry is added in Milestone C.",
            sourceSegmentIds: sourceRoads.map((road) => String(road.osmWayId)),
            details: "Source lane tags retained; rendered road width set to 10m.",
          },
          {
            type: "temporary_barrier",
            reason: "This is a closed-road racing conversion with traffic removed.",
            sourceSegmentIds: sourceRoads.map((road) => String(road.osmWayId)),
          },
          {
            type: "checkpoint_placement",
            reason: "Checkpoints are spaced along the genuine centreline for race progression.",
            sourceSegmentIds: sourceRoads.map((road) => String(road.osmWayId)),
          },
        ],
      },
    },
  };

  validateRouteData(route);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(route, null, 2)}\n`, "utf8");
  await writeFile(
    manifestPath,
    `${JSON.stringify(route.realWorld, null, 2)}\n`,
    "utf8",
  );
  console.info(
    `Generated ${route.name}: ${distanceMetres}m, ${sourceRoads.length} source ways, ${sourceBuildings.length} nearby OSM footprints.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
