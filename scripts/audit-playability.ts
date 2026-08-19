/**
 * Full playability audit — uses the same barrier builder as the game.
 * Run: npx tsx scripts/audit-playability.ts
 */
import { sampleRoad } from "../lib/game/road-mesh";
import { RoadTracker } from "../lib/game/road-tracker";
import {
  barrierMinClearance,
  buildTrackBarriers,
} from "../lib/game/track-barriers";
import { countBlockingRibbonOverlaps } from "../lib/game/track-overpasses";
import {
  getRouteData,
  getRouteDataSlugs,
} from "../lib/routes/route-registry";

const CAR_HALF = 1.0; // cuboid half-width
const RACING_MARGIN = 0.4; // keep walls outside car + kerb feel

function roadSelfOverlap(samples: ReturnType<typeof sampleRoad>) {
  return countBlockingRibbonOverlaps(samples);
}

function maxGradient(samples: ReturnType<typeof sampleRoad>) {
  let maxG = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1].position;
    const b = samples[i].position;
    const h = Math.hypot(b.x - a.x, b.z - a.z);
    if (h < 0.2) continue;
    maxG = Math.max(maxG, Math.abs(b.y - a.y) / h);
  }
  return maxG;
}

/** Drive a virtual car down the centreline; every sample must stay clear. */
function centrelineBlocked(
  samples: ReturnType<typeof sampleRoad>,
  walls: ReturnType<typeof buildTrackBarriers>,
): number {
  let blocked = 0;
  for (let i = 0; i < samples.length; i += 2) {
    const s = samples[i];
    // Probe car body footprint around the centreline.
    const probes = [
      [s.position.x, s.position.z],
      [
        s.position.x + s.normal.x * CAR_HALF,
        s.position.z + s.normal.z * CAR_HALF,
      ],
      [
        s.position.x - s.normal.x * CAR_HALF,
        s.position.z - s.normal.z * CAR_HALF,
      ],
    ] as const;
    for (const [px, pz] of probes) {
      for (const wall of walls) {
        const yaw = wall.rot[1];
        const tx = Math.sin(yaw);
        const tz = Math.cos(yaw);
        // Point-to-segment distance against the barrier module.
        const ax = wall.pos[0] - tx * wall.hl;
        const az = wall.pos[2] - tz * wall.hl;
        const bx = wall.pos[0] + tx * wall.hl;
        const bz = wall.pos[2] + tz * wall.hl;
        const abx = bx - ax;
        const abz = bz - az;
        const lenSq = abx * abx + abz * abz || 1;
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq),
        );
        const dist = Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
        // Barrier collider is ~0.28 m half-width.
        if (dist < 0.35 + 0.15) {
          blocked += 1;
          break;
        }
      }
    }
  }
  return blocked;
}

let failed = 0;
for (const slug of getRouteDataSlugs()) {
  const route = getRouteData(slug);
  if (!route) continue;
  const samples = sampleRoad(route.roadPoints, 10);
  const tracker = new RoadTracker(samples);
  const walls = buildTrackBarriers(samples);
  const overlaps = roadSelfOverlap(samples);
  const grad = maxGradient(samples);
  const ys = samples.map((s) => s.position.y);
  const minY = Math.min(...ys);

  let barriersOnLine = 0;
  let minBarrierClear = Infinity;
  for (const wall of walls) {
    const clear = barrierMinClearance(samples, wall);
    minBarrierClear = Math.min(minBarrierClear, clear);
    if (clear < 0.35) barriersOnLine += 1;
  }

  const blocked = centrelineBlocked(samples, walls);

  // Checkpoints in order and on-road.
  let cpOk = true;
  let lastIdx = -1;
  for (const cp of [...route.checkpoints].sort((a, b) => a.index - b.index)) {
    const hit = tracker.nearest(cp.position.x, cp.position.z);
    if (hit.distance > route.roadWidth / 2 + 2) cpOk = false;
    if (hit.index < lastIdx) cpOk = false;
    lastIdx = hit.index;
  }

  // Buildings clear of asphalt.
  let buildingHits = 0;
  for (const building of route.buildings) {
    for (const corner of building.footprint) {
      const hit = tracker.nearest(corner.x, corner.z);
      if (hit.distance < route.roadWidth / 2 - 0.5) buildingHits += 1;
    }
  }

  const spawn = tracker.spawn();
  const spawnHit = tracker.nearest(spawn.position.x, spawn.position.z);

  const problems: string[] = [];
  if (minY < 0) problems.push(`minY=${minY}`);
  if (overlaps) problems.push(`ribbonOverlaps=${overlaps}`);
  if (grad > 0.22) problems.push(`grad=${(grad * 100).toFixed(1)}%`);
  if (barriersOnLine) problems.push(`barriersOnLine=${barriersOnLine}`);
  if (blocked) problems.push(`centrelineBlocked=${blocked}`);
  if (!cpOk) problems.push("checkpoints");
  if (buildingHits) problems.push(`buildingsOnRoad=${buildingHits}`);
  if (spawnHit.distance > route.roadWidth / 2) problems.push("spawnOffRoad");
  if (walls.length < 20) problems.push(`tooFewBarriers=${walls.length}`);

  const ok = problems.length === 0;
  if (!ok) failed += 1;

  console.log(
    `${ok ? "OK" : "FAIL"} ${slug}: ${route.distanceMetres}m w=${route.roadWidth} ` +
      `elev=${minY.toFixed(0)}..${Math.max(...ys).toFixed(0)} ` +
      `walls=${walls.length} minWallClear=${minBarrierClear.toFixed(1)}m ` +
      `buildings=${route.buildings.length} cps=${route.checkpoints.length}`,
  );
  if (problems.length) console.log("  problems:", problems.join(", "));
}

if (failed > 0) {
  console.error(`\n${failed} route(s) NOT completable without obstruction`);
  process.exit(1);
}
console.log("\nAll routes playable and completable without obstruction");
