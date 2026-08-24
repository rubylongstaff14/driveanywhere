/**
 * Export DriveAnywhere circuits into Unreal-friendly units.
 *
 * Three.js: metres, Y-up, X-right, Z-forward.
 * Unreal: centimetres, Z-up, X-forward, Y-right.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { VEHICLES, VEHICLE_LIST } from "../lib/game/vehicles";
import { GAME_CONSTANTS } from "../lib/game/constants";
import { COSMETICS } from "../lib/game/cosmetics";
import { sampleRoad } from "../lib/game/road-mesh";
import { getLandmarkIdentity } from "../lib/game/landmark-identity";
import { buildTrackBarriers } from "../lib/game/track-barriers";
import { buildTurnSigns } from "../lib/game/track-signs";
import { circuitLandmarksFor } from "../lib/game/circuit-landmarks";

const CM = 100;

function toUnreal(x: number, y: number, z: number) {
  return {
    x: z * CM,
    y: x * CM,
    z: y * CM,
  };
}

function hexToRgb01(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: Number((parseInt(h.slice(0, 2), 16) / 255).toFixed(3)),
    g: Number((parseInt(h.slice(2, 4), 16) / 255).toFixed(3)),
    b: Number((parseInt(h.slice(4, 6), 16) / 255).toFixed(3)),
  };
}

interface RoadPoint {
  x: number;
  y?: number;
  z: number;
  width: number;
}

interface RouteJson {
  slug: string;
  name: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distanceMetres?: number;
  startPosition?: { x: number; y: number; z: number };
  startRotation?: number;
  roadPoints: RoadPoint[];
  checkpoints?: Array<{ index: number; position: { x: number; y: number; z: number }; width: number }>;
  buildings?: Array<{
    name?: string;
    height: number;
    footprint: Array<{ x: number; z: number; y?: number }>;
    style?: string;
    facadeMaterial?: string;
    facadeColor?: string;
    roofType?: string;
    floors?: number;
  }>;
  sceneryObjects?: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation?: number;
    scale?: number;
  }>;
}

function westminsterHeroes(samples: ReturnType<typeof sampleRoad>) {
  if (samples.length < 8) return [];
  let harbour = samples[0];
  let best = -Infinity;
  for (const s of samples) {
    const score = s.position.x * 2 + s.position.z * 0.15;
    if (score > best) {
      best = score;
      harbour = s;
    }
  }
  const hx = harbour.position.x;
  const hz = harbour.position.z;
  let nx = harbour.normal.x;
  let nz = harbour.normal.z;
  if (nx < 0) {
    nx = -nx;
    nz = -nz;
  }
  const nlen = Math.hypot(nx, nz) || 1;
  nx /= nlen;
  nz /= nlen;

  let abbey = samples[0];
  let abbeyBest = Infinity;
  for (const s of samples) {
    const dz = Math.abs(s.position.z - hz);
    if (dz > 80) continue;
    if (s.position.x < abbeyBest) {
      abbeyBest = s.position.x;
      abbey = s;
    }
  }
  let anx = abbey.normal.x;
  let anz = abbey.normal.z;
  if (anx > 0) {
    anx = -anx;
    anz = -anz;
  }
  const alen = Math.hypot(anx, anz) || 1;
  anx /= alen;
  anz /= alen;

  /** Place a hero off a road sample (metres). Side follows sample normal. */
  const placeAt = (
    frac: number,
    sideDist: number,
    along: number,
    id: string,
    label: string,
    kind: string,
  ) => {
    const s = samples[Math.min(samples.length - 1, Math.floor(samples.length * frac))];
    const nx = s.normal.x;
    const nz = s.normal.z;
    const tx = s.tangent.x;
    const tz = s.tangent.z;
    return {
      id,
      label,
      kind,
      ...toUnreal(
        s.position.x + nx * sideDist + tx * along,
        0,
        s.position.z + nz * sideDist + tz * along,
      ),
    };
  };

  const heroes = [
    // Core harbour trio (real relative layout)
    {
      id: "big-ben",
      label: "Big Ben",
      kind: "clock-tower",
      ...toUnreal(hx + nx * 58, 0, hz - 62),
    },
    {
      id: "parliament",
      label: "Parliament",
      kind: "parliament",
      ...toUnreal(hx + nx * 118, 0, hz + 48),
    },
    {
      id: "abbey",
      label: "Abbey",
      kind: "abbey",
      ...toUnreal(abbey.position.x + anx * 68, 0, abbey.position.z + anz * 68),
    },
    // +10 detailed heroes — spread along the circuit for trackside viewing
    {
      id: "victoria-tower",
      label: "Victoria Tower",
      kind: "gothic-spire",
      ...toUnreal(hx + nx * 102, 0, hz + 108),
    },
    placeAt(0.48, 78, 12, "mi6", "MI6 Building", "stepped-tower"),
    placeAt(0.18, -72, -28, "london-eye", "London Eye", "ferris"),
    placeAt(0.28, 70, -8, "admiralty-arch", "Admiralty Arch", "pylon-gate"),
    placeAt(0.42, 82, 0, "millbank-tower", "Millbank Tower", "capsule"),
    placeAt(0.58, -88, 20, "st-george-wharf", "St George Wharf", "needle-spire"),
    placeAt(0.14, 55, 0, "westminster-bridge", "Westminster Bridge", "bridge-tower"),
    placeAt(0.72, 95, -15, "battersea", "Battersea Power Station", "copper-steps"),
    placeAt(0.34, 64, 25, "horse-guards", "Horse Guards", "portico"),
    placeAt(0.62, -105, 40, "the-shard", "The Shard", "shard"),
    // +50% more famous London landmarks (photo-inspired silhouettes)
    placeAt(0.08, -60, 15, "county-hall", "County Hall", "portico"),
    placeAt(0.38, 68, -20, "foreign-office", "Foreign Office", "portico"),
    placeAt(0.52, 75, 30, "tate-britain", "Tate Britain", "portico"),
    placeAt(0.22, 48, 40, "cleopatra", "Cleopatra Needle", "obelisk"),
    placeAt(0.44, 70, 10, "portcullis", "Portcullis House", "copper-steps"),
    placeAt(0.36, 66, -35, "mod", "Ministry of Defence", "portico"),
    placeAt(0.55, -70, -25, "lambeth-palace", "Lambeth Palace", "gothic-spire"),
    // +50% more photo-inspired London landmarks
    placeAt(0.12, 58, -18, "scotland-yard", "Scotland Yard", "neon-drum"),
    placeAt(0.4, -78, 12, "shell-centre", "Shell Centre", "glass-slab"),
    placeAt(0.65, 88, 8, "us-embassy", "US Embassy", "glass-slab"),
    placeAt(0.25, -52, -12, "boudica", "Boudica", "statue"),
    placeAt(0.78, -92, 18, "vauxhall-cross", "Vauxhall Cross", "stepped-tower"),
    placeAt(0.16, 62, 22, "cenotaph", "Cenotaph", "obelisk"),
    placeAt(0.5, 72, -40, "downing-street", "Downing Street", "pylon-gate"),
    placeAt(0.68, 90, -30, "nine-elms", "Nine Elms Tower", "needle-spire"),
    placeAt(0.3, -65, 35, "st-thomas", "St Thomas Hospital", "glass-slab"),
    placeAt(0.85, 100, 5, "riverwalk", "Riverwalk Tower", "glass-slab"),
  ];
  return heroes.map((h) => ({
    ...h,
    x: Number(h.x.toFixed(1)),
    y: Number(h.y.toFixed(1)),
    z: Number(h.z.toFixed(1)),
  }));
}


/** Famous skyline heroes per circuit — placed like Westminster Big Ben. */
function cityHeroes(slug: string, samples: ReturnType<typeof sampleRoad>) {
  if (samples.length < 8) return [];
  const mid = samples[Math.floor(samples.length * 0.35)];
  const late = samples[Math.floor(samples.length * 0.7)];
  const place = (
    id: string,
    label: string,
    kind: string,
    s: (typeof samples)[0],
    sideDist: number,
    along = 0,
  ) => {
    const nx = s.normal.x;
    const nz = s.normal.z;
    const tx = s.tangent.x;
    const tz = s.tangent.z;
    return {
      id,
      label,
      kind,
      ...toUnreal(
        s.position.x + nx * sideDist + tx * along,
        0,
        s.position.z + nz * sideDist + tz * along,
      ),
    };
  };
  const fix = (h: ReturnType<typeof place>) => ({
    ...h,
    x: Number(h.x.toFixed(1)),
    y: Number(h.y.toFixed(1)),
    z: Number(h.z.toFixed(1)),
  });
  const early = samples[Math.floor(samples.length * 0.15)];
  const q1 = samples[Math.floor(samples.length * 0.25)];
  const q3 = samples[Math.floor(samples.length * 0.55)];
  const late2 = samples[Math.floor(samples.length * 0.85)];
  switch (slug) {
    case "westminster-sprint":
      return westminsterHeroes(samples);
    case "embankment-run":
      return [
        fix(place("london-eye", "London Eye", "ferris", mid, 78, 10)),
        fix(place("shell-mex", "Shell Mex", "clock-spire", late, -62, 0)),
        fix(place("the-shard", "The Shard", "shard", late2, -95, 20)),
        fix(place("tate-modern", "Tate Modern", "neon-drum", q3, -70, -15)),
        fix(place("somerset-house", "Somerset House", "portico", q1, 68, 0)),
        fix(place("oxo-tower", "Oxo Tower", "art-deco", mid, -75, 40)),
        fix(place("waterloo", "Waterloo Station", "glass-slab", late, 80, -25)),
        fix(place("cleopatra", "Cleopatra Needle", "obelisk", early, 52, 0)),
        fix(place("county-hall", "County Hall", "portico", q1, -60, 15)),
        fix(place("savoy", "Savoy Hotel", "art-deco", mid, 70, -30)),
        fix(place("globe", "Globe Theatre", "torus-museum", q3, -68, 25)),
        fix(place("city-hall", "City Hall", "capsule", late2, -85, 0)),
        fix(place("gherkin", "The Gherkin", "gherkin", late, -100, 30)),
        fix(place("walkie", "Walkie Talkie", "walkie-talkie", late2, 90, -40)),
        fix(place("st-pauls", "St Pauls", "dome", q3, 85, 20)),
        fix(place("tower-bridge", "Tower Bridge", "bridge-tower", early, -55, 25)),
        fix(place("monument", "The Monument", "obelisk", mid, 62, 50)),
        fix(place("blackfriars", "Blackfriars Bridge", "bridge-tower", late, 58, 35)),
        fix(place("millennium", "Millennium Bridge", "bridge-tower", q3, -55, -20)),
        fix(place("southwark", "Southwark Cathedral", "gothic-spire", early, 68, -15)),
        fix(place("lloyds", "Lloyds Building", "copper-steps", late2, 95, 15)),
        fix(place("leadenhall", "Leadenhall Building", "shard", mid, -95, -35)),
      ];
    case "canary-wharf-loop":
      return [
        fix(place("one-canada", "One Canada Square", "art-deco", mid, 90, 0)),
        fix(place("hsbc", "HSBC Tower", "capsule", late, -75, 20)),
        fix(place("citigroup", "Citigroup Centre", "glass-slab", q1, 82, 10)),
        fix(place("newfoundland", "Newfoundland", "twist", q3, -80, 0)),
        fix(place("landmark-pinnacle", "Landmark Pinnacle", "needle-spire", late2, 95, -15)),
        fix(place("wardian", "Wardian London", "glass-slab", mid, -70, 35)),
        fix(place("churchill-place", "One Churchill Place", "glass-slab", early, 78, 0)),
        fix(place("bank-street", "40 Bank Street", "glass-slab", q1, -72, 20)),
        fix(place("pan-peninsula", "Pan Peninsula", "capsule", q3, 85, -25)),
        fix(place("baltimore", "Baltimore Tower", "glass-slab", late2, -88, 10)),
        fix(place("riverside-south", "Riverside South", "glass-slab", mid, 88, -40)),
        fix(place("ontario-tower", "Ontario Tower", "capsule", q1, -80, 30)),
        fix(place("crossrail", "Crossrail Place", "glass-slab", early, 70, 15)),
        fix(place("heron-quays", "Heron Quays", "glass-slab", late, 78, -20)),
        fix(place("west-india-quay", "West India Quay", "art-deco", late2, -70, 25)),
        fix(place("one-park-drive", "One Park Drive", "capsule", mid, 92, 20)),
        fix(place("south-quay", "South Quay Plaza", "glass-slab", q3, -85, -30)),
        fix(place("canary-riverside", "Canary Riverside", "glass-slab", late2, 88, 35)),
        fix(place("harbour-exchange", "Harbour Exchange", "glass-slab", early, -75, 25)),
        fix(place("reuters", "Reuters Plaza", "glass-slab", q1, 85, -35)),
      ];
    case "dubai-marina-circuit":
      return [
        fix(place("burj-khalifa", "Burj Khalifa", "tri-needle", mid, 120, 0)),
        fix(place("burj-al-arab", "Burj Al Arab", "sail", late, 100, -30)),
        fix(place("ain-dubai", "Ain Dubai", "ferris", late2, 110, 15)),
        fix(place("cayan", "Cayan Tower", "twist", q3, -92, 0)),
        fix(place("dubai-frame", "Dubai Frame", "gold-frame", q1, 100, 20)),
        fix(place("museum-future", "Museum of the Future", "torus-museum", mid, -85, 40)),
        fix(place("emirates-towers", "Emirates Towers", "needle-spire", early, 95, 0)),
        fix(place("address", "Address Downtown", "glass-slab", q1, -88, -20)),
        fix(place("princess", "Princess Tower", "capsule", q3, 90, 25)),
        fix(place("rose-rayhaan", "Rose Rayhaan", "needle-spire", late2, -100, 0)),
        fix(place("marina-101", "Marina 101", "glass-slab", mid, 95, -50)),
        fix(place("jw-marriott", "JW Marriott Marquis", "glass-slab", late, -90, 35)),
        fix(place("elite", "Elite Residence", "capsule", q1, 85, 40)),
        fix(place("ocean-heights", "Ocean Heights", "twist", early, -80, -15)),
        fix(place("cayan-helix", "Infinity Tower", "twist", late2, 100, 20)),
        fix(place("atlantis", "Atlantis Palm", "art-deco", mid, 110, 55)),
        fix(place("difc-gate", "DIFC Gate", "gold-frame", q3, -95, -40)),
        fix(place("address-marina", "Address Marina", "capsule", late, 88, -45)),
        fix(place("jumeirah-beach", "Jumeirah Beach Hotel", "sail", early, 100, 30)),
        fix(place("dubai-mall", "Dubai Mall Spire", "needle-spire", q1, 92, -50)),
      ];
    case "egypt-pyramids":
      return [
        fix(place("khufu", "Great Pyramid", "pyramid", mid, 130, 0)),
        fix(place("khafre", "Khafre", "pyramid", late, 110, 45)),
        fix(place("sphinx", "Sphinx", "sphinx", mid, 95, -55)),
        fix(place("menkaure", "Menkaure", "pyramid", q3, 100, 20)),
        fix(place("valley-temple", "Valley Temple", "pylon-gate", q1, 80, 0)),
        fix(place("queens", "Queens Pyramids", "pyramid", late2, 85, -30)),
        fix(place("solar-boat", "Solar Boat Museum", "torus-museum", early, 70, 15)),
        fix(place("mena-house", "Mena House", "chalet", q1, -75, 0)),
        fix(place("plateau-gate", "Giza Gate", "pylon-gate", mid, -90, 40)),
        fix(place("sound-light", "Sound and Light", "neon-drum", late, 70, -20)),
        fix(place("khufu-boat", "Khufu Ship House", "chalet", q3, -65, 25)),
        fix(place("workers-village", "Workers Village", "ziggurat", early, 60, -30)),
        fix(place("desert-camp", "Desert Camp", "chalet", late2, -70, 15)),
        fix(place("nile-view", "Nile View Lodge", "chalet", mid, 75, 60)),
        fix(place("pyramid-road-gate", "Pyramid Road Gate", "pylon-gate", q1, 90, -40)),
        fix(place("mastaba", "Mastaba Field", "ziggurat", late, -80, 35)),
        fix(place("causeway", "Khafre Causeway", "pylon-gate", q3, 75, -50)),
        fix(place("desert-obelisk", "Desert Obelisk", "obelisk", early, -60, 40)),
        fix(place("camel-stable", "Camel Stable", "chalet", mid, -70, -45)),
        fix(place("plateau-beacon", "Plateau Beacon", "lighthouse", late2, 95, 40)),
      ];
    case "new-york-harbor-circuit":
      return [
        fix(place("empire", "Empire State", "art-deco", mid, 105, 0)),
        fix(place("liberty", "Statue of Liberty", "statue", late, 140, 20)),
        fix(place("chrysler", "Chrysler Building", "art-deco", q1, 95, 15)),
        fix(place("one-wtc", "One World Trade", "needle-spire", late2, 110, -10)),
        fix(place("brooklyn-bridge", "Brooklyn Bridge", "bridge-tower", early, 70, 0)),
        fix(place("flatiron", "Flatiron", "art-deco", q3, -80, 25)),
        fix(place("woolworth", "Woolworth Building", "gothic-spire", mid, -90, -20)),
        fix(place("st-patrick", "St Patricks", "gothic-spire", q1, 75, -30)),
        fix(place("grand-central", "Grand Central", "portico", q3, 85, 0)),
        fix(place("seagram", "Seagram Building", "capsule", late2, -95, 15)),
        fix(place("metlife", "MetLife Building", "glass-slab", mid, 90, 40)),
        fix(place("un-hq", "UN Headquarters", "glass-slab", late, -85, -25)),
        fix(place("rockefeller", "Rockefeller Center", "art-deco", q1, -75, 20)),
        fix(place("nypl", "NY Public Library", "portico", early, 65, -15)),
        fix(place("freedom-tower", "Freedom Tower Plaza", "needle-spire", late2, 100, 30)),
        fix(place("citigroup-nyc", "Citigroup Center", "glass-slab", mid, -100, 45)),
        fix(place("hearst", "Hearst Tower", "glass-slab", q3, 92, -35)),
        fix(place("met-museum", "Met Museum", "portico", early, -70, 30)),
        fix(place("guggenheim", "Guggenheim", "torus-museum", late, 75, 40)),
        fix(place("wall-street", "Wall Street Exchange", "art-deco", q1, 80, 45)),
      ];
    case "tokyo-drift-circuit":
      return [
        fix(place("tokyo-tower", "Tokyo Tower", "lattice-spire", mid, 95, 0)),
        fix(place("skytree", "Skytree", "tri-needle", late, 115, 15)),
        fix(place("sensoji", "Senso-ji Temple", "pagoda", q1, 70, 0)),
        fix(place("torii", "Meiji Torii", "torii", early, 55, 10)),
        fix(place("cocoon", "Mode Gakuen Cocoon", "capsule", q3, -85, 0)),
        fix(place("metro-gov", "Tokyo Metropolitan", "gothic-spire", mid, -90, 30)),
        fix(place("docomo", "NTT Docomo", "clock-spire", late2, 88, -20)),
        fix(place("rainbow", "Rainbow Bridge", "bridge-tower", q1, -75, 25)),
        fix(place("spiral", "Mode Gakuen Spiral", "twist", q3, 80, -15)),
        fix(place("asakusa", "Asakusa Culture", "pagoda", late2, -70, 10)),
        fix(place("shibuya-scramble", "Shibuya Scramble", "neon-drum", mid, 70, -45)),
        fix(place("tokyo-station", "Tokyo Station", "portico", early, 68, 20)),
        fix(place("roppongi", "Roppongi Hills", "glass-slab", late, -95, 0)),
        fix(place("mori-tower", "Mori Tower", "glass-slab", q3, 92, 25)),
        fix(place("gate-bridge", "Tokyo Gate Bridge", "bridge-tower", late2, 80, -30)),
        fix(place("shinjuku", "Shinjuku Center", "glass-slab", mid, 95, 40)),
        fix(place("yoyogi", "Yoyogi Stadium", "torus-museum", q1, -68, -25)),
        fix(place("akihabara", "Akihabara Neon", "neon-drum", late, 72, 45)),
        fix(place("imperial", "Imperial Palace Gate", "torii", early, -60, -20)),
        fix(place("odaiba", "Odaiba Statue", "statue", late2, -85, 25)),
      ];
    case "alps-mountain-pass":
      return [
        fix(place("chalet", "Alpine Chalet", "chalet", mid, 58, 0)),
        fix(place("pylon", "Cable Pylon", "cable-pylon", late, 52, 10)),
        fix(place("matterhorn", "Matterhorn Peak", "sugarloaf", late2, 140, 0)),
        fix(place("gornergrat", "Gornergrat Kulm", "chalet", q1, 65, 15)),
        fix(place("observatory", "Gornergrat Observatory", "dome", q3, 70, -10)),
        fix(place("church", "Zermatt Church", "gothic-spire", early, 50, 0)),
        fix(place("clock", "Zermatt Clock", "clock-spire", mid, -55, 20)),
        fix(place("monte-rosa", "Monte Rosa Hut", "capsule", q3, -60, 0)),
        fix(place("klein", "Klein Matterhorn", "needle-spire", late, 120, -25)),
        fix(place("sunnegga", "Sunnegga Station", "chalet", late2, -58, 15)),
        fix(place("hornli", "Hornli Hutte", "chalet", mid, 70, -30)),
        fix(place("theodul", "Theodul Pass", "cable-pylon", q1, -50, 25)),
        fix(place("glacier", "Glacier Paradise", "glass-slab", early, 80, -10)),
        fix(place("rothorn", "Rothorn Summit", "sugarloaf", late2, 110, 20)),
        fix(place("furi", "Furi Station", "chalet", q3, 55, 15)),
        fix(place("riffelalp", "Riffelalp Resort", "chalet", mid, -65, 40)),
        fix(place("tschuggen", "Tschuggen Peak", "sugarloaf", late, 100, 35)),
        fix(place("findeln", "Findeln Chapel", "gothic-spire", early, -48, 20)),
        fix(place("blatten", "Blatten Village", "chalet", q1, 55, -30)),
        fix(place("stellisee", "Stellisee Lookout", "chalet", late2, 75, -35)),
      ];
    case "rio-coast-circuit":
      return [
        fix(place("cristo", "Christ the Redeemer", "cristo", mid, 125, 0)),
        fix(place("sugarloaf", "Sugarloaf", "sugarloaf", late, 115, 25)),
        fix(place("copacabana-palace", "Copacabana Palace", "art-deco", q1, 70, 0)),
        fix(place("ipanema-light", "Ipanema Light", "lighthouse", early, 55, 10)),
        fix(place("maracana", "Maracana", "torus-museum", late2, 100, -20)),
        fix(place("dois-irmaos", "Dois Irmaos", "sugarloaf", q3, 110, 15)),
        fix(place("arpoador", "Arpoador Rock", "sugarloaf", mid, -90, 30)),
        fix(place("bondinho", "Bondinho Station", "chalet", q1, -65, 0)),
        fix(place("fort", "Copacabana Fort", "ziggurat", early, 60, -15)),
        fix(place("gavea", "Pedra da Gavea", "sugarloaf", late2, 130, 20)),
        fix(place("corcovado", "Corcovado Peak", "sugarloaf", mid, 120, -40)),
        fix(place("leblon", "Leblon Tower", "glass-slab", q3, -75, 20)),
        fix(place("botafogo", "Botafogo Bay Club", "art-deco", late, 70, -30)),
        fix(place("uirapuru", "Urca Cable", "cable-pylon", early, -55, 25)),
        fix(place("flamengo", "Flamengo Park Light", "lighthouse", late2, 65, 10)),
        fix(place("lapa", "Lapa Arches", "pylon-gate", mid, 60, 50)),
        fix(place("selaron", "Selaron Steps", "copper-steps", q1, 55, 35)),
        fix(place("niteroi", "Niteroi Museum", "torus-museum", late, -80, 40)),
        fix(place("barco", "Barra Lighthouse", "lighthouse", late2, -70, -25)),
        fix(place("pontal", "Pontal Rock", "sugarloaf", early, 90, 40)),
      ];
    default:
      return [];
  }
}

async function main() {
  const root = process.cwd();
  const srcDir = path.join(root, "public", "routes");
  const outDir = path.join(root, "nextgen", "unreal", "export");
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "circuits"), { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => f.endsWith(".json"));
  const circuits: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(srcDir, file), "utf8")) as RouteJson;
    const sampled = sampleRoad(
      (raw.roadPoints ?? []).map((p) => ({
        x: p.x,
        y: p.y ?? 0,
        z: p.z,
        width: p.width,
        banking: 0,
        surfaceType: "asphalt" as const,
      })),
      8,
    );
    const points = sampled.map((s, i) => {
      const ue = toUnreal(s.position.x, s.position.y, s.position.z);
      return {
        index: i,
        x: Number(ue.x.toFixed(2)),
        y: Number(ue.y.toFixed(2)),
        z: Number(ue.z.toFixed(2)),
        widthCm: Number((s.width * CM).toFixed(2)),
      };
    });
    const named = (raw.buildings ?? [])
      .filter((b) => b.name)
      .map((b) => {
        const cx =
          b.footprint.reduce((s, p) => s + p.x, 0) / Math.max(1, b.footprint.length);
        const cz =
          b.footprint.reduce((s, p) => s + p.z, 0) / Math.max(1, b.footprint.length);
        const cy =
          b.footprint.reduce((s, p) => s + (p.y ?? 0), 0) /
          Math.max(1, b.footprint.length);
        const xs = b.footprint.map((p) => p.x);
        const zs = b.footprint.map((p) => p.z);
        const widthM = Math.max(4, Math.max(...xs) - Math.min(...xs));
        const depthM = Math.max(4, Math.max(...zs) - Math.min(...zs));
        const ue = toUnreal(cx, cy, cz);
        const id = b.name ? getLandmarkIdentity(b.name, b.height) : null;
        const colorHex = b.facadeColor ?? id?.color ?? "#8a7860";
        const accentHex = id?.accent ?? "#d4c4a8";
        return {
          name: b.name,
          heightCm: Number((b.height * CM).toFixed(1)),
          widthCm: Number((widthM * CM).toFixed(1)),
          depthCm: Number((depthM * CM).toFixed(1)),
          x: Number(ue.x.toFixed(1)),
          y: Number(ue.y.toFixed(1)),
          z: Number(ue.z.toFixed(1)),
          style: b.style ?? "",
          facade: b.facadeMaterial ?? "brick",
          roof: b.roofType ?? "flat",
          floors: b.floors ?? Math.max(1, Math.round(b.height / 3.2)),
          color: hexToRgb01(colorHex),
          accent: hexToRgb01(accentHex),
          colorHex,
          accentHex,
        };
      });

    // Unnamed massing — keep style/size for HD city fill (capped later in UE)
    const massing = (raw.buildings ?? [])
      .filter((b) => !b.name)
      .map((b, i) => {
        const cx =
          b.footprint.reduce((s, p) => s + p.x, 0) / Math.max(1, b.footprint.length);
        const cz =
          b.footprint.reduce((s, p) => s + p.z, 0) / Math.max(1, b.footprint.length);
        const cy =
          b.footprint.reduce((s, p) => s + (p.y ?? 0), 0) /
          Math.max(1, b.footprint.length);
        const xs = b.footprint.map((p) => p.x);
        const zs = b.footprint.map((p) => p.z);
        const widthM = Math.max(4, Math.max(...xs) - Math.min(...xs));
        const depthM = Math.max(4, Math.max(...zs) - Math.min(...zs));
        const ue = toUnreal(cx, cy, cz);
        return {
          index: i,
          heightCm: Number((b.height * CM).toFixed(1)),
          widthCm: Number((widthM * CM).toFixed(1)),
          depthCm: Number((depthM * CM).toFixed(1)),
          x: Number(ue.x.toFixed(1)),
          y: Number(ue.y.toFixed(1)),
          z: Number(ue.z.toFixed(1)),
          style: b.style ?? "london_terrace",
          facade: b.facadeMaterial ?? "brick",
          roof: b.roofType ?? "flat",
        };
      });

    const barriers = buildTrackBarriers(sampled).map((b, i) => {
      const ue = toUnreal(b.pos[0], b.pos[1], b.pos[2]);
      return {
        index: i,
        x: Number(ue.x.toFixed(1)),
        y: Number(ue.y.toFixed(1)),
        z: Number(ue.z.toFixed(1)),
        yawDeg: Number(((b.rot[1] * 180) / Math.PI).toFixed(2)),
        lengthCm: Number((b.hl * 2 * CM).toFixed(1)),
        stripe: b.stripe,
      };
    });

    const signs = buildTurnSigns(sampled).map((s, i) => {
      const ue = toUnreal(s.position[0], s.position[1], s.position[2]);
      return {
        index: i,
        x: Number(ue.x.toFixed(1)),
        y: Number(ue.y.toFixed(1)),
        z: Number(ue.z.toFixed(1)),
        yawDeg: Number(((s.yaw * 180) / Math.PI).toFixed(2)),
        turn: s.turn,
        severity: s.severity,
        metres: s.metres,
        label: `${s.metres} ${s.turn < 0 ? "LEFT" : "RIGHT"}`,
      };
    });

    const scenery = (raw.sceneryObjects ?? []).map((s, i) => {
      const ue = toUnreal(s.position.x, s.position.y, s.position.z);
      return {
        index: i,
        type: s.type,
        x: Number(ue.x.toFixed(1)),
        y: Number(ue.y.toFixed(1)),
        z: Number(ue.z.toFixed(1)),
        yawDeg: Number((((s.rotation ?? 0) * 180) / Math.PI).toFixed(2)),
        scale: s.scale ?? 1,
      };
    });

    const startSrc = raw.startPosition ?? raw.roadPoints?.[0] ?? { x: 0, y: 0, z: 0 };
    const startUe = toUnreal(startSrc.x, startSrc.y ?? 0, startSrc.z);
    // Web yaw is around Y; map to Unreal yaw around Z from first tangent
    let startYawDeg = 0;
    if (sampled.length >= 2) {
      const t = sampled[0].tangent;
      // Three.js tangent in XZ → UE forward is X from z, Y from x
      startYawDeg = (Math.atan2(t.x, t.z) * 180) / Math.PI;
    }

    // Full unique set (30/circuit) — was capped at 12; user wants 200+ landmarks
    const unique = circuitLandmarksFor(raw.slug).map((u, i) => ({
      index: i,
      name: u.name,
      kind: u.kind,
      heightCm: Number((Math.min(u.height, 120) * CM).toFixed(1)),
      colorHex: u.color,
      accentHex: u.accent,
      color: hexToRgb01(u.color),
      accent: hexToRgb01(u.accent),
    }));

    const routeHeroes = cityHeroes(raw.slug, sampled);

    const payload = {
      slug: raw.slug,
      name: raw.name,
      city: raw.city ?? "",
      country: raw.country ?? "",
      wgs84: { latitude: raw.latitude ?? 0, longitude: raw.longitude ?? 0 },
      distanceMetres: raw.distanceMetres ?? 0,
      units: "unreal-centimetres",
      axis: "X-forward Y-right Z-up from Three.js metres Y-up",
      start: {
        x: Number(startUe.x.toFixed(2)),
        y: Number(startUe.y.toFixed(2)),
        z: Number(startUe.z.toFixed(2)),
        yawDeg: Number(startYawDeg.toFixed(2)),
      },
      splinePoints: points,
      checkpoints: (raw.checkpoints ?? []).map((c) => {
        const ue = toUnreal(c.position.x, c.position.y, c.position.z);
        return {
          index: c.index,
          x: Number(ue.x.toFixed(2)),
          y: Number(ue.y.toFixed(2)),
          z: Number(ue.z.toFixed(2)),
          widthCm: Number((c.width * CM).toFixed(2)),
        };
      }),
      namedLandmarks: named,
      massing,
      barriers,
      signs,
      scenery,
      uniqueLandmarks: unique,
      routeHeroes,
      caps: { streetFillMax: 160, uniqueLandmarksMax: 90, namedPriority: true, heroesMax: 30, skylineMax: 72 },
    };

    await writeFile(
      path.join(outDir, "circuits", `${raw.slug}.json`),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
    const csv = [
      "index,x,y,z,widthCm",
      ...points.map((p) => `${p.index},${p.x},${p.y},${p.z},${p.widthCm}`),
    ].join("\n");
    await writeFile(path.join(outDir, "circuits", `${raw.slug}.csv`), `${csv}\n`, "utf8");
    circuits.push({
      slug: raw.slug,
      name: raw.name,
      city: raw.city,
      splineCount: points.length,
      namedLandmarks: named.length,
      massing: massing.length,
      barriers: barriers.length,
      signs: signs.length,
      scenery: scenery.length,
      routeHeroes: routeHeroes.length,
      csv: `circuits/${raw.slug}.csv`,
      json: `circuits/${raw.slug}.json`,
    });
    console.log(
      `${raw.slug}: ${points.length} spline, ${named.length} named, ${barriers.length} barriers, ${signs.length} signs, ${scenery.length} scenery, ${routeHeroes.length} heroes`,
    );
  }

  const vehicles = VEHICLE_LIST.map((v) => ({
    id: v.id,
    name: v.name,
    tagline: v.tagline,
    massKg: v.mass,
    stats: v.stats,
    tuning: v.tuning,
    colliderCm: {
      halfWidth: v.collider.halfWidth * CM,
      halfHeight: v.collider.halfHeight * CM,
      halfLength: v.collider.halfLength * CM,
      offsetZ: v.collider.offsetY * CM,
    },
    paint: v.paint,
  }));

  const chaosVehicles = VEHICLE_LIST.map((v) => {
    const wheelRadiusM = Math.max(0.22, v.collider.halfHeight * 0.72);
    const maxSpeedMs = GAME_CONSTANTS.maxSpeedMs * v.tuning.maxSpeedMul;
    const peakAccel = GAME_CONSTANTS.accelerationMs2 * v.tuning.accelMul;
    const peakBrake = GAME_CONSTANTS.brakeMs2 * v.tuning.brakeMul;
    return {
      id: v.id,
      name: v.name,
      fairness: "class-locked; cosmetics must not edit these numbers",
      massKg: v.mass,
      maxSpeedKmh: Number((maxSpeedMs * 3.6).toFixed(1)),
      maxEngineTorqueNm: Number((v.mass * peakAccel * wheelRadiusM).toFixed(1)),
      brakeTorqueNm: Number((v.mass * peakBrake * wheelRadiusM).toFixed(1)),
      maxSteerAngleDeg: Number(
        (GAME_CONSTANTS.steeringAngleLowSpeedDegrees * v.tuning.steerMul).toFixed(1),
      ),
      highSpeedSteerAngleDeg: Number(
        (GAME_CONSTANTS.steeringAngleHighSpeedDegrees * v.tuning.steerMul).toFixed(1),
      ),
      lateralFriction: Number((3.2 * v.tuning.gripMul).toFixed(3)),
      dragCoefficient: Number((0.28 / v.tuning.maxSpeedMul).toFixed(3)),
      downforceKg: Number((18 * v.tuning.gripMul).toFixed(1)),
      wheelRadiusCm: Number((wheelRadiusM * CM).toFixed(1)),
      chassisCm: {
        width: Number((v.collider.halfWidth * 2 * CM).toFixed(1)),
        height: Number((v.collider.halfHeight * 2 * CM).toFixed(1)),
        length: Number((v.collider.halfLength * 2 * CM).toFixed(1)),
      },
      defaultPaint: v.paint,
    };
  });

  await writeFile(
    path.join(outDir, "vehicles.json"),
    `${JSON.stringify({ classes: vehicles, cosmeticsCount: COSMETICS.length }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "chaos-vehicles.json"),
    `${JSON.stringify(
      {
        note: "Apply to Chaos Vehicle Movement only. Never bind cosmetics to torque/grip.",
        classes: chaosVehicles,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "cosmetics-visual-only.json"),
    `${JSON.stringify(
      {
        fairness: "visual only — do not change Chaos mass, torque, friction, or steer",
        items: COSMETICS.map((c) => ({
          id: c.id,
          vehicleId: c.vehicleId,
          slot: c.slot,
          name: c.name,
          rarity: c.rarity,
          paint: c.paint ?? null,
          bumper: c.bumper ?? null,
          wing: c.wing ?? null,
          kit: c.kit ?? null,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "drive-constants.json"),
    `${JSON.stringify(GAME_CONSTANTS, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        source: "driveanywhere-web",
        target: "unreal-engine-5",
        fairness: {
          classesDiffer: true,
          sameClassEqual: true,
          cosmeticsNeverChangePace: true,
          oneRaceOneCar: true,
          hostSetsOnlineGrid: true,
        },
        circuits,
        vehicleIds: Object.keys(VEHICLES),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
