/**
 * Find buildings whose AABB collider would intersect the asphalt ribbon.
 * Run: npx tsx scripts/find-on-track-buildings.ts
 */
import { sampleRoad } from "../lib/game/road-mesh";
import { RoadTracker } from "../lib/game/road-tracker";
import { getRouteData, getRouteDataSlugs } from "../lib/routes/route-registry";

function footprintAABB(footprint: { x: number; z: number }[]) {
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
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  return {
    cx,
    cz,
    hw: Math.max(0.9, (maxX - minX) / 2),
    hd: Math.max(0.9, (maxZ - minZ) / 2),
  };
}

/** Approximate min distance from AABB to road centreline. */
function aabbRoadClearance(
  tracker: RoadTracker,
  box: { cx: number; cz: number; hw: number; hd: number },
  roadHalf: number,
) {
  // Probe centre + 4 corners of the AABB.
  const probes = [
    [box.cx, box.cz],
    [box.cx - box.hw, box.cz - box.hd],
    [box.cx - box.hw, box.cz + box.hd],
    [box.cx + box.hw, box.cz - box.hd],
    [box.cx + box.hw, box.cz + box.hd],
    [box.cx, box.cz - box.hd],
    [box.cx, box.cz + box.hd],
    [box.cx - box.hw, box.cz],
    [box.cx + box.hw, box.cz],
  ] as const;
  let minEdge = Infinity;
  for (const [x, z] of probes) {
    const hit = tracker.nearest(x, z, 999);
    minEdge = Math.min(minEdge, hit.distance - roadHalf);
  }
  return minEdge;
}

for (const slug of getRouteDataSlugs()) {
  const route = getRouteData(slug);
  if (!route) continue;
  const samples = sampleRoad(route.roadPoints, 10);
  const tracker = new RoadTracker(samples);
  const roadHalf = route.roadWidth / 2;
  const hits: string[] = [];

  for (const b of route.buildings) {
    const box = footprintAABB(b.footprint);
    const clear = aabbRoadClearance(tracker, box, roadHalf);
    if (clear < 0.5) {
      hits.push(
        `${b.name || b.id}: aabbClear=${clear.toFixed(2)}m ` +
          `size=${(box.hw * 2).toFixed(0)}x${(box.hd * 2).toFixed(0)} ` +
          `at (${box.cx.toFixed(0)},${box.cz.toFixed(0)})`,
      );
    }
  }

  if (hits.length) {
    console.log(`\n${slug} (${hits.length} AABB-on-road):`);
    for (const h of hits.slice(0, 20)) console.log("  " + h);
    if (hits.length > 20) console.log(`  ... +${hits.length - 20} more`);
  } else {
    console.log(`${slug}: ok`);
  }
}
