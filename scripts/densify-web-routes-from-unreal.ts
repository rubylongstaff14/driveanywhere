/**
 * Bake Unreal handoff density into public/routes/*.json so Amplify shows
 * the denser cities (same racing line, more buildings + named landmarks).
 *
 * Usage: npx tsx scripts/densify-web-routes-from-unreal.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROUTES_DIR = path.join(ROOT, "public", "routes");
const UE_DIR = path.join(ROOT, "nextgen", "unreal", "export", "circuits");

const STYLES = [
  "london_terrace",
  "modern_office",
  "apartment_block",
  "retail_ground_floor",
  "warehouse",
  "landmark_placeholder",
  "glass_curtain_wall",
  "steel_and_glass_tower",
  "modern_office_podium",
  "contemporary_apartment",
  "concrete_office",
  "brick_commercial",
  "dockside_warehouse",
  "generic_distant_tower",
] as const;

type Style = (typeof STYLES)[number];

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Building {
  id: string;
  name?: string;
  footprint: Vec3[];
  height: number;
  baseHeight: number;
  floors: number;
  style: Style;
  facadeMaterial: string;
  facadeColor?: string;
  roofType: "flat" | "pitched" | "pyramidal" | "round";
  confidence: number;
  source: string;
}

interface RoadPoint {
  x: number;
  y: number;
  z: number;
  width: number;
}

/** Unreal cm (X-forward, Y-right) → Three.js metres (X-east, Z-north). */
function fromUnreal(xCm: number, yCm: number): { x: number; z: number } {
  return { x: yCm / 100, z: xCm / 100 };
}

function footprintBox(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
): Vec3[] {
  return [
    { x: cx - halfW, y: 0, z: cz - halfD },
    { x: cx + halfW, y: 0, z: cz - halfD },
    { x: cx + halfW, y: 0, z: cz + halfD },
    { x: cx - halfW, y: 0, z: cz + halfD },
  ];
}

function mapStyle(raw?: string): Style {
  const s = (raw ?? "").toLowerCase();
  if (STYLES.includes(s as Style)) return s as Style;
  if (s.includes("glass") || s.includes("tower")) return "steel_and_glass_tower";
  if (s.includes("warehouse") || s.includes("dock")) return "dockside_warehouse";
  if (s.includes("apartment")) return "contemporary_apartment";
  if (s.includes("retail")) return "retail_ground_floor";
  if (s.includes("landmark")) return "landmark_placeholder";
  if (s.includes("terrace") || s.includes("brick")) return "london_terrace";
  return "modern_office";
}

function mapRoof(raw?: string): Building["roofType"] {
  if (raw === "pitched" || raw === "pyramidal" || raw === "round") return raw;
  return "flat";
}

function roadSamples(points: RoadPoint[]) {
  const out: Array<{
    x: number;
    z: number;
    nx: number;
    nz: number;
    width: number;
  }> = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    out.push({
      x: a.x,
      z: a.z,
      nx: -dz / len,
      nz: dx / len,
      width: a.width ?? 12,
    });
  }
  return out;
}

function clearance(
  samples: ReturnType<typeof roadSamples>,
  cx: number,
  cz: number,
  half: number,
): number {
  let best = Infinity;
  for (const s of samples) {
    const edge = Math.hypot(cx - s.x, cz - s.z) - s.width / 2;
    best = Math.min(best, edge - half);
  }
  return best;
}

function densify(slug: string) {
  const webPath = path.join(ROUTES_DIR, `${slug}.json`);
  const uePath = path.join(UE_DIR, `${slug}.json`);
  if (!fs.existsSync(webPath) || !fs.existsSync(uePath)) {
    console.warn(`skip ${slug}: missing files`);
    return;
  }

  const web = JSON.parse(fs.readFileSync(webPath, "utf8")) as {
    slug: string;
    buildings: Building[];
    sceneryObjects: unknown[];
    roadPoints: RoadPoint[];
    metadata: { version: number; generatedBy: string; notes?: string };
  };
  const ue = JSON.parse(fs.readFileSync(uePath, "utf8")) as {
    massing: Array<{
      heightCm: number;
      widthCm: number;
      depthCm: number;
      x: number;
      y: number;
      style?: string;
      facade?: string;
      roof?: string;
    }>;
    namedLandmarks: Array<{
      name: string;
      heightCm: number;
      widthCm: number;
      depthCm: number;
      x: number;
      y: number;
      style?: string;
      facade?: string;
      roof?: string;
      floors?: number;
      colorHex?: string;
    }>;
    caps?: { streetFillMax?: number; skylineMax?: number };
  };

  const samples = roadSamples(web.roadPoints);
  // Replace previous densify layers so re-runs don't stack forever.
  const existing = web.buildings.filter(
    (b) =>
      b.source !== "unreal-named" &&
      b.source !== "unreal-massing" &&
      b.source !== "web-street-fill" &&
      b.source !== "web-skyline",
  );
  const byKey = new Set(
    existing.map(
      (b) =>
        `${Math.round(b.footprint.reduce((s, p) => s + p.x, 0) / b.footprint.length)}:${Math.round(b.footprint.reduce((s, p) => s + p.z, 0) / b.footprint.length)}`,
    ),
  );

  const added: Building[] = [];
  const pushBuilding = (b: Building, minClear: number) => {
    const cx =
      b.footprint.reduce((s, p) => s + p.x, 0) / Math.max(1, b.footprint.length);
    const cz =
      b.footprint.reduce((s, p) => s + p.z, 0) / Math.max(1, b.footprint.length);
    const halfW =
      Math.max(...b.footprint.map((p) => Math.abs(p.x - cx))) || 4;
    const halfD =
      Math.max(...b.footprint.map((p) => Math.abs(p.z - cz))) || 4;
    if (clearance(samples, cx, cz, Math.max(halfW, halfD)) < minClear) return;
    const key = `${Math.round(cx)}:${Math.round(cz)}`;
    if (byKey.has(key)) return;
    byKey.add(key);
    added.push(b);
  };

  // Named Unreal landmarks → tall labelled buildings on the web route.
  for (const [i, n] of (ue.namedLandmarks ?? []).entries()) {
    const { x, z } = fromUnreal(n.x, n.y);
    const hw = Math.max(4, (n.widthCm ?? 2000) / 200);
    const hd = Math.max(4, (n.depthCm ?? 2000) / 200);
    const height = Math.max(18, Math.min(220, (n.heightCm ?? 4000) / 100));
    pushBuilding(
      {
        id: `${slug}-ue-named-${i}`,
        name: n.name,
        footprint: footprintBox(x, z, hw, hd),
        height,
        baseHeight: 0,
        floors: n.floors ?? Math.max(4, Math.round(height / 3.5)),
        style: mapStyle(n.style ?? "landmark_placeholder"),
        facadeMaterial: n.facade ?? "brick",
        facadeColor: n.colorHex,
        roofType: mapRoof(n.roof),
        confidence: 0.85,
        source: "unreal-named",
      },
      10,
    );
  }

  // Extra massing from Unreal (may overlap existing — skip collisions).
  for (const [i, m] of (ue.massing ?? []).entries()) {
    const { x, z } = fromUnreal(m.x, m.y);
    const hw = Math.max(3.5, (m.widthCm ?? 1200) / 200);
    const hd = Math.max(3.5, (m.depthCm ?? 1200) / 200);
    const height = Math.max(12, Math.min(160, (m.heightCm ?? 2000) / 100));
    pushBuilding(
      {
        id: `${slug}-ue-mass-${i}`,
        footprint: footprintBox(x, z, hw, hd),
        height,
        baseHeight: 0,
        floors: Math.max(3, Math.round(height / 3.5)),
        style: mapStyle(m.style),
        facadeMaterial: m.facade ?? "concrete",
        roofType: mapRoof(m.roof),
        confidence: 0.7,
        source: "unreal-massing",
      },
      8,
    );
  }

  // Procedural street + skyline rings (match Unreal da_driveable caps).
  const streetMax = Math.max(ue.caps?.streetFillMax ?? 160, 180);
  const skyMax = Math.max(ue.caps?.skylineMax ?? 72, 90);
  const cityBoost =
    /dubai|canary|york|tokyo|westminster|embankment/.test(slug) ? 1.35 : 1;
  const alpineCut = /egypt|alps|rio/.test(slug) ? 0.65 : 1;

  let streetN = 0;
  const stride = Math.max(1, Math.floor(samples.length / Math.max(40, streetMax / 2)));
  for (let i = 2; i < samples.length - 2 && streetN < streetMax; i += stride) {
    const s = samples[i];
    for (const side of [-1, 1] as const) {
      if (streetN >= streetMax) break;
      const dist = 34 + ((i + side + 3) % 6) * 4;
      const x = s.x + s.nx * side * dist;
      const z = s.z + s.nz * side * dist;
      const hw = 5.5 + (i % 7);
      const hd = 5 + ((i + 2) % 6);
      const height = (14 + ((i * 11 + side) % 42)) * alpineCut;
      pushBuilding(
        {
          id: `${slug}-street-fill-${streetN}`,
          footprint: footprintBox(x, z, hw, hd),
          height,
          baseHeight: 0,
          floors: Math.max(3, Math.round(height / 3.2)),
          style: STYLES[(i + streetN) % STYLES.length],
          facadeMaterial: "brick",
          roofType: height > 40 ? "flat" : "pitched",
          confidence: 0.6,
          source: "web-street-fill",
        },
        7,
      );
      streetN += 1;
    }
  }

  let skyN = 0;
  const skyStride = Math.max(1, Math.floor(samples.length / Math.max(24, skyMax)));
  for (let i = 0; i < samples.length && skyN < skyMax; i += skyStride) {
    const s = samples[i];
    const side = skyN % 2 === 0 ? 1 : -1;
    const ring = skyN % 3 === 0 ? 0 : 1;
    const dist = (ring === 0 ? 150 : 230) + (skyN % 9) * 10;
    const x = s.x + s.nx * side * dist;
    const z = s.z + s.nz * side * dist;
    const hw = 8 + (skyN % 10);
    const hd = 7 + ((skyN + 3) % 8);
    let height = (55 + (skyN % 17) * 8) * cityBoost * alpineCut;
    height = Math.min(210, height);
    pushBuilding(
      {
        id: `${slug}-skyline-${skyN}`,
        name: skyN % 5 === 0 ? `Skyline ${skyN + 1}` : undefined,
        footprint: footprintBox(x, z, hw, hd),
        height,
        baseHeight: 0,
        floors: Math.max(12, Math.round(height / 3.8)),
        style:
          height > 100
            ? "steel_and_glass_tower"
            : "generic_distant_tower",
        facadeMaterial: "glass",
        roofType: "flat",
        confidence: 0.55,
        source: "web-skyline",
      },
      40,
    );
    skyN += 1;
  }

  web.buildings = [...existing, ...added];
  web.metadata = {
    ...web.metadata,
    version: Math.max(9, (web.metadata?.version ?? 1) + 1),
    generatedBy: "densify-web-routes-from-unreal",
    notes: `Merged Unreal named/massing + street/skyline fill (+${added.length}). Racing line unchanged.`,
  };

  fs.writeFileSync(webPath, `${JSON.stringify(web, null, 2)}\n`);
  console.log(
    `${slug}: ${existing.length} → ${web.buildings.length} buildings (+${added.length})`,
  );
}

const slugs = fs
  .readdirSync(ROUTES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

for (const slug of slugs) densify(slug);
console.log("done");
