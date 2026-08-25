// Weekly Leaderboard + Hall of Fame — deterministic seeded mock data

export interface WeeklyEntry {
  rank: number;
  displayName: string;
  timeMs: number;
  mapSlug: string;
  isPlayer: boolean;
  isGuest: boolean;
}

export interface HallOfFameEntry {
  rank: number;
  displayName: string;
  timeMs: number;
  mapSlug: string;
  setAt: string;
  country: string;
}

// Map slugs in consistent order
const MAP_SLUGS = [
  "westminster-sprint",
  "embankment-run",
  "canary-wharf-loop",
  "dubai-marina-circuit",
  "egypt-pyramids",
  "new-york-harbor-circuit",
  "tokyo-drift-circuit",
  "alps-mountain-pass",
  "rio-coast-circuit",
] as const;

// Representative base times per map in ms (similar to bestTimeMs in mock routes)
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

const MOCK_NAMES = [
  "RiverFox",
  "ThamesPilot",
  "EmberLane",
  "DocksideDev",
  "WharfWhisper",
  "DesertFox",
  "SphinxRunner",
  "NeonDrifter",
  "AlpineAce",
  "HarborKing",
  "TurboSam",
  "QuicksilverQ",
  "UrbanLynx",
  "SkylineGhost",
  "ApexHunter",
  "CanyonRacer",
  "MidnightPilot",
  "StreetSerpent",
  "DriftMaster",
  "CoastRider",
];

const WEEKLY_PRIZES = [
  { label: "£20 Steam Gift Card", value: "£20", sponsor: "Steam" },
  { label: "£15 Amazon Gift Card", value: "£15", sponsor: "Amazon" },
  { label: "£25 GAME Voucher", value: "£25", sponsor: "GAME" },
  { label: "Founder Pack + 5,000 Coins", value: "5000 coins", sponsor: "OpenRace" },
  { label: "£10 PayPal Cash", value: "£10", sponsor: "PayPal" },
];

// Simple LCG for seeded pseudo-random
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Returns current ISO week string e.g. "2026-W34"
export function getCurrentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getUTCFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const daysDiff = Math.floor(
    (now.getTime() - startOfWeek1.getTime()) / (1000 * 60 * 60 * 24),
  );
  const week = Math.floor(daysDiff / 7) + 1;
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Returns ms until next Monday midnight UTC
export function msUntilWeekReset(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
      0,
    ),
  );
  return nextMonday.getTime() - now.getTime();
}

function weekSeed(week: string): number {
  let h = 5381;
  for (let i = 0; i < week.length; i++) {
    h = ((h << 5) + h + week.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mapIndex(mapSlug: string): number {
  const idx = MAP_SLUGS.indexOf(mapSlug as (typeof MAP_SLUGS)[number]);
  return idx >= 0 ? idx : 0;
}

// Returns seeded mock weekly entries for a map (top 20 times)
export function getWeeklyEntries(
  mapSlug: string,
  playerBestMs: number | null,
): WeeklyEntry[] {
  const week = getCurrentWeek();
  const seed = weekSeed(week + mapSlug);
  const rand = lcg(seed);
  const base = MAP_BASE_TIMES[mapSlug] ?? 120000;

  const entries: WeeklyEntry[] = [];

  for (let i = 0; i < 19; i++) {
    // Spread: top time ~3% below base, last ~18% above base
    const spread = 0.03 + (i / 19) * 0.15;
    const jitter = (rand() - 0.5) * 0.02;
    const timeMs = Math.round(base * (1 - 0.18 + spread + jitter));
    entries.push({
      rank: i + 1,
      displayName: MOCK_NAMES[i % MOCK_NAMES.length],
      timeMs,
      mapSlug,
      isPlayer: false,
      isGuest: i % 7 === 0,
    });
  }

  // Sort by time
  entries.sort((a, b) => a.timeMs - b.timeMs);

  // Insert player if they have a time
  if (playerBestMs !== null) {
    const playerEntry: WeeklyEntry = {
      rank: 0,
      displayName: "You",
      timeMs: playerBestMs,
      mapSlug,
      isPlayer: true,
      isGuest: false,
    };

    // Find insertion position
    let insertAt = entries.length;
    for (let i = 0; i < entries.length; i++) {
      if (playerBestMs < entries[i].timeMs) {
        insertAt = i;
        break;
      }
    }
    entries.splice(insertAt, 0, playerEntry);
  }

  // Assign ranks and return top 20
  return entries.slice(0, 20).map((e, i) => ({ ...e, rank: i + 1 }));
}

// Static Hall of Fame entries
const HOF_DATA: Omit<HallOfFameEntry, "rank">[] = [
  { displayName: "RiverFox", timeMs: 118400, mapSlug: "westminster-sprint", setAt: "2026-03-15", country: "🇬🇧" },
  { displayName: "EmberLane", timeMs: 105200, mapSlug: "embankment-run", setAt: "2026-04-02", country: "🇩🇪" },
  { displayName: "NeonDrifter", timeMs: 99800, mapSlug: "tokyo-drift-circuit", setAt: "2026-05-18", country: "🇯🇵" },
  { displayName: "DesertFox", timeMs: 135600, mapSlug: "egypt-pyramids", setAt: "2026-06-01", country: "🇪🇬" },
  { displayName: "HarborKing", timeMs: 86200, mapSlug: "new-york-harbor-circuit", setAt: "2026-06-20", country: "🇺🇸" },
  { displayName: "AlpineAce", timeMs: 139400, mapSlug: "alps-mountain-pass", setAt: "2026-07-04", country: "🇨🇭" },
  { displayName: "CoastRider", timeMs: 119800, mapSlug: "rio-coast-circuit", setAt: "2026-07-19", country: "🇧🇷" },
  { displayName: "DocksideDev", timeMs: 101200, mapSlug: "canary-wharf-loop", setAt: "2026-07-28", country: "🇬🇧" },
  { displayName: "MidnightPilot", timeMs: 91400, mapSlug: "dubai-marina-circuit", setAt: "2026-08-08", country: "🇦🇪" },
  { displayName: "StreetSerpent", timeMs: 103600, mapSlug: "canary-wharf-loop", setAt: "2026-08-12", country: "🇫🇷" },
];

export function getHallOfFame(): HallOfFameEntry[] {
  return HOF_DATA.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// Prize for current week's competition (cycles through list)
export function getWeeklyPrize(): { label: string; value: string; sponsor: string } {
  const week = getCurrentWeek();
  const weekNum = parseInt(week.split("-W")[1] ?? "1", 10);
  return WEEKLY_PRIZES[weekNum % WEEKLY_PRIZES.length];
}

// Past week prize history (last 4 weeks)
export function getPrizeHistory(): {
  week: string;
  prize: { label: string; value: string; sponsor: string };
  winner: string;
  country: string;
}[] {
  const now = new Date();
  const result = [];
  for (let i = 1; i <= 4; i++) {
    const past = new Date(now);
    past.setUTCDate(now.getUTCDate() - i * 7);
    const jan4 = new Date(past.getUTCFullYear(), 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const daysDiff = Math.floor(
      (past.getTime() - startOfWeek1.getTime()) / (1000 * 60 * 60 * 24),
    );
    const week = Math.floor(daysDiff / 7) + 1;
    const weekStr = `${past.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    const weekNum = parseInt(weekStr.split("-W")[1] ?? "1", 10);
    const prize = WEEKLY_PRIZES[weekNum % WEEKLY_PRIZES.length];
    const winners = ["ThamesPilot 🇬🇧", "SphinxRunner 🇪🇬", "QuicksilverQ 🇺🇸", "TurboSam 🇩🇪"];
    const countries = ["🇬🇧", "🇪🇬", "🇺🇸", "🇩🇪"];
    const winnerNames = ["ThamesPilot", "SphinxRunner", "QuicksilverQ", "TurboSam"];
    result.push({
      week: weekStr,
      prize,
      winner: winnerNames[(i - 1) % winnerNames.length],
      country: countries[(i - 1) % countries.length],
    });
  }
  return result;
}

// Map slug to display name
export const MAP_NAMES: Record<string, string> = {
  "westminster-sprint": "Westminster Sprint",
  "embankment-run": "Embankment Run",
  "canary-wharf-loop": "Canary Wharf Circuit",
  "dubai-marina-circuit": "Dubai Marina Circuit",
  "egypt-pyramids": "Giza Desert Circuit",
  "new-york-harbor-circuit": "New York Harbor Circuit",
  "tokyo-drift-circuit": "Tokyo Drift Circuit",
  "alps-mountain-pass": "Alps Mountain Pass",
  "rio-coast-circuit": "Rio Coast Circuit",
};
