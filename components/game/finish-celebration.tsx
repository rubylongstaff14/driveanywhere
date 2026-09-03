"use client";

import { useEffect, useState } from "react";
import { formatLapTime } from "@/lib/utils/format";
import { useGameStore } from "@/stores/game-store";

export function FinishCelebration() {
  const finished = useGameStore((s) => s.finished);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!finished) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [finished]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
      <div className="da-slide-up text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-accent">
          Chequered flag
        </p>
        <p className="mt-2 font-display text-6xl text-white drop-shadow-2xl">
          {formatLapTime(elapsedMs)}
        </p>
        <button
          type="button"
          className="pointer-events-auto mt-4 rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white"
          onClick={() => setVisible(false)}
        >
          Results
        </button>
      </div>
    </div>
  );
}
