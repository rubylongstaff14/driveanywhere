/**
 * Generates procedural route JSON files (London prototypes + Egypt).
 *
 * Building and scenery positions are derived from the road centreline so they
 * stay clear of the drivable surface. Named landmark towers are injected at
 * fixed offsets so crowns / labels can identify them.
 *
 * Run: npm run seed:routes
 *
 * Note: this overwrites canary-wharf-loop.json with a longer procedural
 * docklands circuit (OSM Marsh Wall slice is superseded for playability).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateRouteData } from "../lib/routes/load-route-data";
import type { RouteData } from "../lib/validation/route-data";

interface ControlPoint {
  x: number;
  z: number;
  /** Metres above local origin. Omit for flat (0). */
  y?: number;
}

function lerp2(a: ControlPoint, b: ControlPoint, t: number): ControlPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    y: (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t,
  };
}

function catmullRom2(
  p0: ControlPoint,
  p1: ControlPoint,
  p2: ControlPoint,
  p3: ControlPoint,
  t: number,
): ControlPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const y0 = p0.y ?? 0;
  const y1 = p1.y ?? 0;
  const y2 = p2.y ?? 0;
  const y3 = p3.y ?? 0;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      Math.max(
        0,
        0.5 *
          (2 * y1 +
            (-y0 + y2) * t +
            (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
            (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
      ),
    z:
      0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

interface Sample {
  x: number;
  y: number;
  z: number;
  yaw: number;
  nx: number;
  nz: number;
  s: number;
}

function sampleCentreline(control: ControlPoint[], perSpan = 14): Sample[] {
  const raw: ControlPoint[] = [];
  for (let i = 0; i < control.length - 1; i += 1) {
    const p0 = control[Math.max(0, i - 1)];
    const p1 = control[i];
    const p2 = control[i + 1];
    const p3 = control[Math.min(control.length - 1, i + 2)];
    for (let s = 0; s < perSpan; s += 1) {
      raw.push(catmullRom2(p0, p1, p2, p3, s / perSpan));
    }
  }
  raw.push(control[control.length - 1]);

  const out: Sample[] = [];
  let s = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const cur = raw[i];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    const prev = raw[Math.max(0, i - 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    if (i > 0) {
      s += Math.hypot(
        cur.x - raw[i - 1].x,
        (cur.y ?? 0) - (raw[i - 1].y ?? 0),
        cur.z - raw[i - 1].z,
      );
    }
    out.push({
      x: cur.x,
      y: Math.max(0, cur.y ?? 0),
      z: cur.z,
      yaw: Math.atan2(dx / len, dz / len),
      nx: -dz / len,
      nz: dx / len,
      s,
    });
  }
  return out;
}

function atFraction(samples: Sample[], f: number): Sample {
  const total = samples[samples.length - 1].s;
  const target = total * Math.max(0, Math.min(1, f));
  let best = samples[0];
  for (const sa of samples) {
    if (sa.s <= target) best = sa;
    else break;
  }
  return best;
}

/** Close a polyline by repeating the first point (including elevation). */
function closeLoop(points: ControlPoint[]): ControlPoint[] {
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.hypot(first.x - last.x, first.z - last.z) < 0.5) return points;
  return [...points, { x: first.x, y: first.y ?? 0, z: first.z }];
}

type Style = RouteData["buildings"][number]["style"];
type Material = "brick" | "glass" | "concrete" | "sandstone";

interface NamedTower {
  name: string;
  /** Absolute local coords — optional if `at` is set. */
  x?: number;
  z?: number;
  /** Progress along the lap (0–1). Preferred — sits on the local elevation. */
  at?: number;
  side?: 1 | -1;
  /** Metres from centreline to building centre. */
  offset?: number;
  width: number;
  depth: number;
  height: number;
  style: Style;
  facadeMaterial: Material;
  roofType?: RouteData["buildings"][number]["roofType"];
}

interface Blueprint {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  difficulty: RouteData["difficulty"];
  tags: string[];
  roadWidth: number;
  checkpointCount: number;
  control: ControlPoint[];
  buildingStyles: Style[];
  facadeMaterials: Material[];
  buildingSpacing: number;
  buildingHeight: [number, number];
  treeEvery?: number;
  namedTowers?: NamedTower[];
  attribution?: string;
  notes?: string;
}

function resolveTowerPose(
  tower: NamedTower,
  samples: Sample[],
): { x: number; z: number; y: number } | null {
  if (tower.at != null) {
    const sa = atFraction(samples, tower.at);
    const side = tower.side ?? 1;
    const offset = tower.offset ?? 42;
    return {
      x: sa.x + sa.nx * offset * side,
      z: sa.z + sa.nz * offset * side,
      y: sa.y,
    };
  }
  if (tower.x == null || tower.z == null) return null;
  let best = samples[0];
  let bestD = Infinity;
  for (const sa of samples) {
    const d = Math.hypot(sa.x - tower.x, sa.z - tower.z);
    if (d < bestD) {
      bestD = d;
      best = sa;
    }
  }
  return { x: tower.x, z: tower.z, y: best.y };
}

function pushNamedTower(
  buildings: RouteData["buildings"],
  tower: NamedTower,
  slug: string,
  index: number,
  pose: { x: number; z: number; y: number },
): void {
  const hw = tower.width / 2;
  const hd = tower.depth / 2;
  buildings.push({
    id: `${slug}-landmark-${index}`,
    name: tower.name,
    footprint: [
      { x: +(pose.x - hw).toFixed(2), y: 0, z: +(pose.z - hd).toFixed(2) },
      { x: +(pose.x + hw).toFixed(2), y: 0, z: +(pose.z - hd).toFixed(2) },
      { x: +(pose.x + hw).toFixed(2), y: 0, z: +(pose.z + hd).toFixed(2) },
      { x: +(pose.x - hw).toFixed(2), y: 0, z: +(pose.z + hd).toFixed(2) },
    ],
    height: +tower.height.toFixed(2),
    baseHeight: 0,
    floors: Math.max(1, Math.round(tower.height / 3.5)),
    style: tower.style,
    facadeMaterial: tower.facadeMaterial,
    roofType: tower.roofType ?? "flat",
    confidence: 0.95,
    source: "procedural-landmark",
  });
}

function buildRoute(bp: Blueprint): RouteData {
  // Start is always ground level (y = 0). Hills only rise from the
  // start/finish — never leave the player in a pit below the city floor.
  const startY = bp.control[0]?.y ?? 0;
  const control = bp.control.map((p) => ({
    ...p,
    y: Math.max(0, (p.y ?? 0) - startY),
  }));
  const samples = sampleCentreline(control).map((sa) => ({
    ...sa,
    y: Math.max(0, sa.y),
  }));
  // Force the very first sample onto the ground plane.
  if (samples.length > 0) samples[0] = { ...samples[0], y: 0 };
  const totalLen = samples[samples.length - 1].s;

  const roadPoints = control.map((p, i) => {
    // Slow advice into sharp sectors (heuristic from local curvature).
    const prev = control[Math.max(0, i - 1)];
    const next = control[Math.min(control.length - 1, i + 1)];
    const ax = p.x - prev.x;
    const az = p.z - prev.z;
    const bx = next.x - p.x;
    const bz = next.z - p.z;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    const dot = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)));
    const bend = Math.acos(dot);
    const speed = bend > 0.55 ? 14 : bend > 0.35 ? 18 : 24;
    return {
      x: +p.x.toFixed(2),
      y: +(i === 0 ? 0 : Math.max(0, p.y ?? 0)).toFixed(2),
      z: +p.z.toFixed(2),
      width: bp.roadWidth,
      banking: 0,
      speedRecommendation: speed,
      surfaceType: "asphalt" as const,
    };
  });

  const checkpoints = Array.from({ length: bp.checkpointCount }, (_, i) => {
    const f = 0.03 + (i / (bp.checkpointCount - 1)) * 0.93;
    const sa = atFraction(samples, f);
    return {
      id: `${bp.slug}-cp-${i}`,
      index: i,
      position: {
        x: +sa.x.toFixed(2),
        y: +Math.max(0, sa.y).toFixed(2),
        z: +sa.z.toFixed(2),
      },
      rotation: +sa.yaw.toFixed(4),
      width: bp.roadWidth,
      required: true,
    };
  });

  // Face sits well beyond kerb + pavement; footprints are road-aligned.
  // Each candidate is clearance-checked so sharp apexes never clip the road.
  const faceFromCentre = bp.roadWidth / 2 + 22;
  const minCornerClearance = bp.roadWidth / 2 + 3.5;
  const buildings: RouteData["buildings"] = [];
  let bi = 0;
  // Landmark sightlines: keep viewing sides clear so icons aren't buried
  // behind a canyon of filler boxes (Westminster harbour / Giza pyramids).
  const maxX = Math.max(...samples.map((s) => s.x));
  const maxZ = Math.max(...samples.map((s) => s.z));
  const harbourClearX = bp.slug === "westminster-sprint" ? maxX - 55 : Infinity;
  // Open desert east of the circuit — pyramids need an unobstructed Kemmel view.
  const pyramidClearX = bp.slug === "egypt-pyramids" ? maxX - 70 : Infinity;
  // Dubai east viewing straight — keep Burj / Frame / Museum unobstructed.
  const dubaiClearX = bp.slug === "dubai-marina-circuit" ? maxX - 55 : Infinity;
  // NYC harbor blast — keep Statue / Bridge vista open.
  const nycClearX = bp.slug === "new-york-harbor-circuit" ? maxX - 50 : Infinity;
  for (let s = 20; s < totalLen - 20; s += bp.buildingSpacing) {
    const sa = atFraction(samples, s / totalLen);
    for (const side of [1, -1] as const) {
      // Skip river-side (high-x) filler along the harbour viewing straight.
      if (
        bp.slug === "westminster-sprint" &&
        sa.x > harbourClearX &&
        sa.nx * side > 0.15
      ) {
        continue;
      }
      // Skip anything facing or sitting on the Giza plateau (east / Kemmel crest).
      if (
        bp.slug === "egypt-pyramids" &&
        ((sa.x > pyramidClearX && sa.nx * side > 0.1) ||
          (sa.z > maxZ - 160 && sa.nx * side > 0.2))
      ) {
        continue;
      }
      if (
        bp.slug === "dubai-marina-circuit" &&
        sa.x > dubaiClearX &&
        sa.nx * side > 0.12
      ) {
        continue;
      }
      if (
        bp.slug === "new-york-harbor-circuit" &&
        sa.x > nycClearX &&
        sa.nx * side > 0.12
      ) {
        continue;
      }
      const w = 7 + (bi % 4) * 2.2;
      const d = 8 + (bi % 3) * 2.5;
      let placed = false;
      for (const extra of [0, 6, 12, 20, 30]) {
        const buildingCenter = faceFromCentre + w / 2 + (bi % 4) * 2.2 + extra;
        const cx = sa.x + sa.nx * buildingCenter * side;
        const cz = sa.z + sa.nz * buildingCenter * side;
        const h = lerp2(
          { x: bp.buildingHeight[0], z: 0 },
          { x: bp.buildingHeight[1], z: 0 },
          (bi * 0.17) % 1,
        ).x;
        const style = bp.buildingStyles[bi % bp.buildingStyles.length];
        const mat = bp.facadeMaterials[bi % bp.facadeMaterials.length];
        const hw = w / 2;
        const hd = d / 2;
        const tx = Math.sin(sa.yaw);
        const tz = Math.cos(sa.yaw);
        const nx = sa.nx;
        const nz = sa.nz;
        const corners = [
          { x: cx - tx * hw - nx * hd, z: cz - tz * hw - nz * hd },
          { x: cx + tx * hw - nx * hd, z: cz + tz * hw - nz * hd },
          { x: cx + tx * hw + nx * hd, z: cz + tz * hw + nz * hd },
          { x: cx - tx * hw + nx * hd, z: cz - tz * hw + nz * hd },
        ];
        let clear = true;
        for (const corner of corners) {
          let best = Infinity;
          for (const sample of samples) {
            best = Math.min(
              best,
              Math.hypot(sample.x - corner.x, sample.z - corner.z),
            );
          }
          if (best < minCornerClearance) {
            clear = false;
            break;
          }
        }
        if (!clear) continue;
        // Final east-plateau gate — never plant filler in front of the pyramids.
        if (bp.slug === "egypt-pyramids" && cx > pyramidClearX) continue;
        if (bp.slug === "dubai-marina-circuit" && cx > dubaiClearX) continue;
        if (bp.slug === "new-york-harbor-circuit" && cx > nycClearX) continue;
        buildings.push({
          id: `${bp.slug}-b${bi}`,
          footprint: corners.map((c) => ({
            x: +c.x.toFixed(2),
            y: 0,
            z: +c.z.toFixed(2),
          })),
          height: +h.toFixed(1),
          baseHeight: 0,
          floors: Math.max(1, Math.round(h / 3.2)),
          style,
          facadeMaterial: mat,
          roofType:
            style === "london_terrace"
              ? "pitched"
              : mat === "sandstone" && bp.slug !== "egypt-pyramids"
                ? "pyramidal"
                : "flat",
          confidence: 0.7,
          source: "procedural",
        });
        placed = true;
        bi += 1;
        break;
      }
      if (!placed) continue;
    }
  }

  (bp.namedTowers ?? []).forEach((tower, index) => {
    const candidates: NamedTower[] =
      tower.at != null
        ? [
            tower,
            { ...tower, offset: (tower.offset ?? 42) + 18 },
            { ...tower, side: ((tower.side ?? 1) * -1) as 1 | -1, offset: (tower.offset ?? 42) + 12 },
            { ...tower, offset: (tower.offset ?? 42) + 32 },
          ]
        : [tower];

    for (const candidate of candidates) {
      const pose = resolveTowerPose(candidate, samples);
      if (!pose) continue;
      // Never allow track-anchored named props to sit in landmark vista corridors.
      // Absolute heroes (Burj, Statue, etc.) are intentionally east of clearX.
      if (bp.slug === "egypt-pyramids" && candidate.at != null && pose.x > pyramidClearX) continue;
      if (bp.slug === "dubai-marina-circuit" && candidate.at != null && pose.x > dubaiClearX) continue;
      if (bp.slug === "new-york-harbor-circuit" && candidate.at != null && pose.x > nycClearX) continue;
      let nearestDist = Infinity;
      for (const sa of samples) {
        nearestDist = Math.min(
          nearestDist,
          Math.hypot(sa.x - pose.x, sa.z - pose.z),
        );
      }
      const edgeClearance =
        nearestDist - Math.max(candidate.width, candidate.depth) / 2;
      if (edgeClearance < bp.roadWidth / 2 + 5) continue;
      pushNamedTower(buildings, candidate, bp.slug, index, pose);
      break;
    }
  });

  const scenery: RouteData["sceneryObjects"] = [];
  let si = 0;
  const treeEvery = bp.treeEvery ?? 2;
  for (let s = 8; s < totalLen - 8; s += 18) {
    const sa = atFraction(samples, s / totalLen);
    const side = si % 2 === 0 ? 1 : -1;
    const lightOff = bp.roadWidth / 2 + 1.6;
    const treeOff = bp.roadWidth / 2 + 5.5;
    scenery.push({
      id: `${bp.slug}-light-${si}`,
      type: "street_light",
      position: {
        x: +(sa.x + sa.nx * lightOff * side).toFixed(2),
        y: 0,
        z: +(sa.z + sa.nz * lightOff * side).toFixed(2),
      },
      rotation: +sa.yaw.toFixed(4),
      scale: 1,
    });
    if (treeEvery > 0 && si % treeEvery === 1) {
      scenery.push({
        id: `${bp.slug}-tree-${si}`,
        type: "tree",
        position: {
          x: +(sa.x - sa.nx * treeOff * side).toFixed(2),
          y: 0,
          z: +(sa.z - sa.nz * treeOff * side).toFixed(2),
        },
        rotation: 0,
        scale: 0.9 + (si % 5) * 0.1,
      });
    }
    si += 1;
  }

  const start = samples[0];
  return {
    id: bp.id,
    slug: bp.slug,
    name: bp.name,
    description: bp.description,
    city: bp.city,
    country: bp.country,
    latitude: bp.latitude,
    longitude: bp.longitude,
    distanceMetres: Math.round(totalLen),
    estimatedDurationSeconds: Math.round(totalLen / 14),
    difficulty: bp.difficulty,
    tags: bp.tags,
    thumbnail: `/images/routes/${bp.slug}.svg`,
    startPosition: {
      x: +start.x.toFixed(2),
      y: 0,
      z: +start.z.toFixed(2),
    },
    startRotation: +start.yaw.toFixed(4),
    roadWidth: bp.roadWidth,
    checkpoints,
    roadPoints,
    buildings,
    sceneryObjects: scenery,
    spawnPoints: [
      {
        x: +start.x.toFixed(2),
        y: 0,
        z: +start.z.toFixed(2),
      },
    ],
    metadata: {
      version: 8,
      generatedBy: "seed-local-data",
      notes:
        bp.notes ??
        "Procedural stylised circuit — not a digital twin of any real location",
    },
    dataAttribution: bp.attribution ?? "© OpenStreetMap contributors",
  };
}

// ---------------------------------------------------------------------------
// Control paths — F1-character circuits (Monaco / Monza / Silverstone / Spa
// rhythms). Each still keeps a planned landmark-viewing sector.
// ---------------------------------------------------------------------------

/**
 * Westminster ≈ Monaco street rhythm.
 * Hairpin, short bursts, riverside viewing "harbour" straight past Big Ben,
 * then a tight chicane and technical return by the Abbey.
 * Street-level elevation only (gentle camber, not a flying overpass).
 */
const westminsterControl: ControlPoint[] = closeLoop([
  // Start/finish short straight
  { x: -20, z: -260, y: 0 },
  { x: 50, z: -270, y: 0 },
  // Ste. Devote–style right
  { x: 110, z: -250, y: 0.4 },
  { x: 150, z: -195, y: 0.8 },
  { x: 165, z: -130, y: 1.2 },
  // Casino-square kink
  { x: 130, z: -75, y: 1.5 },
  { x: 155, z: -25, y: 1.2 },
  // Loews hairpin — opened so opposite walls never seal the bowl
  { x: 195, z: 35, y: 0.8 },
  { x: 155, z: 115, y: 0.5 },
  { x: 70, z: 105, y: 0.3 },
  { x: 30, z: 35, y: 0.2 },
  // Exit hairpin north-east
  { x: 5, z: 90, y: 0.2 },
  { x: 40, z: 160, y: 0 },
  { x: 130, z: 185, y: 0 },
  { x: 215, z: 170, y: 0 },
  // Nouvelle Chicane into harbour
  { x: 280, z: 205, y: 0 },
  { x: 235, z: 250, y: 0 },
  { x: 280, z: 295, y: 0 },
  // Harbour / Tabac riverside (Big Ben / Parliament viewing straight)
  { x: 255, z: 355, y: 0 },
  { x: 185, z: 390, y: 0 },
  // Swimming Pool complex
  { x: 100, z: 400, y: 0.2 },
  { x: 25, z: 375, y: 0.4 },
  { x: -10, z: 420, y: 0.5 },
  { x: -70, z: 390, y: 0.6 },
  // Rascasse hairpin inland — wide
  { x: -135, z: 335, y: 0.8 },
  { x: -180, z: 250, y: 1.0 },
  { x: -125, z: 180, y: 0.8 },
  // Abbey esses back to start
  { x: -165, z: 120, y: 0.5 },
  { x: -125, z: 55, y: 0.3 },
  { x: -170, z: -5, y: 0.2 },
  { x: -135, z: -75, y: 0.1 },
  { x: -155, z: -145, y: 0 },
  { x: -105, z: -205, y: 0 },
  { x: -60, z: -240, y: 0 },
]);

/**
 * Embankment ≈ Monza temple-of-speed rhythm.
 * Near-flat Thames street — tiny rolls only.
 */
const embankmentControl: ControlPoint[] = closeLoop([
  { x: 80, z: -460, y: 0 },
  { x: 110, z: -360, y: 0.2 },
  { x: 125, z: -240, y: 0.4 },
  { x: 130, z: -120, y: 0.5 },
  { x: 130, z: 0, y: 0.4 },
  { x: 125, z: 120, y: 0.3 },
  // Della Roggia chicane
  { x: 95, z: 205, y: 0.4 },
  { x: 150, z: 245, y: 0.5 },
  { x: 100, z: 285, y: 0.5 },
  // Lesmo 1 + Lesmo 2
  { x: 155, z: 350, y: 0.6 },
  { x: 120, z: 410, y: 0.8 },
  { x: 55, z: 440, y: 0.6 },
  { x: 5, z: 405, y: 0.5 },
  { x: -45, z: 360, y: 0.4 },
  { x: -75, z: 300, y: 0.3 },
  // Ascari chicane
  { x: -40, z: 240, y: 0.2 },
  { x: -95, z: 195, y: 0.2 },
  { x: -50, z: 155, y: 0.1 },
  { x: -100, z: 105, y: 0.1 },
  // Back straight
  { x: -125, z: 35, y: 0 },
  { x: -130, z: -85, y: 0 },
  { x: -125, z: -205, y: 0 },
  // Parabolica sweep
  { x: -90, z: -305, y: 0 },
  { x: -25, z: -385, y: 0 },
  { x: 45, z: -435, y: 0 },
]);

/**
 * Canary Wharf ≈ Silverstone flowing complex.
 * Village / Loop opened so the hairpin no longer self-blocks.
 * Street-level — no flying deck.
 */
const canaryControl: ControlPoint[] = closeLoop([
  { x: -40, z: -280, y: 0 },
  { x: 40, z: -300, y: 0.2 },
  { x: 110, z: -270, y: 0.3 },
  // Maggotts → Becketts → Chapel
  { x: 175, z: -205, y: 0.5 },
  { x: 210, z: -130, y: 0.7 },
  { x: 165, z: -70, y: 0.8 },
  { x: 210, z: -10, y: 1.0 },
  { x: 175, z: 50, y: 1.0 },
  { x: 220, z: 100, y: 1.2 },
  // Hangar Straight
  { x: 240, z: 170, y: 1.0 },
  { x: 230, z: 255, y: 0.8 },
  // Stowe
  { x: 160, z: 315, y: 0.6 },
  { x: 75, z: 335, y: 0.4 },
  // Vale / Club
  { x: 10, z: 300, y: 0.3 },
  { x: -40, z: 335, y: 0.3 },
  { x: -95, z: 290, y: 0.2 },
  { x: -145, z: 225, y: 0.2 },
  // Village / The Loop — wide left so opposite barriers stay clear
  { x: -200, z: 170, y: 0.1 },
  { x: -255, z: 110, y: 0 },
  { x: -270, z: 35, y: 0 },
  { x: -225, z: -25, y: 0.1 },
  { x: -175, z: -55, y: 0.2 },
  // Luffield double-apex
  { x: -160, z: -110, y: 0.3 },
  { x: -110, z: -145, y: 0.3 },
  { x: -145, z: -195, y: 0.2 },
  { x: -100, z: -235, y: 0.1 },
  { x: -45, z: -265, y: 0 },
]);

/**
 * Egypt ≈ Spa-Francorchamps rhythm — start at ground level, then a mild climb.
 * La Source → Eau Rouge rise → Kemmel crest → descent home (max ~10 m).
 */
const egyptControl: ControlPoint[] = closeLoop([
  // La Source hairpin — ground level start
  { x: -30, z: -210, y: 0 },
  { x: -110, z: -175, y: 0 },
  { x: -160, z: -100, y: 0.5 },
  // Eau Rouge → Raidillon climb
  { x: -120, z: -25, y: 1 },
  { x: -165, z: 40, y: 2.5 },
  { x: -105, z: 100, y: 5 },
  { x: -140, z: 160, y: 7 },
  { x: -85, z: 215, y: 9 },
  // Kemmel Straight crest — pyramid view
  { x: -35, z: 275, y: 10 },
  { x: 50, z: 315, y: 10 },
  { x: 140, z: 335, y: 9 },
  { x: 230, z: 310, y: 8 },
  // Les Combes
  { x: 295, z: 255, y: 7 },
  { x: 255, z: 200, y: 6 },
  { x: 300, z: 145, y: 5 },
  // Rivage descent
  { x: 280, z: 70, y: 4 },
  { x: 235, z: 0, y: 3 },
  { x: 260, z: -70, y: 2.5 },
  // Pouhon
  { x: 215, z: -140, y: 2 },
  { x: 145, z: -180, y: 1.5 },
  { x: 85, z: -145, y: 1.5 },
  // Stavelot
  { x: 35, z: -185, y: 2 },
  { x: -15, z: -150, y: 2 },
  { x: 25, z: -95, y: 2.5 },
  // Blanchimont
  { x: 65, z: -40, y: 2.5 },
  { x: 45, z: 20, y: 2 },
  // Bus Stop back toward start (settle to ground)
  { x: 85, z: 70, y: 1.5 },
  { x: 40, z: 100, y: 1 },
  { x: 75, z: 140, y: 1 },
  { x: 20, z: 170, y: 0.5 },
  { x: -25, z: 125, y: 0.5 },
  { x: -15, z: 50, y: 0 },
  { x: -35, z: -15, y: 0 },
  { x: -25, z: -95, y: 0 },
  { x: -40, z: -155, y: 0 },
]);

/**
 * Dubai ≈ Yas / Marina GP rhythm — loop around a water basin, climb to a
 * hotel crest, then a long east straight staring at Burj Khalifa.
 */
const dubaiControl: ControlPoint[] = closeLoop([
  // Start/finish on the marina causeway
  { x: -40, z: -320, y: 0 },
  { x: 40, z: -340, y: 0 },
  { x: 120, z: -310, y: 0.5 },
  // SE dive to water level
  { x: 190, z: -250, y: 1 },
  { x: 230, z: -170, y: 0.5 },
  // Marina hairpin (tight, photogenic)
  { x: 250, z: -90, y: 0 },
  { x: 200, z: -40, y: 0 },
  { x: 250, z: 20, y: 0.5 },
  // East viewing straight — Burj / Frame dead ahead off +X
  { x: 270, z: 100, y: 1 },
  { x: 275, z: 190, y: 2 },
  { x: 250, z: 280, y: 3.5 },
  // NE climb into Downtown crest
  { x: 170, z: 340, y: 6 },
  { x: 70, z: 360, y: 8 },
  { x: -20, z: 340, y: 9 },
  // Crest kink — skyline panorama
  { x: -80, z: 290, y: 10 },
  { x: -40, z: 230, y: 8 },
  { x: -110, z: 180, y: 6 },
  // NW esses down the hotel strip
  { x: -180, z: 140, y: 4 },
  { x: -230, z: 70, y: 3 },
  { x: -200, z: 0, y: 2 },
  { x: -250, z: -70, y: 1.5 },
  // SW chicane back to causeway
  { x: -210, z: -150, y: 1 },
  { x: -150, z: -220, y: 0.5 },
  { x: -90, z: -280, y: 0 },
]);

/**
 * New York ≈ street GP fantasy — Times Square hairpin, Midtown canyon,
 * Hudson riverside blast, Central Park kink, climb past Hudson Yards.
 */
const nycControl: ControlPoint[] = closeLoop([
  // Start — Midtown south
  { x: -60, z: -280, y: 0 },
  { x: 20, z: -300, y: 0 },
  { x: 90, z: -270, y: 0.5 },
  // SE toward river — Flatiron district kink
  { x: 140, z: -200, y: 1 },
  { x: 100, z: -140, y: 1 },
  { x: 160, z: -80, y: 1.5 },
  // Harbor blast — Statue / Bridge off +X
  { x: 190, z: 0, y: 2 },
  { x: 200, z: 90, y: 2.5 },
  { x: 185, z: 180, y: 3 },
  // NE into canyon — Times Square hairpin
  { x: 120, z: 250, y: 3.5 },
  { x: 40, z: 290, y: 4 },
  { x: -40, z: 270, y: 4.5 },
  { x: -20, z: 200, y: 4 },
  { x: -90, z: 230, y: 5 },
  // Central Park edge kink
  { x: -150, z: 200, y: 5.5 },
  { x: -120, z: 130, y: 5 },
  // West climb — Hudson Yards crest
  { x: -180, z: 70, y: 7 },
  { x: -210, z: 0, y: 8 },
  { x: -180, z: -70, y: 6 },
  // Descent / Broadway esses home
  { x: -200, z: -140, y: 3 },
  { x: -150, z: -200, y: 1.5 },
  { x: -100, z: -250, y: 0.5 },
]);

const blueprints: Blueprint[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    slug: "westminster-sprint",
    name: "Westminster Sprint",
    description:
      "Monaco-style street rhythm — hairpin, riverside harbour run past Big Ben and Parliament, then a tight chicane and Abbey esses.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.4994,
    longitude: -0.1245,
    difficulty: "hard",
    tags: ["monaco-style", "street", "landmarks"],
    roadWidth: 17,
    checkpointCount: 12,
    control: westminsterControl,
    buildingStyles: [
      "london_terrace",
      "retail_ground_floor",
      "apartment_block",
      "london_terrace",
    ],
    facadeMaterials: ["brick", "brick", "concrete", "brick"],
    // Sparse filler — named landmarks carry the skyline.
    buildingSpacing: 42,
    buildingHeight: [14, 26],
    namedTowers: [
      { name: "Foreign Office", at: 0.08, side: -1, offset: 72, width: 42, depth: 32, height: 55, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "Treasury Building", at: 0.14, side: -1, offset: 70, width: 38, depth: 30, height: 52, style: "landmark_placeholder", facadeMaterial: "concrete" },
      { name: "Banqueting House", at: 0.2, side: -1, offset: 68, width: 34, depth: 28, height: 36, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "Admiralty Arch", at: 0.26, side: -1, offset: 74, width: 48, depth: 24, height: 40, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "Portcullis House", at: 0.32, side: -1, offset: 78, width: 34, depth: 32, height: 46, style: "modern_office", facadeMaterial: "glass" },
      { name: "Millbank Tower", at: 0.38, side: -1, offset: 76, width: 26, depth: 26, height: 118, style: "concrete_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "Tate Britain", at: 0.46, side: -1, offset: 74, width: 48, depth: 32, height: 42, style: "landmark_placeholder", facadeMaterial: "concrete" },
      { name: "MI6 Building", at: 0.54, side: -1, offset: 78, width: 46, depth: 34, height: 68, style: "modern_office", facadeMaterial: "glass" },
      { name: "Vauxhall Tower", at: 0.58, side: -1, offset: 82, width: 28, depth: 28, height: 140, style: "steel_and_glass_tower", facadeMaterial: "glass" },
      { name: "Lambeth Palace", at: 0.64, side: -1, offset: 72, width: 38, depth: 32, height: 44, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "St Thomas' Hospital", at: 0.68, side: -1, offset: 70, width: 50, depth: 30, height: 48, style: "modern_office", facadeMaterial: "concrete" },
      { name: "Methodist Central Hall", at: 0.74, side: -1, offset: 70, width: 38, depth: 38, height: 58, style: "landmark_placeholder", facadeMaterial: "brick", roofType: "round" },
      { name: "Scotland Yard", at: 0.8, side: 1, offset: 72, width: 38, depth: 30, height: 62, style: "modern_office", facadeMaterial: "glass" },
      { name: "Imperial War Museum", at: 0.86, side: -1, offset: 76, width: 40, depth: 32, height: 40, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "Churchill War Rooms", at: 0.92, side: -1, offset: 66, width: 32, depth: 26, height: 30, style: "london_terrace", facadeMaterial: "brick" },
    ],
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    slug: "embankment-run",
    name: "Embankment Run",
    description:
      "Monza-style temple of speed — long Thames straights past the Eye, Lesmo doubles, Ascari chicane and a Parabolica sweep.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5081,
    longitude: -0.118,
    difficulty: "medium",
    tags: ["monza-style", "straights", "riverside"],
    roadWidth: 17,
    checkpointCount: 12,
    control: embankmentControl,
    buildingStyles: [
      "apartment_block",
      "modern_office",
      "warehouse",
      "london_terrace",
    ],
    facadeMaterials: ["brick", "glass", "concrete", "brick"],
    buildingSpacing: 34,
    buildingHeight: [22, 52],
    namedTowers: [
      { name: "Somerset House", at: 0.06, side: -1, offset: 68, width: 52, depth: 32, height: 46, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "Savoy Hotel", at: 0.12, side: -1, offset: 66, width: 38, depth: 30, height: 62, style: "apartment_block", facadeMaterial: "brick" },
      { name: "Shell Mex House", at: 0.18, side: -1, offset: 70, width: 42, depth: 30, height: 78, style: "modern_office", facadeMaterial: "concrete" },
      { name: "Cleopatra's Needle", at: 0.24, side: 1, offset: 54, width: 8, depth: 8, height: 32, style: "landmark_placeholder", facadeMaterial: "concrete", roofType: "pyramidal" },
      { name: "Hungerford Bridge", at: 0.3, side: 1, offset: 58, width: 20, depth: 40, height: 48, style: "landmark_placeholder", facadeMaterial: "concrete" },
      { name: "National Theatre", at: 0.36, side: 1, offset: 72, width: 48, depth: 38, height: 52, style: "concrete_office", facadeMaterial: "concrete" },
      { name: "Royal Festival Hall", at: 0.42, side: 1, offset: 74, width: 46, depth: 36, height: 48, style: "landmark_placeholder", facadeMaterial: "concrete" },
      { name: "Oxo Tower", at: 0.5, side: -1, offset: 68, width: 24, depth: 24, height: 82, style: "apartment_block", facadeMaterial: "brick" },
      { name: "Tate Modern", at: 0.56, side: -1, offset: 76, width: 50, depth: 36, height: 70, style: "concrete_office", facadeMaterial: "concrete" },
      { name: "Globe Theatre", at: 0.62, side: -1, offset: 70, width: 36, depth: 36, height: 34, style: "landmark_placeholder", facadeMaterial: "brick", roofType: "round" },
      { name: "Unilever House", at: 0.68, side: 1, offset: 80, width: 36, depth: 26, height: 54, style: "landmark_placeholder", facadeMaterial: "concrete" },
      { name: "Temple Church", at: 0.74, side: -1, offset: 64, width: 30, depth: 30, height: 38, style: "landmark_placeholder", facadeMaterial: "brick", roofType: "round" },
      { name: "The Shard", at: 0.8, side: -1, offset: 90, width: 32, depth: 32, height: 200, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "pyramidal" },
      { name: "Southwark Cathedral", at: 0.84, side: -1, offset: 72, width: 34, depth: 28, height: 42, style: "landmark_placeholder", facadeMaterial: "brick" },
      { name: "City Hall", at: 0.9, side: 1, offset: 78, width: 36, depth: 30, height: 55, style: "modern_office", facadeMaterial: "glass" },
      { name: "Waterloo Station", at: 0.95, side: 1, offset: 74, width: 58, depth: 42, height: 40, style: "warehouse", facadeMaterial: "concrete" },
    ],
  },
  {
    id: "c3d4e5f6-a7b8-4012-8def-123456789012",
    slug: "canary-wharf-loop",
    name: "Canary Wharf Circuit",
    description:
      "Silverstone-style flowing lap — Maggotts–Becketts esses between towers, Hangar Straight past Canada Square, then Village and Luffield.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5054,
    longitude: -0.0235,
    difficulty: "hard",
    tags: ["silverstone-style", "flow", "docklands"],
    roadWidth: 16,
    checkpointCount: 12,
    control: canaryControl,
    buildingStyles: [
      "glass_curtain_wall",
      "steel_and_glass_tower",
      "modern_office",
      "contemporary_apartment",
    ],
    facadeMaterials: ["glass", "glass", "concrete", "glass"],
    buildingSpacing: 26,
    buildingHeight: [36, 95],
    namedTowers: [
      {
        name: "One Canada Square",
        x: 80,
        z: 180,
        width: 42,
        depth: 42,
        height: 235,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
        roofType: "pyramidal",
      },
      {
        name: "HSBC UK",
        x: 130,
        z: 200,
        width: 38,
        depth: 38,
        height: 200,
        style: "glass_curtain_wall",
        facadeMaterial: "glass",
      },
      {
        name: "Citi",
        x: 40,
        z: -40,
        width: 36,
        depth: 36,
        height: 200,
        style: "glass_curtain_wall",
        facadeMaterial: "glass",
      },
      {
        name: "Newfoundland Quay",
        x: -80,
        z: -40,
        width: 32,
        depth: 32,
        height: 220,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
      },
      {
        name: "Landmark Pinnacle",
        x: 20,
        z: -160,
        width: 28,
        depth: 28,
        height: 233,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
        roofType: "pyramidal",
      },
      {
        name: "JP Morgan",
        x: -100,
        z: 100,
        width: 34,
        depth: 34,
        height: 163,
        style: "glass_curtain_wall",
        facadeMaterial: "glass",
      },
      {
        name: "40 Bank Street",
        x: -20,
        z: 160,
        width: 30,
        depth: 30,
        height: 153,
        style: "modern_office",
        facadeMaterial: "glass",
      },
      {
        name: "Novotel London Canary Wharf",
        at: 0.18,
        side: 1,
        offset: 68,
        width: 26,
        depth: 36,
        height: 128,
        style: "contemporary_apartment",
        facadeMaterial: "glass",
      },
      {
        name: "Barclays",
        x: 40,
        z: 60,
        width: 36,
        depth: 36,
        height: 140,
        style: "modern_office",
        facadeMaterial: "glass",
      },
      {
        name: "Morgan Stanley",
        x: 90,
        z: -90,
        width: 32,
        depth: 32,
        height: 110,
        style: "concrete_office",
        facadeMaterial: "concrete",
      },
      {
        name: "South Quay Plaza",
        x: -40,
        z: -180,
        width: 34,
        depth: 34,
        height: 215,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
      },
      // 10 additional labelled docklands sights
      { name: "Hampton Tower", at: 0.08, side: -1, offset: 68, width: 28, depth: 28, height: 188, style: "steel_and_glass_tower", facadeMaterial: "glass" },
      { name: "Wardian East", at: 0.16, side: 1, offset: 66, width: 26, depth: 26, height: 207, style: "glass_curtain_wall", facadeMaterial: "glass" },
      { name: "Wardian West", at: 0.24, side: -1, offset: 70, width: 26, depth: 26, height: 187, style: "glass_curtain_wall", facadeMaterial: "glass" },
      { name: "1 West India Quay", at: 0.34, side: 1, offset: 68, width: 30, depth: 30, height: 111, style: "contemporary_apartment", facadeMaterial: "glass" },
      { name: "Bank of America", at: 0.42, side: -1, offset: 66, width: 34, depth: 30, height: 105, style: "modern_office", facadeMaterial: "glass" },
      { name: "Credit Suisse", at: 0.52, side: 1, offset: 68, width: 36, depth: 32, height: 118, style: "glass_curtain_wall", facadeMaterial: "glass" },
      { name: "East Wintergarden", at: 0.62, side: -1, offset: 64, width: 40, depth: 24, height: 32, style: "landmark_placeholder", facadeMaterial: "glass" },
      { name: "7 Westferry Circus", at: 0.72, side: 1, offset: 66, width: 32, depth: 32, height: 82, style: "modern_office", facadeMaterial: "glass" },
      { name: "Hilton London Canary Wharf", at: 0.82, side: -1, offset: 64, width: 34, depth: 28, height: 68, style: "contemporary_apartment", facadeMaterial: "glass" },
      { name: "Cascades Tower", at: 0.9, side: 1, offset: 70, width: 28, depth: 28, height: 98, style: "apartment_block", facadeMaterial: "concrete" },
    ],
    notes:
      "Silverstone-inspired docklands lap with tower viewing on Hangar Straight",
  },
  {
    id: "d0e1f2a3-b4c5-4789-a123-456789abcdef",
    slug: "egypt-pyramids",
    name: "Giza Desert Circuit",
    description:
      "Spa-style desert lap — Eau Rouge compression, Kemmel Straight past the pyramids and Sphinx, Les Combes chicane and Bus Stop.",
    city: "Giza",
    country: "Egypt",
    latitude: 29.9792,
    longitude: 31.1342,
    difficulty: "hard",
    tags: ["spa-style", "desert", "landmarks"],
    roadWidth: 17,
    checkpointCount: 14,
    control: egyptControl,
    buildingStyles: ["warehouse", "concrete_office", "landmark_placeholder"],
    facadeMaterials: ["sandstone", "sandstone", "concrete", "sandstone"],
    buildingSpacing: 48,
    buildingHeight: [10, 18],
    treeEvery: 0,
    namedTowers: [
      { name: "Mena House", at: 0.04, side: -1, offset: 74, width: 42, depth: 30, height: 30, style: "landmark_placeholder", facadeMaterial: "sandstone" },
      { name: "Giza Plateau Lodge", at: 0.1, side: -1, offset: 72, width: 30, depth: 26, height: 20, style: "warehouse", facadeMaterial: "sandstone" },
      { name: "Valley Temple", at: 0.18, side: -1, offset: 80, width: 40, depth: 38, height: 22, style: "landmark_placeholder", facadeMaterial: "sandstone", roofType: "flat" },
      { name: "Sphinx Temple", at: 0.26, side: -1, offset: 76, width: 34, depth: 30, height: 18, style: "landmark_placeholder", facadeMaterial: "sandstone" },
      { name: "Khafre Temple Annex", at: 0.34, side: -1, offset: 78, width: 36, depth: 32, height: 20, style: "landmark_placeholder", facadeMaterial: "sandstone" },
      { name: "Solar Boat Museum", at: 0.42, side: -1, offset: 78, width: 36, depth: 26, height: 18, style: "warehouse", facadeMaterial: "sandstone" },
      { name: "Osiris Pavilion", at: 0.5, side: -1, offset: 82, width: 32, depth: 28, height: 16, style: "landmark_placeholder", facadeMaterial: "sandstone" },
      { name: "Western Necropolis", at: 0.58, side: -1, offset: 82, width: 44, depth: 30, height: 16, style: "warehouse", facadeMaterial: "sandstone" },
      { name: "Workers Village", at: 0.66, side: -1, offset: 76, width: 42, depth: 28, height: 15, style: "warehouse", facadeMaterial: "sandstone" },
      { name: "Sound and Light Theatre", at: 0.74, side: -1, offset: 80, width: 38, depth: 26, height: 20, style: "concrete_office", facadeMaterial: "concrete" },
      { name: "Desert Rest House", at: 0.82, side: -1, offset: 72, width: 32, depth: 24, height: 14, style: "warehouse", facadeMaterial: "sandstone" },
      { name: "Grand Egyptian Museum", at: 0.9, side: -1, offset: 88, width: 60, depth: 36, height: 48, style: "modern_office", facadeMaterial: "concrete" },
      { name: "Citadel of Saladin", x: -280, z: 40, width: 42, depth: 32, height: 58, style: "landmark_placeholder", facadeMaterial: "sandstone", roofType: "round" },
    ],
    attribution: "Stylised Giza circuit — original procedural geometry",
    notes:
      "Spa-inspired desert circuit with open east vista to the pyramids on Kemmel Straight",
  },
  {
    id: "e1f2a3b4-c5d6-4789-b234-567890abcdef",
    slug: "dubai-marina-circuit",
    name: "Dubai Marina Circuit",
    description:
      "Marina GP loop around a turquoise basin — hairpin at water level, climb to a hotel crest, then a long east straight staring at Burj Khalifa.",
    city: "Dubai",
    country: "United Arab Emirates",
    latitude: 25.0805,
    longitude: 55.1403,
    difficulty: "medium",
    tags: ["marina", "skyline", "glass", "landmarks"],
    roadWidth: 17,
    checkpointCount: 14,
    control: dubaiControl,
    buildingStyles: [
      "steel_and_glass_tower",
      "glass_curtain_wall",
      "modern_office",
      "steel_and_glass_tower",
    ],
    facadeMaterials: ["glass", "glass", "glass", "concrete"],
    buildingSpacing: 28,
    buildingHeight: [14, 48],
    treeEvery: 1,
    namedTowers: [
      // East heroes — close enough to dominate the viewing straight
      {
        name: "Burj Khalifa",
        x: 355,
        z: 140,
        width: 36,
        depth: 36,
        height: 320,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
        roofType: "pyramidal",
      },
      {
        name: "Museum of the Future",
        x: 340,
        z: 40,
        width: 40,
        depth: 32,
        height: 95,
        style: "modern_office",
        facadeMaterial: "glass",
        roofType: "flat",
      },
      {
        name: "Dubai Frame",
        x: 370,
        z: 240,
        width: 28,
        depth: 12,
        height: 110,
        style: "steel_and_glass_tower",
        facadeMaterial: "glass",
        roofType: "flat",
      },
      // Inland marina / Downtown towers along the lap
      { name: "Burj Al Arab", at: 0.02, side: -1, offset: 78, width: 32, depth: 28, height: 180, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Cayan Tower", at: 0.05, side: -1, offset: 74, width: 28, depth: 28, height: 160, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Emirates Tower One", at: 0.08, side: -1, offset: 72, width: 30, depth: 30, height: 175, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Emirates Tower Two", at: 0.11, side: -1, offset: 74, width: 28, depth: 28, height: 155, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Address Downtown", at: 0.14, side: -1, offset: 70, width: 34, depth: 30, height: 150, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Marina 101", at: 0.18, side: -1, offset: 76, width: 30, depth: 30, height: 200, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Princess Tower", at: 0.22, side: -1, offset: 78, width: 28, depth: 28, height: 190, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Address Beach Resort", at: 0.26, side: -1, offset: 68, width: 36, depth: 28, height: 120, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Gate Village DIFC", at: 0.3, side: -1, offset: 66, width: 40, depth: 32, height: 85, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "JW Marriott Marquis", at: 0.34, side: -1, offset: 74, width: 32, depth: 32, height: 170, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Elite Residence", at: 0.38, side: -1, offset: 72, width: 28, depth: 28, height: 165, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Ocean Heights", at: 0.42, side: -1, offset: 74, width: 30, depth: 28, height: 155, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "HHHR Tower", at: 0.46, side: -1, offset: 70, width: 26, depth: 26, height: 145, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Almas Tower", at: 0.5, side: -1, offset: 76, width: 32, depth: 32, height: 180, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Torch Tower", at: 0.54, side: -1, offset: 80, width: 24, depth: 24, height: 170, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Cielo Tower", at: 0.58, side: -1, offset: 68, width: 26, depth: 26, height: 130, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Damac Heights", at: 0.62, side: -1, offset: 74, width: 28, depth: 28, height: 165, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Emirates Crown", at: 0.66, side: -1, offset: 72, width: 30, depth: 28, height: 140, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "23 Marina", at: 0.7, side: -1, offset: 78, width: 28, depth: 28, height: 185, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "The Palm Tower", at: 0.74, side: -1, offset: 82, width: 30, depth: 30, height: 160, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Atlantis The Royal", at: 0.78, side: -1, offset: 80, width: 40, depth: 34, height: 110, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "One Za'abeel", at: 0.82, side: -1, offset: 70, width: 36, depth: 30, height: 150, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "ICD Brookfield Place", at: 0.85, side: -1, offset: 68, width: 34, depth: 32, height: 135, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Boulevard Plaza 1", at: 0.88, side: -1, offset: 66, width: 32, depth: 30, height: 125, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Boulevard Plaza 2", at: 0.9, side: -1, offset: 68, width: 32, depth: 30, height: 120, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "The Index", at: 0.92, side: -1, offset: 74, width: 28, depth: 28, height: 160, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Rose Rayhaan", at: 0.93, side: -1, offset: 72, width: 26, depth: 26, height: 165, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Burj Vista 1", at: 0.94, side: -1, offset: 70, width: 30, depth: 28, height: 145, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "Burj Vista 2", at: 0.95, side: -1, offset: 72, width: 30, depth: 28, height: 140, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
    ],
    attribution: "Stylised Dubai Marina / Downtown circuit — original procedural geometry",
    notes:
      "Marina basin inside the loop; east +X reserved for Burj Khalifa, Museum of the Future, and Dubai Frame",
  },
  {
    id: "f2a3b4c5-d6e7-4890-b345-678901abcdef",
    slug: "new-york-harbor-circuit",
    name: "New York Harbor Circuit",
    description:
      "Street GP fantasy — Times Square hairpin, Midtown canyon, Hudson riverside blast past Liberty, then climb Hudson Yards.",
    city: "New York",
    country: "United States",
    latitude: 40.758,
    longitude: -73.9855,
    difficulty: "hard",
    tags: ["street", "harbor", "midtown", "landmarks"],
    roadWidth: 16,
    checkpointCount: 14,
    control: nycControl,
    buildingStyles: [
      "steel_and_glass_tower",
      "modern_office",
      "glass_curtain_wall",
      "concrete_office",
    ],
    facadeMaterials: ["glass", "concrete", "glass", "brick"],
    buildingSpacing: 24,
    buildingHeight: [18, 62],
    namedTowers: [
      // Harbor heroes — close to the riverside blast
      {
        name: "Statue of Liberty",
        x: 275,
        z: 50,
        width: 22,
        depth: 22,
        height: 95,
        style: "landmark_placeholder",
        facadeMaterial: "concrete",
        roofType: "pyramidal",
      },
      {
        name: "Brooklyn Bridge",
        x: 260,
        z: 155,
        width: 48,
        depth: 18,
        height: 85,
        style: "landmark_placeholder",
        facadeMaterial: "concrete",
        roofType: "flat",
      },
      // Inland Midtown / Financial District skyline
      { name: "Empire State Building", at: 0.08, side: -1, offset: 70, width: 34, depth: 34, height: 240, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "pyramidal" },
      { name: "Chrysler Building", at: 0.14, side: -1, offset: 72, width: 30, depth: 30, height: 200, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "pyramidal" },
      { name: "One World Trade Center", at: 0.2, side: -1, offset: 76, width: 36, depth: 36, height: 260, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "pyramidal" },
      { name: "Flatiron", at: 0.26, side: -1, offset: 64, width: 24, depth: 36, height: 90, style: "modern_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "Citigroup Center", at: 0.3, side: -1, offset: 68, width: 32, depth: 32, height: 170, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Woolworth Building", at: 0.34, side: -1, offset: 66, width: 28, depth: 28, height: 160, style: "modern_office", facadeMaterial: "concrete", roofType: "pyramidal" },
      { name: "30 Rockefeller Plaza", at: 0.38, side: -1, offset: 70, width: 40, depth: 32, height: 175, style: "modern_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "Seagram Building", at: 0.42, side: -1, offset: 64, width: 30, depth: 28, height: 130, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Lever House", at: 0.46, side: -1, offset: 62, width: 32, depth: 24, height: 110, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "432 Park Avenue", at: 0.5, side: -1, offset: 74, width: 24, depth: 24, height: 220, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Hearst Tower", at: 0.54, side: -1, offset: 68, width: 30, depth: 30, height: 145, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "MetLife Building", at: 0.58, side: -1, offset: 70, width: 36, depth: 32, height: 155, style: "modern_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "One Vanderbilt", at: 0.62, side: -1, offset: 72, width: 32, depth: 32, height: 190, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Central Park Tower", at: 0.66, side: -1, offset: 76, width: 26, depth: 26, height: 230, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "111 West 57th Street", at: 0.7, side: -1, offset: 74, width: 22, depth: 28, height: 210, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Bank of America Tower", at: 0.74, side: -1, offset: 68, width: 32, depth: 32, height: 180, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "4 Times Square", at: 0.78, side: -1, offset: 66, width: 34, depth: 30, height: 140, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "New York Times Building", at: 0.8, side: -1, offset: 64, width: 36, depth: 28, height: 150, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "8 Spruce Street", at: 0.82, side: -1, offset: 70, width: 28, depth: 28, height: 165, style: "modern_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "56 Leonard", at: 0.84, side: -1, offset: 68, width: 26, depth: 26, height: 155, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "VIA 57 West", at: 0.86, side: -1, offset: 72, width: 40, depth: 30, height: 120, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "The Edge", at: 0.88, side: -1, offset: 66, width: 28, depth: 24, height: 100, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "One57", at: 0.9, side: -1, offset: 70, width: 28, depth: 28, height: 175, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "15 Hudson Yards", at: 0.91, side: -1, offset: 68, width: 30, depth: 30, height: 160, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "30 Hudson Yards", at: 0.92, side: -1, offset: 72, width: 34, depth: 34, height: 195, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
      { name: "Goldman Sachs Tower", at: 0.93, side: -1, offset: 74, width: 36, depth: 32, height: 170, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "40 Wall Street", at: 0.94, side: -1, offset: 66, width: 28, depth: 28, height: 145, style: "modern_office", facadeMaterial: "concrete", roofType: "pyramidal" },
      { name: "70 Pine Street", at: 0.95, side: -1, offset: 68, width: 26, depth: 26, height: 150, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "pyramidal" },
      { name: "120 Wall Street", at: 0.96, side: -1, offset: 64, width: 30, depth: 24, height: 115, style: "modern_office", facadeMaterial: "concrete", roofType: "flat" },
      { name: "American Copper Buildings", at: 0.97, side: -1, offset: 70, width: 32, depth: 28, height: 140, style: "modern_office", facadeMaterial: "glass", roofType: "flat" },
      { name: "The Spiral", at: 0.98, side: -1, offset: 72, width: 34, depth: 34, height: 185, style: "steel_and_glass_tower", facadeMaterial: "glass", roofType: "flat" },
    ],
    attribution: "Stylised New York Midtown / harbor circuit — original procedural geometry",
    notes:
      "East +X reserved for Statue of Liberty and Brooklyn Bridge; Times Square boards + Central Park green in dressing",
  },
];


async function main() {
  const outDir = path.join(process.cwd(), "public", "routes");
  await mkdir(outDir, { recursive: true });

  for (const bp of blueprints) {
    const route = validateRouteData(buildRoute(bp));
    const file = path.join(outDir, `${route.slug}.json`);
    await writeFile(file, `${JSON.stringify(route, null, 2)}\n`, "utf8");
    console.log(
      `${route.slug}: ${route.distanceMetres}m, ${route.checkpoints.length} checkpoints, ${route.buildings.length} buildings`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
