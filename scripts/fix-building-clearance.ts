/**
 * Push whole buildings off the racing ribbon until their AABB colliders
 * no longer intersect asphalt. Fixes "solid building on the track".
 *
 * Run: npx tsx scripts/fix-building-clearance.ts [slug...]
 */
import fs from "node:fs";
import path from "node:path";
import { sampleRoad } from "../lib/game/road-mesh";
import { aabbAsphaltClearance } from "../lib/game/building-road-clearance";
import type { RouteData } from "../lib/validation/route-data";
import { getRouteData, getRouteDataSlugs } from "../lib/routes/route-registry";

function footprintBox(footprint: { x: number; z: number }[]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of footprint) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return {
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    hw: Math.max(0.9, (maxX - minX) / 2),
    hd: Math.max(0.9, (maxZ - minZ) / 2),
  };
}

function nearestSample(
  samples: ReturnType<typeof sampleRoad>,
  x: number,
  z: number,
) {
  let best = samples[0];
  let bestD = Infinity;
  for (const s of samples) {
    const d = Math.hypot(s.position.x - x, s.position.z - z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function pushBuildingOffRoad(
  building: RouteData["buildings"][number],
  samples: ReturnType<typeof sampleRoad>,
  minClear: number,
): boolean {
  let moved = false;
  for (let iter = 0; iter < 40; iter += 1) {
    const box = footprintBox(building.footprint);
    const clear = aabbAsphaltClearance(
      samples,
      box.cx,
      box.cz,
      box.hw,
      box.hd,
    );
    if (clear >= minClear) break;

    const nearest = nearestSample(samples, box.cx, box.cz);
    let dx = box.cx - nearest.position.x;
    let dz = box.cz - nearest.position.z;
    if (Math.hypot(dx, dz) < 0.05) {
      dx = nearest.normal.x;
      dz = nearest.normal.z;
    }
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    // Push enough to clear this iteration; clamp so we don't teleport miles.
    const push = Math.min(28, Math.max(2.5, minClear - clear + 2.5));
    for (const corner of building.footprint) {
      corner.x += dx * push;
      corner.z += dz * push;
    }
    moved = true;
  }
  return moved;
}

const slugs = process.argv.slice(2);
const targets = slugs.length > 0 ? slugs : getRouteDataSlugs();

for (const slug of targets) {
  const route = getRouteData(slug);
  if (!route) continue;
  const file = path.join(process.cwd(), "public", "routes", `${slug}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RouteData;
  const samples = sampleRoad(raw.roadPoints, 10);
  let fixes = 0;

  for (const building of raw.buildings) {
    if (pushBuildingOffRoad(building, samples, 2.5)) fixes += 1;
  }

  if (fixes > 0) {
    fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(`${slug}: moved ${fixes} building(s) clear of asphalt AABB`);
  } else {
    console.log(`${slug}: ok`);
  }
}
