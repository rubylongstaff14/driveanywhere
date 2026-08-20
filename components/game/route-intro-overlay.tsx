"use client";

import { useEffect, useState } from "react";
import { ROUTE_INTRO_SECONDS } from "@/lib/game/route-intro";
import { useGameStore } from "@/stores/game-store";

interface RouteIntroOverlayProps {
  routeName: string;
  city: string;
  country: string;
}

export function RouteIntroOverlay({
  routeName,
  city,
  country,
}: RouteIntroOverlayProps) {
  const introActive = useGameStore((s) => s.introActive);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!introActive) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const hide = window.setTimeout(
      () => setVisible(false),
      (ROUTE_INTRO_SECONDS - 1.4) * 1000,
    );
    return () => window.clearTimeout(hide);
  }, [introActive]);

  if (!introActive) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-x-0 top-0 h-16 bg-black/80 sm:h-20" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-black/80 sm:h-20" />
      {visible ? (
        <div className="absolute inset-x-0 top-[18%] flex justify-center px-4">
          <div className="rounded-xl border border-white/10 bg-ink-950/55 px-6 py-4 text-center backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">
              {city}, {country}
            </p>
            <h2 className="mt-1 font-display text-3xl text-white sm:text-4xl">
              {routeName}
            </h2>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-mist">
              Circuit preview
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
