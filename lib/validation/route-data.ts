import { z } from "zod";

export const vec3Schema = z.object({
  x: z.number(),
  y: z.number().min(0),
  z: z.number(),
});

export const roadPointSchema = z.object({
  x: z.number(),
  y: z.number().min(0).default(0),
  z: z.number(),
  width: z.number().positive().default(10),
  banking: z.number().default(0),
  speedRecommendation: z.number().positive().optional(),
  surfaceType: z.enum(["asphalt", "concrete", "mixed"]).default("asphalt"),
});

export const checkpointSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().nonnegative(),
  position: vec3Schema,
  rotation: z.number().default(0),
  width: z.number().positive().default(10),
  required: z.boolean().default(true),
});

export const buildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  footprint: z.array(vec3Schema).min(3),
  height: z.number().positive(),
  baseHeight: z.number().nonnegative().default(0),
  floors: z.number().int().positive().default(1),
  style: z.enum([
    "london_terrace",
    "modern_office",
    "apartment_block",
    "retail_ground_floor",
    "warehouse",
    "landmark_placeholder",
    "glass_curtain_wall",
    "steel_and_glass_tower",
    "modern_office_podium",
    "contemporary_apartment",
    "concrete_office",
    "brick_commercial",
    "dockside_warehouse",
    "generic_distant_tower",
  ]),
  facadeMaterial: z.string().default("brick"),
  facadeColor: z.string().min(3).max(32).optional(),
  roofType: z.enum(["flat", "pitched", "pyramidal", "round"]).default("flat"),
  confidence: z.number().min(0).max(1).default(0.5),
  source: z.string().default("procedural"),
});

export const sceneryObjectSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["tree", "street_light", "barrier"]),
  position: vec3Schema,
  rotation: z.number().default(0),
  scale: z.number().positive().default(1),
});

const wgs84PointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationMetres: z.number().optional(),
});

const sourceReferenceSchema = z.object({
  type: z.enum([
    "road_geometry",
    "building_footprints",
    "street_features",
    "elevation",
    "imagery",
  ]),
  provider: z.string().min(1),
  licence: z.string().min(1),
  attribution: z.string().min(1),
  retrievedAt: z.string().datetime().optional(),
  cachePath: z.string().min(1).optional(),
});

const sourceRoadSegmentSchema = z.object({
  osmWayId: z.number().int().positive(),
  name: z.string().nullable(),
  highway: z.string().min(1),
  oneWay: z.boolean(),
  lanes: z.number().int().positive().nullable(),
  maxSpeedKph: z.number().positive().nullable(),
  surface: z.string().nullable(),
  bridge: z.boolean(),
  tunnel: z.boolean(),
  layer: z.number().int().nullable(),
  points: z.array(wgs84PointSchema).min(2),
});

const sourceBuildingSchema = z.object({
  osmWayId: z.number().int().positive(),
  footprint: z.array(wgs84PointSchema).min(3),
  buildingType: z.string().nullable(),
  heightMetres: z.number().positive().nullable(),
  levels: z.number().int().positive().nullable(),
  roofShape: z.string().nullable(),
  tags: z.record(z.string(), z.string()),
});

const gameplayAdjustmentSchema = z.object({
  type: z.enum([
    "junction_smoothing",
    "road_width_override",
    "temporary_barrier",
    "checkpoint_placement",
    "spawn_adjustment",
  ]),
  reason: z.string().min(1),
  sourceSegmentIds: z.array(z.string().min(1)),
  details: z.string().optional(),
});

const realWorldRouteSchema = z.object({
  projection: z.object({
    crs: z.literal("EPSG:27700"),
    origin: wgs84PointSchema,
    originEasting: z.number(),
    originNorthing: z.number(),
    axes: z.literal("x-east-y-up-z-north"),
  }),
  sources: z.array(sourceReferenceSchema).min(1),
  sourceGeometry: z.object({
    roads: z.array(sourceRoadSegmentSchema).min(1),
    buildings: z.array(sourceBuildingSchema),
  }),
  contextGeometry: z
    .object({
      roads: z.array(
        z.object({
          osmWayId: z.number().int().positive(),
          name: z.string().nullable(),
          highway: z.string().min(1),
          points: z.array(wgs84PointSchema).min(2),
        }),
      ),
      waterAreas: z.array(
        z.object({
          osmWayId: z.number().int().positive(),
          points: z.array(wgs84PointSchema).min(3),
        }),
      ),
      greenAreas: z.array(
        z.object({
          osmWayId: z.number().int().positive(),
          points: z.array(wgs84PointSchema).min(3),
        }),
      ),
    })
    .optional(),
  playableGeometry: z.object({
    gameplayAdjustments: z.array(gameplayAdjustmentSchema),
  }),
});

export const routeDataSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  city: z.string().min(1),
  country: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  distanceMetres: z.number().positive(),
  estimatedDurationSeconds: z.number().int().positive(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).max(12),
  thumbnail: z.string().min(1),
  startPosition: vec3Schema,
  startRotation: z.number().default(0),
  roadWidth: z.number().positive().default(10),
  checkpoints: z.array(checkpointSchema).min(2),
  roadPoints: z.array(roadPointSchema).min(2),
  buildings: z.array(buildingSchema).default([]),
  sceneryObjects: z.array(sceneryObjectSchema).default([]),
  spawnPoints: z.array(vec3Schema).default([]),
  metadata: z
    .object({
      version: z.number().int().positive().default(1),
      generatedBy: z.string().default("manual"),
      notes: z.string().optional(),
    })
    .default({ version: 1, generatedBy: "manual" }),
  dataAttribution: z.string().min(1),
  /**
   * Present for routes generated from licenced geographic data. Legacy mock
   * routes intentionally omit it and remain valid in offline/mock mode.
   */
  realWorld: realWorldRouteSchema.optional(),
});

export type RouteData = z.infer<typeof routeDataSchema>;
export type RoadPoint = z.infer<typeof roadPointSchema>;
export type RouteCheckpoint = z.infer<typeof checkpointSchema>;
export type RouteBuilding = z.infer<typeof buildingSchema>;
