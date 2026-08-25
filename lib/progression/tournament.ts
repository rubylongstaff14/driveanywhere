export type TournamentStatus = "open" | "active" | "finished";

export interface TournamentDef {
  id: string;
  name: string;
  entryFee: number;
  maxPlayers: number;
  maps: string[];
  mapNames: string[];
  description: string;
  prizeDescription: string;
}

export interface GhostOpponent {
  name: string;
  timeMs: number;
  position: number;
}

export interface TournamentRound {
  roundNumber: number;
  mapSlug: string;
  mapName: string;
  playerTimeMs: number | null;
  ghostTimes: GhostOpponent[];
  playerPoints: number;
  completed: boolean;
}

export interface ActiveTournament {
  defId: string;
  enteredAt: number;
  status: TournamentStatus;
  coinsPaid: number;
  rounds: TournamentRound[];
  totalPlayerPoints: number;
  finalPosition: number | null;
  coinsWon: number;
}

const POINTS_TABLE = [6, 4, 3, 2, 1, 0];

export const TOURNAMENT_DEFS: TournamentDef[] = [
  {
    id: "quick-sprint",
    name: "Quick Sprint",
    entryFee: 100,
    maxPlayers: 6,
    maps: ["westminster-sprint", "embankment-run", "canary-wharf-loop"],
    mapNames: ["Westminster Sprint", "Embankment Run", "Canary Wharf Loop"],
    description: "Three London circuits. Fast laps, local legends.",
    prizeDescription: "Winner takes the full coin pot",
  },
  {
    id: "city-hopper",
    name: "City Hopper",
    entryFee: 250,
    maxPlayers: 6,
    maps: ["westminster-sprint", "dubai-marina-circuit", "tokyo-drift-circuit"],
    mapNames: ["Westminster Sprint", "Dubai Marina Circuit", "Tokyo Drift Circuit"],
    description: "Hop between world cities across 3 diverse tracks.",
    prizeDescription: "Winner takes 80% · 2nd 15% · 3rd 5%",
  },
  {
    id: "world-tour",
    name: "World Tour",
    entryFee: 500,
    maxPlayers: 6,
    maps: ["dubai-marina-circuit", "egypt-pyramids", "tokyo-drift-circuit"],
    mapNames: ["Dubai Marina Circuit", "Egypt Pyramids", "Tokyo Drift Circuit"],
    description: "International circuits away from London. Prove your global pace.",
    prizeDescription: "Winner takes 80% · 2nd 15% · 3rd 5%",
  },
  {
    id: "champions-cup",
    name: "Champions Cup",
    entryFee: 1000,
    maxPlayers: 6,
    maps: ["alps-mountain-pass", "new-york-harbor-circuit", "rio-coast-circuit"],
    mapNames: ["Alps Mountain Pass", "New York Harbor Circuit", "Rio Coast Circuit"],
    description: "The hardest tracks on the planet. Only the best survive.",
    prizeDescription: "Winner takes 80% · 2nd 15% · 3rd 5%",
  },
];

const GHOST_NAMES = [
  "Ghost_Apex", "Ghost_Rally", "Ghost_Blaze", "Ghost_Nitro", "Ghost_Turbo",
  "Ghost_Drift", "Ghost_Viper", "Ghost_Storm", "Ghost_Ace", "Ghost_Hawk",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Generates 5 deterministic ghost opponents for a given map and difficulty.
 * difficulty 0–100: at 0–30 the player can likely beat them, at 60–100 they're fast.
 * Times range 60 000–200 000 ms.
 */
export function generateGhostTimes(mapSlug: string, difficulty: number): GhostOpponent[] {
  const hash = slugHash(mapSlug);
  const rand = seededRandom(hash + difficulty * 7919);

  const baseMs = 70_000 + rand() * 100_000;
  const spread = 0.15;

  const clampedDiff = Math.max(0, Math.min(100, difficulty));
  // At difficulty 50 the ghosts cluster around baseMs.
  // Lower difficulty → slower ghosts (player beats them easily).
  // Higher difficulty → faster ghosts.
  const diffOffset = ((clampedDiff - 50) / 50) * -25_000;

  const ghosts: GhostOpponent[] = [];
  for (let i = 0; i < 5; i++) {
    const name = GHOST_NAMES[(hash + i) % GHOST_NAMES.length] ?? `Ghost_${i + 1}`;
    const jitter = (rand() - 0.5) * 2 * spread * baseMs;
    const timeMs = Math.round(Math.max(60_000, baseMs + diffOffset + jitter));
    ghosts.push({ name, timeMs, position: 0 });
  }

  return ghosts;
}

export function scoreTournamentRound(
  playerTimeMs: number,
  ghosts: GhostOpponent[],
): { position: number; points: number; updatedGhosts: GhostOpponent[] } {
  const allEntries = [
    { isPlayer: true, timeMs: playerTimeMs },
    ...ghosts.map((g) => ({ isPlayer: false, timeMs: g.timeMs, ghost: g })),
  ];

  allEntries.sort((a, b) => a.timeMs - b.timeMs);

  let position = 1;
  const updatedGhosts: GhostOpponent[] = [];

  for (let i = 0; i < allEntries.length; i++) {
    const entry = allEntries[i];
    if (!entry) continue;
    if (!entry.isPlayer && "ghost" in entry) {
      updatedGhosts.push({ ...entry.ghost, position: i + 1 });
    } else if (entry.isPlayer) {
      position = i + 1;
    }
  }

  const points = POINTS_TABLE[position - 1] ?? 0;
  return { position, points, updatedGhosts };
}

export function resolveTournament(
  rounds: TournamentRound[],
  entryFee: number,
): { totalPoints: number; position: number; coinsWon: number; potSize: number } {
  const totalPoints = rounds.reduce((sum, r) => sum + r.playerPoints, 0);
  const potSize = entryFee * 6;

  // Sum ghost points across rounds to determine overall standings
  const ghostTotals = new Map<string, number>();
  for (const round of rounds) {
    for (const ghost of round.ghostTimes) {
      const pts = POINTS_TABLE[ghost.position - 1] ?? 0;
      ghostTotals.set(ghost.name, (ghostTotals.get(ghost.name) ?? 0) + pts);
    }
  }

  const ghostScores = [...ghostTotals.values()];
  let position = 1;
  for (const score of ghostScores) {
    if (score > totalPoints) position++;
  }

  let coinsWon = 0;
  if (position === 1) coinsWon = Math.round(potSize * 0.8);
  else if (position === 2) coinsWon = Math.round(potSize * 0.15);
  else if (position === 3) coinsWon = Math.round(potSize * 0.05);

  return { totalPoints, position, coinsWon, potSize };
}

export function getTournamentDef(id: string): TournamentDef | null {
  return TOURNAMENT_DEFS.find((d) => d.id === id) ?? null;
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}
