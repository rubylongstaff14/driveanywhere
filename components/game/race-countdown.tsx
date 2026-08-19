"use client";

import { useEffect } from "react";
import { useGameStore } from "@/stores/game-store";

/** Start-light sequence shown after the player commits to a run. */
export function RaceCountdown() {
  const countdown = useGameStore((s) => s.countdown);
  const tickCountdown = useGameStore((s) => s.tickCountdown);

  useEffect(() => {
    if (countdown === null) return;
    const timer = window.setTimeout(() => tickCountdown(), 800);
    return () => window.clearTimeout(timer);
  }, [countdown, tickCountdown]);

  if (countdown === null) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      role="status"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[3, 2, 1].map((light) => (
            <span
              key={light}
              className={
                countdown <= light
                  ? "h-4 w-4 rounded-full bg-signal shadow-[0_0_18px_rgba(244,63,94,0.9)]"
                  : "h-4 w-4 rounded-full bg-white/15"
              }
            />
          ))}
        </div>
        <span className="font-display text-8xl tabular-nums text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {countdown}
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-mist">
          Get ready
        </span>
      </div>
    </div>
  );
}
