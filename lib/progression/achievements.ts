export interface PlayerStats {
  racesCompleted: number;
  racesWon: number;
  onlineRaces: number;
  onlineWins: number;
  personalBests: number;
  totalDistanceKm: number;
  driftSeconds: number;
  topSpeedKph: number;
  turboBursts: number;
  tauntsUsed: number;
  cleanLaps: number;
  /** Route slugs the player has raced on at least once. */
  mapsRaced: Set<string>;
  currentStreak: number;
  cratesOpened: number;
  coinsSpent: number;
}

export function defaultStats(): PlayerStats {
  return {
    racesCompleted: 0,
    racesWon: 0,
    onlineRaces: 0,
    onlineWins: 0,
    personalBests: 0,
    totalDistanceKm: 0,
    driftSeconds: 0,
    topSpeedKph: 0,
    turboBursts: 0,
    tauntsUsed: 0,
    cleanLaps: 0,
    mapsRaced: new Set(),
    currentStreak: 0,
    cratesOpened: 0,
    coinsSpent: 0,
  };
}

export type AchievementCategory =
  | "racing"
  | "skills"
  | "social"
  | "collection"
  | "exploration";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinReward: number;
  xpReward: number;
  category: AchievementCategory;
  condition: (stats: PlayerStats) => boolean;
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Racing ───────────────────────────────────────────────────────────
  {
    id: "first_race",
    name: "Off the Line",
    description: "Complete your first race.",
    icon: "🏁",
    coinReward: 50,
    xpReward: 25,
    category: "racing",
    condition: (s) => s.racesCompleted >= 1,
  },
  {
    id: "races_10",
    name: "Regular Driver",
    description: "Complete 10 races.",
    icon: "🚦",
    coinReward: 100,
    xpReward: 50,
    category: "racing",
    condition: (s) => s.racesCompleted >= 10,
  },
  {
    id: "races_25",
    name: "Track Junkie",
    description: "Complete 25 races.",
    icon: "🛣️",
    coinReward: 200,
    xpReward: 100,
    category: "racing",
    condition: (s) => s.racesCompleted >= 25,
  },
  {
    id: "races_50",
    name: "Road Warrior",
    description: "Complete 50 races.",
    icon: "🏎️",
    coinReward: 350,
    xpReward: 175,
    category: "racing",
    condition: (s) => s.racesCompleted >= 50,
  },
  {
    id: "races_100",
    name: "Century Club",
    description: "Complete 100 races.",
    icon: "💯",
    coinReward: 600,
    xpReward: 300,
    category: "racing",
    condition: (s) => s.racesCompleted >= 100,
  },
  {
    id: "first_win",
    name: "First Blood",
    description: "Win your first race.",
    icon: "🥇",
    coinReward: 100,
    xpReward: 60,
    category: "racing",
    condition: (s) => s.racesWon >= 1,
  },
  {
    id: "wins_10",
    name: "Podium Regular",
    description: "Win 10 races.",
    icon: "🏆",
    coinReward: 250,
    xpReward: 125,
    category: "racing",
    condition: (s) => s.racesWon >= 10,
  },
  {
    id: "wins_50",
    name: "Champion",
    description: "Win 50 races.",
    icon: "👑",
    coinReward: 750,
    xpReward: 400,
    category: "racing",
    condition: (s) => s.racesWon >= 50,
  },
  {
    id: "wins_100",
    name: "Century Champion",
    description: "Win 100 races.",
    icon: "🦁",
    coinReward: 2000,
    xpReward: 1000,
    category: "racing",
    condition: (s) => s.racesWon >= 100,
    secret: true,
  },
  {
    id: "pb_first",
    name: "Personal Best",
    description: "Set your first personal best time.",
    icon: "⏱️",
    coinReward: 75,
    xpReward: 40,
    category: "racing",
    condition: (s) => s.personalBests >= 1,
  },
  {
    id: "pb_5",
    name: "Time Chaser",
    description: "Set 5 personal best times.",
    icon: "🕐",
    coinReward: 150,
    xpReward: 80,
    category: "racing",
    condition: (s) => s.personalBests >= 5,
  },
  {
    id: "pb_10",
    name: "Benchmark Setter",
    description: "Set 10 personal best times.",
    icon: "📊",
    coinReward: 250,
    xpReward: 150,
    category: "racing",
    condition: (s) => s.personalBests >= 10,
  },

  // ── Online / Social ──────────────────────────────────────────────────
  {
    id: "first_online",
    name: "Connected",
    description: "Complete your first online race.",
    icon: "🌐",
    coinReward: 100,
    xpReward: 50,
    category: "social",
    condition: (s) => s.onlineRaces >= 1,
  },
  {
    id: "online_races_25",
    name: "Network Racer",
    description: "Complete 25 online races.",
    icon: "📡",
    coinReward: 300,
    xpReward: 150,
    category: "social",
    condition: (s) => s.onlineRaces >= 25,
  },
  {
    id: "online_wins_10",
    name: "Online Ace",
    description: "Win 10 online races.",
    icon: "🎮",
    coinReward: 400,
    xpReward: 200,
    category: "social",
    condition: (s) => s.onlineWins >= 10,
  },
  {
    id: "online_wins_50",
    name: "Online Legend",
    description: "Win 50 online races.",
    icon: "🌟",
    coinReward: 1000,
    xpReward: 500,
    category: "social",
    condition: (s) => s.onlineWins >= 50,
    secret: true,
  },
  {
    id: "trash_talker",
    name: "Trash Talker",
    description: "Use 10 taunts in races.",
    icon: "💬",
    coinReward: 100,
    xpReward: 50,
    category: "social",
    condition: (s) => s.tauntsUsed >= 10,
  },
  {
    id: "taunts_50",
    name: "Big Mouth",
    description: "Use 50 taunts in races.",
    icon: "📢",
    coinReward: 250,
    xpReward: 125,
    category: "social",
    condition: (s) => s.tauntsUsed >= 50,
    secret: true,
  },
  {
    id: "streak_3",
    name: "On a Roll",
    description: "Play on 3 consecutive days.",
    icon: "🔥",
    coinReward: 150,
    xpReward: 75,
    category: "social",
    condition: (s) => s.currentStreak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Play on 7 consecutive days.",
    icon: "📅",
    coinReward: 400,
    xpReward: 200,
    category: "social",
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: "streak_30",
    name: "Dedicated",
    description: "Play on 30 consecutive days.",
    icon: "🗓️",
    coinReward: 1500,
    xpReward: 750,
    category: "social",
    condition: (s) => s.currentStreak >= 30,
    secret: true,
  },

  // ── Skills ───────────────────────────────────────────────────────────
  {
    id: "drift_king",
    name: "Drift King",
    description: "Spend 100 seconds drifting.",
    icon: "💨",
    coinReward: 300,
    xpReward: 150,
    category: "skills",
    condition: (s) => s.driftSeconds >= 100,
  },
  {
    id: "drift_500",
    name: "Slide Master",
    description: "Spend 500 seconds drifting.",
    icon: "🌪️",
    coinReward: 600,
    xpReward: 300,
    category: "skills",
    condition: (s) => s.driftSeconds >= 500,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Reach 220 km/h.",
    icon: "⚡",
    coinReward: 200,
    xpReward: 100,
    category: "skills",
    condition: (s) => s.topSpeedKph >= 220,
  },
  {
    id: "speed_250",
    name: "Supersonic",
    description: "Reach 250 km/h.",
    icon: "🛸",
    coinReward: 500,
    xpReward: 250,
    category: "skills",
    condition: (s) => s.topSpeedKph >= 250,
    secret: true,
  },
  {
    id: "turbo_addict",
    name: "Turbo Addict",
    description: "Use turbo boost 50 times.",
    icon: "🚀",
    coinReward: 250,
    xpReward: 125,
    category: "skills",
    condition: (s) => s.turboBursts >= 50,
  },
  {
    id: "turbo_100",
    name: "Nitro Fiend",
    description: "Use turbo boost 100 times.",
    icon: "🔥",
    coinReward: 400,
    xpReward: 200,
    category: "skills",
    condition: (s) => s.turboBursts >= 100,
  },
  {
    id: "clean_sheet",
    name: "Clean Sheet",
    description: "Complete 5 clean laps without hitting barriers.",
    icon: "✨",
    coinReward: 200,
    xpReward: 100,
    category: "skills",
    condition: (s) => s.cleanLaps >= 5,
  },
  {
    id: "clean_laps_20",
    name: "Precision Driver",
    description: "Complete 20 clean laps without hitting barriers.",
    icon: "🎯",
    coinReward: 500,
    xpReward: 250,
    category: "skills",
    condition: (s) => s.cleanLaps >= 20,
  },

  // ── Exploration ──────────────────────────────────────────────────────
  {
    id: "maps_3",
    name: "Explorer",
    description: "Race on 3 different maps.",
    icon: "🗺️",
    coinReward: 150,
    xpReward: 75,
    category: "exploration",
    condition: (s) => s.mapsRaced.size >= 3,
  },
  {
    id: "maps_6",
    name: "Globehopper",
    description: "Race on 6 different maps.",
    icon: "✈️",
    coinReward: 400,
    xpReward: 200,
    category: "exploration",
    condition: (s) => s.mapsRaced.size >= 6,
  },
  {
    id: "globe_trotter",
    name: "Globe Trotter",
    description: "Race on all 9 maps.",
    icon: "🌍",
    coinReward: 1000,
    xpReward: 500,
    category: "exploration",
    condition: (s) => s.mapsRaced.size >= 9,
  },
  {
    id: "distance_100",
    name: "Road Tripper",
    description: "Drive 100 km total.",
    icon: "🛤️",
    coinReward: 200,
    xpReward: 100,
    category: "exploration",
    condition: (s) => s.totalDistanceKm >= 100,
  },
  {
    id: "distance_500",
    name: "Long Hauler",
    description: "Drive 500 km total.",
    icon: "🌐",
    coinReward: 500,
    xpReward: 250,
    category: "exploration",
    condition: (s) => s.totalDistanceKm >= 500,
  },
  {
    id: "distance_1000",
    name: "Marathon Runner",
    description: "Drive 1,000 km total.",
    icon: "🏃",
    coinReward: 1000,
    xpReward: 500,
    category: "exploration",
    condition: (s) => s.totalDistanceKm >= 1000,
    secret: true,
  },

  // ── Collection ───────────────────────────────────────────────────────
  {
    id: "crates_5",
    name: "Lucky Box",
    description: "Open 5 crates.",
    icon: "📦",
    coinReward: 100,
    xpReward: 50,
    category: "collection",
    condition: (s) => s.cratesOpened >= 5,
  },
  {
    id: "crates_20",
    name: "Hoarder",
    description: "Open 20 crates.",
    icon: "🗃️",
    coinReward: 300,
    xpReward: 150,
    category: "collection",
    condition: (s) => s.cratesOpened >= 20,
  },
  {
    id: "crates_50",
    name: "Collection Obsessed",
    description: "Open 50 crates.",
    icon: "💰",
    coinReward: 600,
    xpReward: 300,
    category: "collection",
    condition: (s) => s.cratesOpened >= 50,
    secret: true,
  },
  {
    id: "coins_spent_1000",
    name: "High Roller",
    description: "Spend 1,000 coins.",
    icon: "💸",
    coinReward: 50,
    xpReward: 30,
    category: "collection",
    condition: (s) => s.coinsSpent >= 1000,
  },
  {
    id: "coins_spent_10000",
    name: "Coin Burner",
    description: "Spend 10,000 coins.",
    icon: "🤑",
    coinReward: 200,
    xpReward: 100,
    category: "collection",
    condition: (s) => s.coinsSpent >= 10000,
    secret: true,
  },
];

/**
 * Returns the subset of ACHIEVEMENTS that the player has just newly unlocked
 * given the updated stats. Achievements already in `earned` are skipped.
 */
export function checkNewAchievements(
  stats: PlayerStats,
  earned: Set<string>,
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!earned.has(achievement.id) && achievement.condition(stats)) {
      newlyUnlocked.push(achievement);
    }
  }
  return newlyUnlocked;
}
