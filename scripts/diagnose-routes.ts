import { sampleRoad } from "../lib/game/road-mesh";
import { buildTurnSigns } from "../lib/game/track-signs";
import {
  buildRouteIntroPath,
  maxIntroStep,
} from "../lib/game/route-intro";
import { getRouteBounds } from "../lib/game/road-mesh";
import { getRouteData, getRouteDataSlugs } from "../lib/routes/route-registry";
import { RoadTracker } from "../lib/game/road-tracker";

for (const slug of getRouteDataSlugs()) {
  const route = getRouteData(slug)!;
  const samples = sampleRoad(route.roadPoints, 10);
  const signs = buildTurnSigns(samples);
  const path = buildRouteIntroPath(route, samples, {
    position: samples[0].position,
    yaw: 0,
  });
  const bounds = getRouteBounds(route);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 120);
  const introStep = maxIntroStep(path, 64);
  const introLimit = span * 0.14;
  const tracker = new RoadTracker(samples);
  let badBuildings = 0;
  for (const b of route.buildings) {
    for (const c of b.footprint) {
      const hit = tracker.nearest(c.x, c.z);
      if (hit.distance <= route.roadWidth / 2 - 0.5) badBuildings++;
    }
  }
  let maxB = 0;
  for (let i = 1; i < samples.length - 1; i++) {
    const prev = samples[i - 1].position;
    const cur = samples[i].position;
    const next = samples[i + 1].position;
    const ax = cur.x - prev.x;
    const az = cur.z - prev.z;
    const bx = next.x - cur.x;
    const bz = next.z - cur.z;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    const dot = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)));
    maxB = Math.max(maxB, Math.acos(dot));
  }

  console.log(
    `${slug}: signs=${signs.length} maxB=${maxB.toFixed(3)} intro=${introStep.toFixed(1)}/${introLimit.toFixed(1)} ` +
      `badBld=${badBuildings} dist=${route.distanceMetres} w=${route.roadWidth}`,
  );
}
