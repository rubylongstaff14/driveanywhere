import { z } from "zod";
import type { OverpassResponse } from "@/lib/geo/route-generation-types";

const overpassElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  nodes: z.array(z.number().int().positive()).optional(),
  geometry: z
    .array(z.object({ lat: z.number(), lon: z.number() }))
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

const overpassResponseSchema = z.object({
  version: z.number(),
  generator: z.string(),
  elements: z.array(overpassElementSchema),
});

export interface OverpassProviderOptions {
  endpoint?: string;
  timeoutMs?: number;
  retries?: number;
  userAgent?: string;
}

const DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * Server/script-only OSM adapter. It is deliberately not imported by game
 * components: all results must be cached before a route is built.
 */
export class OsmOverpassProvider {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly userAgent: string;

  constructor(options: OverpassProviderOptions = {}) {
    this.endpoint = options.endpoint ?? process.env.OVERPASS_API_URL ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.retries = options.retries ?? 1;
    this.userAgent =
      options.userAgent ??
      "DriveAnywhere.ai route generator (development; contact configured by operator)";
  }

  async query(query: string): Promise<OverpassResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "user-agent": this.userAgent,
          },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Overpass returned HTTP ${response.status}`);
        }

        const json: unknown = await response.json();
        return overpassResponseSchema.parse(json);
      } catch (error) {
        lastError = error;
        if (attempt < this.retries) {
          await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `Overpass request failed after ${this.retries + 1} attempt(s): ${String(lastError)}`,
    );
  }
}

export function canaryWharfAreaQuery(): string {
  // A deliberately small bounding box around Bank Street / Heron Quays.
  // Query once through the cache script; never from the browser.
  return `
[out:json][timeout:25];
(
  way["highway"](51.5000,-0.0315,51.5090,-0.0160);
  way["building"](51.5000,-0.0315,51.5090,-0.0160);
  way["building:part"](51.5000,-0.0315,51.5090,-0.0160);
  way["natural"="water"](51.5000,-0.0315,51.5090,-0.0160);
  way["waterway"="riverbank"](51.5000,-0.0315,51.5090,-0.0160);
  way["landuse"~"grass|recreation_ground"](51.5000,-0.0315,51.5090,-0.0160);
  node["highway"~"street_lamp|traffic_signals|crossing"](51.5000,-0.0315,51.5090,-0.0160);
);
out body geom;
`;
}
