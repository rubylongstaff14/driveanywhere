const FAVOURITES_KEY = "driveanywhere.favourites";
export const FAVOURITES_EVENT = "driveanywhere-favourites";

type FavouritesMap = Record<string, string[]>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readAll(): FavouritesMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as FavouritesMap;
  } catch {
    return {};
  }
}

function writeAll(map: FavouritesMap): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(FAVOURITES_EVENT));
  } catch {
    // Storage may be unavailable in private mode; favourites are non-critical.
  }
}

export function getFavourites(userId: string | null): string[] {
  if (!userId) return [];
  return readAll()[userId] ?? [];
}

export function isFavourite(userId: string | null, routeId: string): boolean {
  return getFavourites(userId).includes(routeId);
}

/** Returns the new favourite state for the route. */
export function toggleFavourite(userId: string, routeId: string): boolean {
  const map = readAll();
  const current = map[userId] ?? [];
  const next = current.includes(routeId)
    ? current.filter((id) => id !== routeId)
    : [...current, routeId];
  map[userId] = next;
  writeAll(map);
  return next.includes(routeId);
}

/** Subscribes to favourite changes, including edits made in another tab. */
export function subscribeFavourites(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FAVOURITES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FAVOURITES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
