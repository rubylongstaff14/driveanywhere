"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import {
  getFavourites,
  subscribeFavourites,
  toggleFavourite,
} from "@/lib/database/mock/favourites";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";

interface FavouriteButtonProps {
  routeId: string;
  routeName: string;
  className?: string;
  withLabel?: boolean;
}

const EMPTY: string[] = [];

export function FavouriteButton({
  routeId,
  routeName,
  className,
  withLabel = false,
}: FavouriteButtonProps) {
  const user = useAuthStore((s) => s.user);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const userId = user?.id ?? null;

  const getSnapshot = useCallback(
    () => (userId ? getFavourites(userId).join(",") : ""),
    [userId],
  );

  const key = useSyncExternalStore(
    subscribeFavourites,
    getSnapshot,
    () => "",
  );

  const favourite = (key ? key.split(",") : EMPTY).includes(routeId);

  const handleClick = () => {
    let activeId = userId;
    if (!activeId) {
      // Favouriting is the kind of low-stakes action that should not force a
      // sign-up, so fall back to a guest session.
      const result = continueAsGuest();
      if (!result.ok) return;
      activeId = useAuthStore.getState().user?.id ?? null;
    }
    if (!activeId) return;
    toggleFavourite(activeId, routeId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={favourite}
      aria-label={
        favourite
          ? `Remove ${routeName} from favourites`
          : `Add ${routeName} to favourites`
      }
      className={cn(
        "focus-visible:ring-accent inline-flex items-center justify-center gap-2 rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none",
        favourite
          ? "border-signal/60 bg-signal/10 text-signal"
          : "border-line text-fog hover:border-fog/40 hover:text-white",
        withLabel ? "h-11 px-4 text-sm" : "h-9 w-9",
        className,
      )}
    >
      <Heart
        className="h-4 w-4"
        fill={favourite ? "currentColor" : "none"}
        aria-hidden
      />
      {withLabel ? (favourite ? "Favourited" : "Favourite") : null}
    </button>
  );
}
