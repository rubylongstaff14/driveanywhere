"use client";

import { useEffect, useRef, useState } from "react";
import { carTelemetry } from "@/lib/game/telemetry";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

function formatGap(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 50) return "CLOSE";
  return `+${(ms / 1000).toFixed(1)}s`;
}

export function RacePositionsHud() {
  const racePositions = useMultiplayerStore((s) => s.racePositions);
  const myId = useMultiplayerStore((s) => s.myId);
  const racing = useMultiplayerStore((s) => s.racing);
  const prevDeltas = useRef<Record<string, number>>({});
  const [boost, setBoost] = useState({ turbo: false, draft: false });

  useEffect(() => {
    if (!racing) {
      setBoost({ turbo: false, draft: false });
      return;
    }
    let raf = 0;
    const tick = () => {
      setBoost((prev) => {
        const next = {
          turbo: carTelemetry.turbo,
          draft: carTelemetry.drafting,
        };
        if (prev.turbo === next.turbo && prev.draft === next.draft) return prev;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [racing]);

  const myRow = racePositions.find((p) => p.playerId === myId);
  const myPos = myRow?.position ?? 1;
  const ahead = racePositions.find((p) => p.position === myPos - 1);
  const gapAhead =
    myRow && ahead && myRow.delta != null && ahead.delta != null
      ? Math.max(0, myRow.delta - (ahead.delta ?? 0))
      : myRow?.delta ?? null;

  if (racePositions.length === 0 && !boost.turbo && !boost.draft) return null;

  return (
    <>
      {(boost.turbo || boost.draft) && (
        <div className="multiplayer-boost-hud pointer-events-none fixed left-4 top-36 z-50 sm:top-40">
          <div className="flex flex-col items-start gap-1">
            {boost.turbo && (
              <div className="rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-left shadow-[0_0_20px_rgba(245,158,11,0.28)] backdrop-blur-md">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                  Turbo
                </p>
                <p className="text-[9px] text-amber-100/70">+4% catch-up</p>
              </div>
            )}
            {boost.draft && (
              <div className="rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-1 text-left backdrop-blur-md">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Slipstream
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {racePositions.length > 0 && (
        <div className="race-positions-panel fixed right-4 top-4 z-50 w-60 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-white/50">
              Positions
            </h3>
            {myPos > 1 && gapAhead != null && (
              <span className="font-mono text-[10px] text-white/55">
                gap {formatGap(gapAhead)}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {racePositions.map((p) => {
              const prev = prevDeltas.current[p.playerId];
              const gaining =
                prev !== undefined && p.delta !== null && p.delta < prev - 40;
              const losing =
                prev !== undefined && p.delta !== null && p.delta > prev + 40;
              if (p.delta !== null) prevDeltas.current[p.playerId] = p.delta;

              const isMe = p.playerId === myId;
              return (
                <div
                  key={p.playerId}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                    isMe ? "bg-accent/20 text-white" : "text-white/80"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-accent">P{p.position}</span>
                    <span className={isMe ? "font-medium" : ""}>
                      {p.playerName}
                      {isMe && " (You)"}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      p.delta === null
                        ? "text-white/50"
                        : gaining
                          ? "text-green-400"
                          : losing
                            ? "text-red-400"
                            : "text-white/60"
                    }`}
                  >
                    {formatGap(p.delta)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
