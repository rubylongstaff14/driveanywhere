import type { PlayerStats } from "./achievements";

export type ChallengeMetric =
  | Exclude<keyof PlayerStats, "mapsRaced">
  | "races_today"
  | "wins_today";

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "daily" | "weekly";
  coinReward: number;
  xpReward: number;
  target: number;
  metric: ChallengeMetric;
}

// ── Seeded random helpers ────────────────────────────────────────────────────

/** Linear Congruential Generator — returns [0, 1) deterministically. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

function seededPick<T>(pool: T[], seed: number, count: number): T[] {
  const rand = lcg(seed);
  const available = [...pool];
  const result: T[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rand() * available.length);
    result.push(available.splice(idx, 1)[0]);
  }
  return result;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Returns the UTC date integer (days since epoch) for deterministic daily seeding. */
function utcDaySeed(date: Date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/** Returns an ISO week string e.g. "2026-W34". */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns the UTC ISO date string "YYYY-MM-DD" for the given date. */
export function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// ── Daily challenge pool (20+ types) ─────────────────────────────────────────

const DAILY_POOL: ChallengeDef[] = [
  {
    id: "d_races_3",
    title: "Triple Header",
    description: "Complete 3 races today.",
    icon: "🏁",
    type: "daily",
    coinReward: 60,
    xpReward: 30,
    target: 3,
    metric: "races_today",
  },
  {
    id: "d_races_5",
    title: "Busy Day",
    description: "Complete 5 races today.",
    icon: "🚦",
    type: "daily",
    coinReward: 90,
    xpReward: 45,
    target: 5,
    metric: "races_today",
  },
  {
    id: "d_win_1",
    title: "Daily Win",
    description: "Win 1 race today.",
    icon: "🥇",
    type: "daily",
    coinReward: 80,
    xpReward: 40,
    target: 1,
    metric: "wins_today",
  },
  {
    id: "d_win_3",
    title: "Hat-Trick",
    description: "Win 3 races today.",
    icon: "🏆",
    type: "daily",
    coinReward: 150,
    xpReward: 75,
    target: 3,
    metric: "wins_today",
  },
  {
    id: "d_drift_30",
    title: "Slide Session",
    description: "Drift for 30 seconds total today.",
    icon: "💨",
    type: "daily",
    coinReward: 70,
    xpReward: 35,
    target: 30,
    metric: "driftSeconds",
  },
  {
    id: "d_drift_60",
    title: "Drift Marathon",
    description: "Drift for 60 seconds total today.",
    icon: "🌪️",
    type: "daily",
    coinReward: 100,
    xpReward: 50,
    target: 60,
    metric: "driftSeconds",
  },
  {
    id: "d_turbo_10",
    title: "Boost It",
    description: "Use turbo boost 10 times today.",
    icon: "🚀",
    type: "daily",
    coinReward: 60,
    xpReward: 30,
    target: 10,
    metric: "turboBursts",
  },
  {
    id: "d_turbo_20",
    title: "Turbo Junkie",
    description: "Use turbo boost 20 times today.",
    icon: "🔥",
    type: "daily",
    coinReward: 90,
    xpReward: 45,
    target: 20,
    metric: "turboBursts",
  },
  {
    id: "d_online_2",
    title: "Online Session",
    description: "Complete 2 online races today.",
    icon: "🌐",
    type: "daily",
    coinReward: 80,
    xpReward: 40,
    target: 2,
    metric: "onlineRaces",
  },
  {
    id: "d_pb_1",
    title: "Beat Yourself",
    description: "Set 1 personal best today.",
    icon: "⏱️",
    type: "daily",
    coinReward: 80,
    xpReward: 40,
    target: 1,
    metric: "personalBests",
  },
  {
    id: "d_clean_2",
    title: "Smooth Operator",
    description: "Complete 2 clean laps without hitting barriers.",
    icon: "✨",
    type: "daily",
    coinReward: 90,
    xpReward: 45,
    target: 2,
    metric: "cleanLaps",
  },
  {
    id: "d_taunt_5",
    title: "Talk the Talk",
    description: "Use 5 taunts today.",
    icon: "💬",
    type: "daily",
    coinReward: 50,
    xpReward: 25,
    target: 5,
    metric: "tauntsUsed",
  },
  {
    id: "d_speed_180",
    title: "Speed Run",
    description: "Reach 180 km/h in a race.",
    icon: "⚡",
    type: "daily",
    coinReward: 60,
    xpReward: 30,
    target: 180,
    metric: "topSpeedKph",
  },
  {
    id: "d_speed_200",
    title: "Two Hundred",
    description: "Reach 200 km/h in a race.",
    icon: "💥",
    type: "daily",
    coinReward: 80,
    xpReward: 40,
    target: 200,
    metric: "topSpeedKph",
  },
  {
    id: "d_distance_10",
    title: "Daily Miles",
    description: "Drive 10 km today.",
    icon: "🛤️",
    type: "daily",
    coinReward: 70,
    xpReward: 35,
    target: 10,
    metric: "totalDistanceKm",
  },
  {
    id: "d_distance_20",
    title: "Long Drive",
    description: "Drive 20 km today.",
    icon: "🌄",
    type: "daily",
    coinReward: 100,
    xpReward: 50,
    target: 20,
    metric: "totalDistanceKm",
  },
  {
    id: "d_crate_1",
    title: "Unbox Day",
    description: "Open 1 crate today.",
    icon: "📦",
    type: "daily",
    coinReward: 60,
    xpReward: 30,
    target: 1,
    metric: "cratesOpened",
  },
  {
    id: "d_online_win_1",
    title: "Online Trophy",
    description: "Win 1 online race today.",
    icon: "🎮",
    type: "daily",
    coinReward: 120,
    xpReward: 60,
    target: 1,
    metric: "onlineWins",
  },
  {
    id: "d_races_7",
    title: "Full Day",
    description: "Complete 7 races today.",
    icon: "🗓️",
    type: "daily",
    coinReward: 120,
    xpReward: 60,
    target: 7,
    metric: "races_today",
  },
  {
    id: "d_drift_90",
    title: "Sideways King",
    description: "Drift for 90 seconds total today.",
    icon: "🌀",
    type: "daily",
    coinReward: 130,
    xpReward: 65,
    target: 90,
    metric: "driftSeconds",
  },
  {
    id: "d_taunt_10",
    title: "Hype Machine",
    description: "Use 10 taunts today.",
    icon: "📢",
    type: "daily",
    coinReward: 80,
    xpReward: 40,
    target: 10,
    metric: "tauntsUsed",
  },
  {
    id: "d_clean_4",
    title: "Barrier Dodger",
    description: "Complete 4 clean laps without hitting barriers.",
    icon: "🎯",
    type: "daily",
    coinReward: 120,
    xpReward: 60,
    target: 4,
    metric: "cleanLaps",
  },
];

// ── Weekly challenge pool (10+ types) ────────────────────────────────────────

const WEEKLY_POOL: ChallengeDef[] = [
  {
    id: "w_races_20",
    title: "Week Grind",
    description: "Complete 20 races this week.",
    icon: "🏎️",
    type: "weekly",
    coinReward: 400,
    xpReward: 200,
    target: 20,
    metric: "racesCompleted",
  },
  {
    id: "w_wins_10",
    title: "Weekly Champion",
    description: "Win 10 races this week.",
    icon: "🏆",
    type: "weekly",
    coinReward: 600,
    xpReward: 300,
    target: 10,
    metric: "racesWon",
  },
  {
    id: "w_drift_300",
    title: "Drift Week",
    description: "Drift for 300 seconds this week.",
    icon: "💨",
    type: "weekly",
    coinReward: 500,
    xpReward: 250,
    target: 300,
    metric: "driftSeconds",
  },
  {
    id: "w_online_10",
    title: "Online Regular",
    description: "Complete 10 online races this week.",
    icon: "🌐",
    type: "weekly",
    coinReward: 450,
    xpReward: 225,
    target: 10,
    metric: "onlineRaces",
  },
  {
    id: "w_online_wins_5",
    title: "Online Dominator",
    description: "Win 5 online races this week.",
    icon: "🌟",
    type: "weekly",
    coinReward: 600,
    xpReward: 300,
    target: 5,
    metric: "onlineWins",
  },
  {
    id: "w_pb_5",
    title: "Benchmark Week",
    description: "Set 5 personal bests this week.",
    icon: "⏱️",
    type: "weekly",
    coinReward: 500,
    xpReward: 250,
    target: 5,
    metric: "personalBests",
  },
  {
    id: "w_clean_10",
    title: "Flawless Week",
    description: "Complete 10 clean laps this week.",
    icon: "✨",
    type: "weekly",
    coinReward: 550,
    xpReward: 275,
    target: 10,
    metric: "cleanLaps",
  },
  {
    id: "w_turbo_50",
    title: "Turbo Week",
    description: "Use turbo boost 50 times this week.",
    icon: "🚀",
    type: "weekly",
    coinReward: 400,
    xpReward: 200,
    target: 50,
    metric: "turboBursts",
  },
  {
    id: "w_distance_80",
    title: "Road Trip",
    description: "Drive 80 km this week.",
    icon: "🛤️",
    type: "weekly",
    coinReward: 450,
    xpReward: 225,
    target: 80,
    metric: "totalDistanceKm",
  },
  {
    id: "w_taunts_25",
    title: "Social Week",
    description: "Use 25 taunts this week.",
    icon: "💬",
    type: "weekly",
    coinReward: 350,
    xpReward: 175,
    target: 25,
    metric: "tauntsUsed",
  },
  {
    id: "w_crates_5",
    title: "Crate Week",
    description: "Open 5 crates this week.",
    icon: "📦",
    type: "weekly",
    coinReward: 400,
    xpReward: 200,
    target: 5,
    metric: "cratesOpened",
  },
  {
    id: "w_races_35",
    title: "Full Throttle Week",
    description: "Complete 35 races this week.",
    icon: "🔥",
    type: "weekly",
    coinReward: 700,
    xpReward: 350,
    target: 35,
    metric: "racesCompleted",
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns today's 3 daily challenges, deterministic by UTC date.
 * All players worldwide receive the same challenges each day.
 */
export function getDailyChallenges(date: Date = new Date()): ChallengeDef[] {
  const seed = utcDaySeed(date);
  return seededPick(DAILY_POOL, seed, 3);
}

/**
 * Returns this week's 3 weekly challenges, deterministic by ISO week number.
 * Resets every Monday at midnight UTC.
 */
export function getWeeklyChallenges(date: Date = new Date()): ChallengeDef[] {
  const weekStr = getISOWeekString(date);
  let seed = 0;
  for (let i = 0; i < weekStr.length; i++) {
    seed = (seed * 31 + weekStr.charCodeAt(i)) | 0;
  }
  return seededPick(WEEKLY_POOL, seed, 3);
}

export { DAILY_POOL, WEEKLY_POOL };
