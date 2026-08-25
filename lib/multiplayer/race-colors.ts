/**
 * Lobby paint claim helpers — any cosmetic paint hex can be claimed,
 * but only one human per room may use the same hex at a time.
 */

export function normalizePaintHex(hex: string | null | undefined): string | null {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return h;
}

export function takenPaintHexes(
  players: Array<{ id: string; paint?: string }>,
  exceptPlayerId?: string,
): Set<string> {
  const taken = new Set<string>();
  for (const p of players) {
    if (exceptPlayerId && p.id === exceptPlayerId) continue;
    const n = normalizePaintHex(p.paint);
    if (n) taken.add(n);
  }
  return taken;
}

export function isPaintHexTaken(
  players: Array<{ id: string; paint?: string }>,
  hex: string,
  exceptPlayerId?: string,
): boolean {
  const n = normalizePaintHex(hex);
  if (!n) return true;
  return takenPaintHexes(players, exceptPlayerId).has(n);
}

/** Prefer requested paint if free; otherwise first free from candidates. */
export function claimPaintHex(
  players: Array<{ id: string; paint?: string }>,
  requested: string | undefined,
  candidates: string[],
  exceptPlayerId?: string,
): string {
  const taken = takenPaintHexes(players, exceptPlayerId);
  const want = normalizePaintHex(requested);
  if (want && !taken.has(want)) return want;
  for (const c of candidates) {
    const n = normalizePaintHex(c);
    if (n && !taken.has(n)) return n;
  }
  // Fallback: any free 6-digit hex from a neutral palette if all candidates taken
  const fallback = [
    "#e11d48",
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#a855f7",
    "#06b6d4",
    "#84cc16",
    "#f4f4f5",
  ];
  for (const c of fallback) {
    if (!taken.has(c)) return c;
  }
  return want ?? "#e11d48";
}
