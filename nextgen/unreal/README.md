# DriveAnywhere — Unreal Engine 5 next gen

The live web arcade stays on `main`. This folder is a real UE5 project plus the nine circuit exports. Photoreal cities come from **Cesium / Google Photorealistic 3D Tiles** after a clean lap on the imported ribbon.

## What is already done in this repo

- `.uproject` at `DriveAnywhere/DriveAnywhere.uproject` (Chaos Vehicles + Python enabled)
- All **9 circuits** as centimetre splines, checkpoints, named landmarks, WGS84 origins (`export/`)
- **Four class Chaos tunes** in `export/chaos-vehicles.json` (Sports GT, Open-Wheel, Corsa, G-Wagon)
- Cosmetics list that must stay **visual-only** (`export/cosmetics-visual-only.json`)
- Editor Python: `import da_import; da_import.import_all()` then `import da_vehicles; da_vehicles.import_classes()`
- `Open-DriveAnywhere.bat` — opens the project if Unreal is installed, otherwise opens Epic to install **5.5+**

This machine had Epic leftover folders (`5.5` / `5.6` / `5.7` under AppData) but **no `UnrealEditor.exe`**. The editor cannot compile maps here until you install the engine (tens of GB, Epic account).

## You do once (install)

1. Epic Games Launcher → Unreal Engine **5.5 or newer**
2. Optional: create nothing — double-click `DriveAnywhere.uproject` (or run `Open-DriveAnywhere.bat`)
3. Marketplace: **Cesium for Unreal**. Enable it on the project, then set `CesiumForUnreal` to enabled in the `.uproject` (or Plugins window)
4. Cesium ion token + Google Photorealistic 3D Tiles (or OSM buildings)
5. From the web repo root: `npm run export:unreal` whenever tracks change

## Import all nine maps (in editor)

Output Log → Python:

```python
import da_import, da_vehicles
da_import.import_all()          # Westminster first, then the other eight
da_vehicles.import_classes()    # four Chaos class JSON + blueprint stubs
```

Or one circuit:

```python
da_import.import_circuit('westminster-sprint')
```

Play from `MAP_WestminsterSprint`. Chaos traces must hit the **road ribbon only**. Keep 3D tiles **query-only / no collision** on the racing line until you have a clean lap.

## Classes (do not break fairness)

| Class | Role |
| --- | --- |
| Sports GT | Baseline street pace |
| Open-Wheel | Fastest, highest grip |
| Corsa | Slowest hatch |
| G-Wagon | Heavy, stable, less top end |

Same class is equal. Paints, bumpers, wings, kits **never** change Chaos torque, mass, friction, or steer. Host still picks map, vehicle, AI for online.

## Unique heroes (swap locators for real meshes)

Importer spawns **Notes**, not grey boxes on asphalt. Replace `Hero_*` actors with unique meshes (Elizabeth Tower, Burj Khalifa, Tokyo Tower / Skytree, Empire State, Christ the Redeemer, Giza pyramids, Matterhorn, One Canada Square).

## Multiplayer

Keep `lib/multiplayer/protocol.ts` as the contract. UE talks to the existing Node WebSocket server, or EOS later. Amplify still ships the **web** client until a UE build is driveable.

## Do not

- Re-author tracks from scratch — the splines are the product memory
- Put photogrammetry `BlockAll` on the ribbon before collision is cleaned
- Delete the Next.js app until a UE lap works end-to-end
