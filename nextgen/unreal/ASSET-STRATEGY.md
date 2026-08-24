# DriveAnywhere — GTA-level asset strategy (Megascans + free)

## Short answer
YES — free meshes help a lot. Quixel is best for **surfaces** (asphalt, brick, stone, dirt, bark, concrete). Free packs fill **cars, landmarks, trees, street props** that Megascans alone will not give you.

## What to use for what

| Need | Best source | Why |
|------|-------------|-----|
| Asphalt, kerbs, brick, limestone, plaster, sand, rock | Quixel Megascans / Fab (free Quixel library) | Photoreal PBR + displacement |
| Trees, hedges, ivy | Quixel + free Megascans vegetation OR Poly Haven / AmbientCG | Nanite trees look GTA-close |
| Street props (signs, bins, barriers, lights) | Fab free / Quixel props | Fast trackside density |
| Famous landmarks (Big Ben, Burj, Empire…) | Kitbash3D freebies / Sketchfab CC0 / Fab marketplace | Need unique silhouette meshes — not just materials |
| 4 race cars | Free vehicle packs on Fab / Sketchfab (CC) / TurboSquid free | Remodel cosmetics on real chassis |
| Sky / HDRI | Poly Haven (CC0) | Better reflections than solid sky dome |
| Sounds / music | later | not blocking visuals |

## Free sources (start here)

1. **Fab inside Unreal** (Window → Fab) — search “Megascans”, filter Free. Download:
   - City / European brick & limestone
   - Asphalt & concrete
   - Dirt / sand (Egypt, Alps)
   - Tree packs (deciduous + palm for Rio/Dubai)
2. **Poly Haven** — https://polyhaven.com — HDRIs + textures (CC0)
3. **AmbientCG** — https://ambientcg.com — seamless PBR (CC0)
4. **Sketchfab** — filter Downloadable + CC0/CC-BY for landmark silhouettes
5. **Epic Fab free vehicle packs** — search “sports car”, “open wheel”, “SUV” free

## Import folders (already created)
- `/Game/DriveAnywhere/Megascans/` — Quixel materials & surfaces
- `/Game/DriveAnywhere/FreeAssets/` — free meshes (landmarks, props)
- `/Game/DriveAnywhere/Vehicles/Meshes/` — the 4 cars

## License rules (important)
- Quixel/Fab free Megascans: OK for games shipping on Steam if you follow Epic Fab license.
- Sketchfab: only use **CC0** or **CC-BY** (credit required). Avoid “Editorial” / “no AI” / “download only”.
- Never use ripped GTA/Rockstar assets.

## First shopping cart (do this in Fab this week)

### Surfaces (Megascans)
- Asphalt wet + dry
- Concrete sidewalk
- London brick / limestone
- Glass curtain wall
- Desert sand + stone (Egypt)
- Alpine rock + snow
- Marina glass / metal (Dubai)

### Vegetation
- Plane trees / London street trees
- Palm set (Dubai/Rio)
- Alpine conifers

### Props
- Street lamp, traffic light, bollard, Tecpro-style barrier, road sign

### Vehicles (free mesh targets)
- Sports GT coupe
- Open-wheel / formula style
- Hot hatch
- Boxy SUV

### Landmark hero meshes (unique, not cubes)
- Clock tower, gothic palace, sail hotel, art-deco skyscraper, lattice tower, statue figure, pyramid, ferris wheel — even low/mid poly heroes beat boxes once materials are Megascans.

## How we wire them in
1. You download into the folders above (or Bridge/Fab → project).
2. Tell me “Megascans imported” — I’ll write a Python swapper that replaces procedural materials with Megascans masters on roads/buildings.
3. Car chassis: replace DefaultPawn boxes with Chaos + real meshes; cosmetics stay visual-only.

## Hardware note
Your 3900X is fine; Nanite/Lumen need a DX12 GPU with decent VRAM (8GB+ ideal). Project now has Nanite + Lumen enabled — first open may recompile shaders for a while.
