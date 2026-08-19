/**
 * Push building footprints away from the drivable ribbon when corners clip the road.
 * Run: npx tsx scripts/fix-building-clearance.ts [slug...]
 */
import fs from "node:fs";
import path from "node:path";
import { sampleRoad } from "../lib/game/road-mesh";
import { RoadTracker } from "../lib/game/road-tracker";
import type { RouteData } from "../lib/validation/route-data";
import { getRouteData, getRouteDataSlugs } from "../lib/routes/route-registry";

function nearestClearance(
  tracker: RoadTracker,
  x: number,
  z: number,
  roadHalf: number,
): number {
  return tracker.nearest(x, z).distance - roadHalf;
}

function pushBuilding(
  building: RouteData["buildings"][number],
  tracker: RoadTracker,
  samples: ReturnType<typeof sampleRoad>,
  roadHalf: number,
  minClear: number,
): boolean {
  let moved = false;
  const minDist = roadHalf + minClear;
  for (const corner of building.footprint) {
    const hit = tracker.nearest(corner.x, corner.z, 999);
    if (hit.distance >= minDist) continue;
    const sample = samples[hit.index];
    let dx = corner.x - sample.position.x;
    let dz = corner.z - sample.position.z;
    if (Math.hypot(dx, dz) < 0.05) {
      dx = sample.normal.x;
      dz = sample.normal.z;
    }
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const push = minDist - hit.distance + 0.8;
    corner.x += dx * push;
    corner.z += dz * push;
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
  const tracker = new RoadTracker(samples);
  const roadHalf = raw.roadWidth / 2;
  let fixes = 0;

  for (const building of raw.buildings) {
    if (pushBuilding(building, tracker, samples, roadHalf, 1.5)) fixes += 1;
  }

  if (fixes > 0) {
    fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(`${slug}: moved ${fixes} building(s)`);
  } else {
    console.log(`${slug}: ok`);
  }
}
