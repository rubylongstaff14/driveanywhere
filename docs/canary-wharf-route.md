# Canary Wharf · Marsh Wall Run

## Status

Milestone B source-data vertical slice. This route is a simplified closed-road racing conversion, not a survey-grade digital twin.

## Source route

The route follows a connected, approximately 800m section of **Marsh Wall** in Canary Wharf, London, represented by these OpenStreetMap ways:

- 142296529
- 1390577486
- 142296526
- 1390577488
- 372805561
- 618388846
- 372805562

The generator excludes roads marked `access=private` or `access=no`, bridges, tunnels, and non-zero layers for this first slice. This specifically avoids using Bank Street even though it is visually attractive, because the cached OSM data identifies private operation/ownership there.

## Gameplay adaptations

- A consistent 10m playable road width is used while lane geometry is developed.
- Traffic is removed and temporary race barriers are implied.
- Checkpoints are placed along the genuine OSM centreline.

These adjustments are recorded in `realWorld.playableGeometry.gameplayAdjustments` inside the generated route file.

## Debugging

In development, open the route and press `F3`.

- Pink: original OSM road geometry
- Mint: playable route centreline
- Yellow: original nearby OSM building footprint outlines

## Data refresh

Run:

```powershell
npm run geo:fetch:canary-wharf -- --refresh
npm run geo:generate:canary-wharf
```

Refreshing changes source data. Review the raw diff, source-way continuity, route validation, and licence metadata before accepting regenerated output.
