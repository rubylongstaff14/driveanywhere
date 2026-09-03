"use client";

import { useEffect, useRef, useState } from "react";
import { RaceAudio } from "@/lib/game/race-audio";
import { useGameStore } from "@/stores/game-store";

/** Start-light sequence shown after the player commits to a run. */
export function RaceCountdown() {
  const countdown = useGameStore((s) => s.countdown);
  const tickCountdown = useGameStore((s) => s.tickCountdown);
  const raceMode = useGameStore((s) => s.raceMode);
  const audio = useRef<RaceAudio | null>(null);
  const wasCounting = useRef(false);
  const lightTotal = useRef(3);
  const [lightsOut, setLightsOut] = useState(false);

  useEffect(() => {
    audio.current = new RaceAudio();
    return () => audio.current?.dispose();
  }, []);

  useEffect(() => {
    if (countdown !== null) {
      wasCounting.current = true;
      lightTotal.current = Math.max(lightTotal.current, countdown);
      setLightsOut(false);
      void audio.current?.playLights(countdown);
      return;
    }
    if (!wasCounting.current) return;
    wasCounting.current = false;
    setLightsOut(true);
    const timer = window.setTimeout(() => setLightsOut(false), 620);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    // The multiplayer server is the single countdown clock. Letting every
    // browser tick as well caused devices to show different numbers.
    if (countdown === null || raceMode === "online") return;
    const timer = window.setTimeout(() => tickCountdown(), 800);
    return () => window.clearTimeout(timer);
  }, [countdown, raceMode, tickCountdown]);

  if (countdown === null && !lightsOut) return null;

  const total = Math.max(3, Math.min(5, lightTotal.current));
  const illuminated =
    countdown === null ? 0 : Math.max(1, total - countdown + 1);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black/25 da-fade-in"
      role="status"
      aria-live="assertive"
    >
      <div className="absolute inset-x-0 top-0 h-[9vh] bg-black/90" />
      <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-black/90" />
      {lightsOut ? (
        <div className="da-slide-up text-center">
          <p className="font-display text-5xl text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.65)] sm:text-7xl">
            LIGHTS OUT
          </p>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-accent">
            Race
          </p>
        </div>
      ) : (
        <div className="da-slide-up flex flex-col items-center gap-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-white/65">
            Grid ready
          </p>
          <div className="rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.75)]">
            <div className="flex gap-2.5 rounded-xl bg-black px-4 py-3 ring-1 ring-white/10">
              {Array.from({ length: total }, (_, index) => (
                <span
                  key={index}
                  className={`h-10 w-10 rounded-full border sm:h-14 sm:w-14 ${
                    index < illuminated
                      ? "border-red-300/70 bg-red-500 shadow-[0_0_28px_rgba(239,68,68,0.95),inset_0_0_10px_rgba(255,255,255,0.5)]"
                      : "border-white/10 bg-zinc-900 shadow-inner"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="font-display text-3xl tabular-nums text-white/90">
            {countdown}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-mist">
            Hold acceleration
          </p>
        </div>
      )}
    </div>
  );
}
