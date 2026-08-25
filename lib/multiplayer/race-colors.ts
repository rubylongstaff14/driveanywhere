/**
 * Universal race marker colours — same hex on every client/monitor.
 * Used for lobby claims, remote cars, and post-race track heatmaps.
 */
export interface RaceColor {
  id: string;
  label: string;
  /** Primary body / trail hex */
  hex: string;
  /** Darker accent for shading */
  hexDark: string;
}

export const RACE_COLORS: readonly RaceColor[] = [
  { id: "scarlet", label: "Scarlet", hex: "#e11d48", hexDark: "#9f1239" },
  { id: "emerald", label: "Emerald", hex: "#10b981", hexDark: "#047857" },
  { id: "azure", label: "Azure", hex: "#3b82f6", hexDark: "#1d4ed8" },
  { id: "amber", label: "Amber", hex: "#f59e0b", hexDark: "#b45309" },
  { id: "violet", label: "Violet", hex: "#a855f7", hexDark: "#7e22ce" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", hexDark: "#0e7490" },
  { id: "lime", label: "Lime", hex: "#84cc16", hexDark: "#4d7c0f" },
  { id: "white", label: "White", hex: "#f4f4f5", hexDark: "#a1a1aa" },
] as const;

const HEX_SET = new Set(RACE_COLORS.map((c) => c.hex.toLowerCase()));

export function normalizeRaceHex(hex: string | null | undefined): string | null {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return HEX_SET.has(h) ? h : null;
}

export function raceColorByHex(hex: string | null | undefined): RaceColor | undefined {
  const n = normalizeRaceHex(hex);
  if (!n) return undefined;
  return RACE_COLORS.find((c) => c.hex.toLowerCase() === n);
}

export function takenRaceHexes(
  players: Array<{ id: string; paint?: string }>,
  exceptPlayerId?: string,
): Set<string> {
  const taken = new Set<string>();
  for (const p of players) {
    if (exceptPlayerId && p.id === exceptPlayerId) continue;
    const n = normalizeRaceHex(p.paint);
    if (n) taken.add(n);
  }
  return taken;
}

/** First free universal colour, or null if all claimed. */
export function nextFreeRaceHex(
  players: Array<{ id: string; paint?: string }>,
  exceptPlayerId?: string,
): string | null {
  const taken = takenRaceHexes(players, exceptPlayerId);
  for (const c of RACE_COLORS) {
    if (!taken.has(c.hex.toLowerCase())) return c.hex;
  }
  return null;
}

export function isRaceHexTaken(
  players: Array<{ id: string; paint?: string }>,
  hex: string,
  exceptPlayerId?: string,
): boolean {
  const n = normalizeRaceHex(hex);
  if (!n) return true;
  return takenRaceHexes(players, exceptPlayerId).has(n);
}
