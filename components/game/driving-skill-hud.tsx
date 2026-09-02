"use client";

import { useEffect, useState } from "react";
import { carTelemetry } from "@/lib/game/telemetry";
import { useGameStore } from "@/stores/game-store";

type SkillReadout = {
  draft: number;
  kerb: boolean;
  balance: "braking" | "balanced" | "power";
};

export function DrivingSkillHud() {
  const started = useGameStore((s) => s.started);
  const finished = useGameStore((s) => s.finished);
  const [readout, setReadout] = useState<SkillReadout>({
    draft: 0,
    kerb: false,
    balance: "balanced",
  });

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setReadout({
        draft: carTelemetry.draftStrength,
        kerb: carTelemetry.onKerb,
        balance: carTelemetry.balance,
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [finished, started]);

  if (!started || finished) return null;
  const balanceLabel =
    readout.balance === "braking"
      ? "Nose loaded"
      : readout.balance === "power"
        ? "Power down"
        : "Balanced";

  return (
    <div className="pointer-events-none absolute top-36 left-1/2 z-20 -translate-x-1/2 sm:top-40">
      <div className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
        <span className="rounded-full bg-white/8 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/75">
          {balanceLabel}
        </span>
        {readout.kerb ? (
          <span className="rounded-full bg-amber-400/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">
            Kerb
          </span>
        ) : null}
        {readout.draft > 0.08 ? (
          <span className="min-w-20 rounded-full bg-cyan-400/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-300">
            Draft {Math.round(readout.draft * 100)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
