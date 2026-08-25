// Daily Hot Lap — one attempt only, seeded mock leaderboard

const STORAGE_KEY = "driveanywhere:hotlap:v1";

export interface HotLapEntry {
  date: string;
  mapSlug: string;
  mapName: string;
  playerTimeMs: number | null;
  rank: number | null;
  totalEntrants: number;
  topTimeMs: number;
  attempted: boolean;
  locked: boolean;
}

interface StoredHotLap {
  date: string;
  mapSlug: string;
  timeMs: number;
}

const MAP_ROTATION = [
  { slug: "westminster-sprint", name: "Westminster Sprint" },
  { slug: "embankment-run", name: "Embankment Run" },
  { slug: "canary-wharf-loop", name: "Canary Wharf Circuit" },
  { slug: "dubai-marina-circuit", name: "Dubai Marina Circuit" },
  { slug: "egypt-pyramids", name: "Giza Desert Circuit" },
  { slug: "new-york-harbor-circuit", name: "New York Harbor Circuit" },
  { slug: "tokyo-drift-circuit", name: "Tokyo Drift Circuit" },
  { slug: "alps-mountain-pass", name: "Alps Mountain Pass" },
  { slug: "rio-coast-circuit", name: "Rio Coast Circuit" },
];

// Base times per map in ms
const MAP_BASE_TIMES: Record<string, number> = {
  "westminster-sprint": 121000,
  "embankment-run": 109000,
  "canary-wharf-loop": 105000,
  "dubai-marina-circuit": 95000,
  "egypt-pyramids": 140000,
  "new-york-harbor-circuit": 89000,
  "tokyo-drift-circuit": 102000,
  "alps-mountain-pass": 143000,
  "rio-coast-circuit": 122000,
};

// Simple LCG seeded random
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function dateSeed(date: string): number {
  let h = 5381;
  for (let i = 0; i < date.length; i++) {
    h = ((h << 5) + h + date.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Today's featured map (deterministic by date, cycles through all 9)
export function getTodaysHotLapMap(): { slug: string; name: string } {
  const date = getTodayUTC();
  const seed = dateSeed(date);
  const idx = seed % MAP_ROTATION.length;
  return MAP_ROTATION[idx];
}

function getDateSeedForDay(date: string): number {
  return dateSeed(date);
}

function getMockTopTime(mapSlug: string, date: string): number {
  const base = MAP_BASE_TIMES[mapSlug] ?? 120000;
  const rand = lcg(getDateSeedForDay(date + mapSlug));
  // Top time is 2-4% below base
  return Math.round(base * (0.96 + rand() * 0.02));
}

// Simulates realistic entrant count growing over the day
function getEntrantCount(date: string): number {
  const now = new Date();
  const today = getTodayUTC();
  if (date !== today) return 847 + (dateSeed(date) % 200);
  const hourUTC = now.getUTCHours();
  const base = 50 + hourUTC * 35;
  return Math.min(base + (dateSeed(date) % 30), 900);
}

function readStored(): StoredHotLap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredHotLap;
  } catch {
    return null;
  }
}

function writeStored(data: StoredHotLap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Get the player's hot lap state for today
export function getHotLapState(): HotLapEntry {
  const today = getTodayUTC();
  const { slug, name } = getTodaysHotLapMap();
  const topTimeMs = getMockTopTime(slug, today);
  const totalEntrants = getEntrantCount(today);

  const stored = readStored();
  const locked = stored !== null && stored.date === today;

  if (locked && stored) {
    // Calculate player's rank among mock entries
    const base = MAP_BASE_TIMES[slug] ?? 120000;
    const rand = lcg(dateSeed(today + slug + "rank"));
    let betterCount = 0;
    for (let i = 0; i < totalEntrants - 1; i++) {
      const spread = 0.03 + (i / (totalEntrants - 1)) * 0.15;
      const jitter = (rand() - 0.5) * 0.02;
      const mockTime = Math.round(base * (1 - 0.18 + spread + jitter));
      if (mockTime < stored.timeMs) betterCount++;
    }
    const rank = betterCount + 1;
    return {
      date: today,
      mapSlug: slug,
      mapName: name,
      playerTimeMs: stored.timeMs,
      rank,
      totalEntrants,
      topTimeMs,
      attempted: true,
      locked: true,
    };
  }

  return {
    date: today,
    mapSlug: slug,
    mapName: name,
    playerTimeMs: null,
    rank: null,
    totalEntrants,
    topTimeMs,
    attempted: false,
    locked: false,
  };
}

// After player finishes: lock in their time and return result
export function submitHotLapTime(timeMs: number): {
  rank: number;
  totalEntrants: number;
  coinsAwarded: number;
} {
  const today = getTodayUTC();
  const { slug } = getTodaysHotLapMap();
  const totalEntrants = getEntrantCount(today);

  writeStored({ date: today, mapSlug: slug, timeMs });

  // Calculate rank
  const base = MAP_BASE_TIMES[slug] ?? 120000;
  const rand = lcg(dateSeed(today + slug + "rank"));
  let betterCount = 0;
  for (let i = 0; i < totalEntrants - 1; i++) {
    const spread = 0.03 + (i / (totalEntrants - 1)) * 0.15;
    const jitter = (rand() - 0.5) * 0.02;
    const mockTime = Math.round(base * (1 - 0.18 + spread + jitter));
    if (mockTime < timeMs) betterCount++;
  }
  const rank = betterCount + 1;

  let coinsAwarded: number;
  if (rank === 1) coinsAwarded = 500;
  else if (rank === 2) coinsAwarded = 300;
  else if (rank === 3) coinsAwarded = 200;
  else if (rank <= 10) coinsAwarded = 100;
  else if (rank <= 50) coinsAwarded = 50;
  else coinsAwarded = 20;

  return { rank, totalEntrants, coinsAwarded };
}

// Get today's mock leaderboard (top 10 + player entry)
export interface HotLapLeaderboardEntry {
  rank: number;
  displayName: string;
  timeMs: number;
  isPlayer: boolean;
}

const HOT_LAP_NAMES = [
  "ApexHunter", "QuicksilverQ", "TurboSam", "NeonDrifter", "AlpineAce",
  "HarborKing", "CoastRider", "UrbanLynx", "SkylineGhost", "CanyonRacer",
];

export function getHotLapLeaderboard(
  mapSlug: string,
  date: string,
  playerTimeMs: number | null,
): HotLapLeaderboardEntry[] {
  const base = MAP_BASE_TIMES[mapSlug] ?? 120000;
  const rand = lcg(dateSeed(date + mapSlug + "leaderboard"));

  const entries: HotLapLeaderboardEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const spread = 0.03 + (i / 10) * 0.10;
    const jitter = (rand() - 0.5) * 0.015;
    const timeMs = Math.round(base * (1 - 0.18 + spread + jitter));
    entries.push({
      rank: i + 1,
      displayName: HOT_LAP_NAMES[i % HOT_LAP_NAMES.length],
      timeMs,
      isPlayer: false,
    });
  }

  if (playerTimeMs !== null) {
    const playerEntry: HotLapLeaderboardEntry = {
      rank: 0,
      displayName: "You",
      timeMs: playerTimeMs,
      isPlayer: true,
    };
    let insertAt = entries.length;
    for (let i = 0; i < entries.length; i++) {
      if (playerTimeMs < entries[i].timeMs) {
        insertAt = i;
        break;
      }
    }
    entries.splice(insertAt, 0, playerEntry);
    return entries.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  return entries;
}

// Historical hot laps (past 5 days)
export interface HotLapHistoryEntry {
  date: string;
  mapSlug: string;
  mapName: string;
  winnerName: string;
  winnerTimeMs: number;
}

const HISTORY_NAMES = ["RiverFox", "ThamesPilot", "DesertFox", "DocksideDev", "SphinxRunner"];

export function getHotLapHistory(): HotLapHistoryEntry[] {
  const history: HotLapHistoryEntry[] = [];
  const now = new Date();
  for (let i = 1; i <= 5; i++) {
    const past = new Date(now);
    past.setUTCDate(now.getUTCDate() - i);
    const date = past.toISOString().slice(0, 10);
    const seed = dateSeed(date);
    const map = MAP_ROTATION[seed % MAP_ROTATION.length];
    const topTime = getMockTopTime(map.slug, date);
    history.push({
      date,
      mapSlug: map.slug,
      mapName: map.name,
      winnerName: HISTORY_NAMES[(i - 1) % HISTORY_NAMES.length],
      winnerTimeMs: topTime,
    });
  }
  return history;
}

export function msUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.getTime() - now.getTime();
}
