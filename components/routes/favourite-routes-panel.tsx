"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getFavourites,
  subscribeFavourites,
} from "@/lib/database/mock/favourites";
import { formatDistance, formatDifficulty } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth-store";
import type { RouteSummary } from "@/types/route";

interface FavouriteRoutesPanelProps {
  routes: RouteSummary[];
}

export function FavouriteRoutesPanel({ routes }: FavouriteRoutesPanelProps) {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const getSnapshot = useCallback(
    () => (userId ? getFavourites(userId).join(",") : ""),
    [userId],
  );

  const key = useSyncExternalStore(subscribeFavourites, getSnapshot, () => "");
  const favouriteIds = key ? key.split(",") : [];
  const favourites = routes.filter((route) => favouriteIds.includes(route.id));

  return (
    <section className="border-line bg-panel/40 rounded-xl border p-5">
      <h2 className="mb-4 text-lg text-white">Favourite routes</h2>

      {favourites.length === 0 ? (
        <p className="text-mist text-sm">
          No favourites yet. Tap the heart on any route to pin it here.
        </p>
      ) : (
        <ul className="space-y-2">
          {favourites.map((route) => (
            <li key={route.id}>
              <Link
                href={`/routes/${route.slug}`}
                className="border-line/70 hover:border-fog/40 focus-visible:ring-accent flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-white">{route.name}</span>
                <span className="text-fog font-mono text-xs">
                  {formatDistance(route.distanceMetres)} ·{" "}
                  {formatDifficulty(route.difficulty)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
