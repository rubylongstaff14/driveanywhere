# Route format

DriveAnywhere.ai routes are JSON files stored in `public/routes/{slug}.json`.

## Required fields

- `id`, `slug`, `name`, `description`
- `city`, `country`, `latitude`, `longitude`
- `distanceMetres`, `estimatedDurationSeconds`, `difficulty`, `tags`
- `thumbnail`, `startPosition`, `startRotation`, `roadWidth`
- `checkpoints` (ordered), `roadPoints`
- `buildings`, `sceneryObjects`, `spawnPoints`
- `metadata`, `dataAttribution`

## Road points

Each point includes `x`, `y`, `z`, `width`, `banking`, optional `speedRecommendation`, and `surfaceType`.

The road mesh is generated with Catmull-Rom sampling between points.

## Checkpoints

Players must pass required checkpoints in ascending `index` order. Skipping ahead marks the run invalid.

## Buildings

Procedural placeholders with footprint, height, floors, style, facade, roof, confidence, and source. Styles include:

- `london_terrace`
- `modern_office`
- `apartment_block`
- `retail_ground_floor`
- `warehouse`
- `landmark_placeholder`

## Validation

All route files are validated with Zod (`lib/validation/route-data.ts`). Invalid files show developer-friendly errors in the play screen and do not crash the whole app.

## Seed command

```powershell
cd C:\Users\Admin\Desktop\OpenRace\t1
npm run seed:routes
```
