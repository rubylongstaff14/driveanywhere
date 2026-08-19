import { z } from "zod";

export const routeDifficultySchema = z.enum(["easy", "medium", "hard"]);

export const routeSurfaceTypeSchema = z.enum(["asphalt", "concrete", "mixed"]);

export const routeSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  city: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceMetres: z.number().positive().max(50_000),
  estimatedDurationSeconds: z.number().int().positive().max(86_400),
  difficulty: routeDifficultySchema,
  tags: z.array(z.string().min(1).max(32)).max(12),
  thumbnail: z.string().min(1),
  checkpointCount: z.number().int().positive().max(200),
  surfaceType: routeSurfaceTypeSchema,
  bestTimeMs: z.number().int().positive().nullable(),
  attemptCount: z.number().int().nonnegative(),
  isPublished: z.boolean(),
  dataAttribution: z.string().min(1),
});

export const leaderboardEntrySchema = z.object({
  id: z.string().uuid(),
  routeId: z.string().uuid(),
  displayName: z.string().min(1).max(40),
  completionTimeMs: z.number().int().positive(),
  createdAt: z.string().datetime(),
  isGuest: z.boolean(),
});

export type RouteSummaryInput = z.infer<typeof routeSummarySchema>;
