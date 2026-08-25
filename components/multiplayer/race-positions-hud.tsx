"use client";

import { useRef } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

export function RacePositionsHud() {
  const racePositions = useMultiplayerStore((s) => s.racePositions);
  const myId = useMultiplayerStore((s) => s.myId);
  const racing = useMultiplayerStore((s) => s.racing);
  const prevDeltas = useRef<Record<string, number>>({});

  const myPos = racePositions.find((p) => p.playerId === myId)?.position ?? 1;
  const turboActive = racing && myPos > 1;

  if (racePositions.length === 0 && !turboActive) return null;

  return (
    <>
      {turboActive && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className="rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-1.5 text-center shadow-[0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-md">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
              Turbo active
            </p>
            <p className="text-[9px] text-amber-100/70">+2% speed & cornering</p>
          </div>
        </div>
      )}
      {racePositions.length > 0 && (
        <div className="fixed right-4 top-4 z-50 w-56 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/50">
            Positions
          </h3>
          <div className="space-y-1">
            {racePositions.map((p) => {
              const prev = prevDeltas.current[p.playerId];
              const gaining =
                prev !== undefined && p.delta !== null && p.delta < prev;
              const losing =
                prev !== undefined && p.delta !== null && p.delta > prev;
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
                    {p.delta === null
                      ? "—"
                      : `+${(p.delta / 1000).toFixed(1)}s`}
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
