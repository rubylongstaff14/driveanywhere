# Real-route pipeline

## Purpose

The game never calls map providers from a rendering component or a player browser. Route data is fetched once by a local script, cached, validated, transformed into local metre coordinates, and then statically bundled for the game.

## Canary Wharf workflow

```powershell
cd C:\Users\Admin\Desktop\OpenRace\t1
npm run geo:fetch:canary-wharf
npm run geo:generate:canary-wharf
```

Use the cached-data-only verification command before a release:

```powershell
npm run geo:fetch:canary-wharf -- --offline
npm run geo:generate:canary-wharf
```

The raw response is stored at:

`data/routes/canary-wharf/raw/osm-area.json`

The generated runtime route is:

`public/routes/canary-wharf-loop.json`

The source manifest is mirrored at:

`data/routes/canary-wharf/processed/manifest.json`

## Architecture

- `lib/geo/providers/osm-overpass-provider.ts` is the only current Overpass adapter.
- `scripts/geo/fetch-canary-wharf-osm.ts` retrieves a deliberately small Canary Wharf bounding box, validates it with Zod, and caches it.
- `scripts/geo/generate-canary-wharf-route.ts` selects explicitly reviewed public Marsh Wall source ways, transforms WGS84 coordinates using British National Grid, builds playable geometry, validates it, and writes the route plus manifest.
- `lib/geo/coordinate-projection.ts` uses `proj4`; latitude/longitude are never treated as Cartesian metres.
- `lib/geo/route-validation.ts` checks minimum segment length, source deviation, gradient, and 2D self-intersections.

## Operational rules

- Do not use `--refresh` repeatedly against the public Overpass endpoint.
- Do not add live Overpass calls to a route page, client component, or game loop.
- Preserve the cached raw response and source IDs when updating a route.
- Update `MARSH_WALL_ROUTE_WAYS` only after reviewing continuity, access, layer, bridge, and tunnel tags.
- Production ingestion must use managed/cacheable OSM infrastructure rather than relying on a shared public Overpass endpoint.

## Current limitation

Milestone B provides genuine road geometry and nearby building footprints. Terrain, lane-specific junction meshes, detailed height resolution, and visual building extrusion are later milestones. The generated route must not be represented as a digital twin.
