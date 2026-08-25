"use client";

import { useEffect, useState } from "react";
import { TAUNTS, type TauntId } from "@/lib/multiplayer/taunts";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

const LABEL: Record<TauntId, string> = {
  push: "Push!",
  nice: "Nice!",
  close: "Too close!",
  gg: "GG",
};

/**
 * Hold T (or tap the button) for a 4-way taunt wheel.
 * Keys 1–4 fire while open. Cooldown enforced server-side.
 */
export function TauntWheel() {
  const racing = useMultiplayerStore((s) => s.racing);
  const spectating = useMultiplayerStore((s) => s.spectating);
  const sendTaunt = useMultiplayerStore((s) => s.sendTaunt);
  const tauntFeed = useMultiplayerStore((s) => s.tauntFeed);
  const [open, setOpen] = useState(false);
  const [coolUntil, setCoolUntil] = useState(0);

  useEffect(() => {
    if (!racing) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "KeyT") {
        e.preventDefault();
        setOpen(true);
      }
      if (!open) return;
      const hit = TAUNTS.find((t) => t.key === e.key);
      if (hit) {
        e.preventDefault();
        fire(hit.id);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "KeyT") setOpen(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [racing, open]);

  function fire(id: TauntId) {
    if (Date.now() < coolUntil) return;
    sendTaunt(id);
    setCoolUntil(Date.now() + 2800);
    setOpen(false);
  }

  if (!racing) return null;

  const recent = tauntFeed.filter((t) => Date.now() - t.at < 3500);

  return (
    <>
      <div className="pointer-events-none fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1">
        {recent.map((t) => (
          <div
            key={t.id}
            className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs text-white shadow-lg backdrop-blur-md"
          >
            <span className="text-white/55">{t.playerName}</span>
            <span className="mx-1.5 text-accent">{LABEL[t.tauntId]}</span>
          </div>
        ))}
      </div>

      {!spectating && (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          {open ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-md">
              {TAUNTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => fire(t.id)}
                  className="min-w-[7.5rem] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-accent/25"
                >
                  <span className="font-mono text-[10px] text-white/40">
                    {t.key}
                  </span>
                  <p className="text-sm font-medium text-white">{t.label}</p>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onMouseDown={() => setOpen(true)}
              onMouseUp={() => setOpen(false)}
              onTouchStart={() => setOpen(true)}
              className="rounded-full border border-white/15 bg-black/55 px-4 py-2 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-md hover:bg-black/70"
            >
              Hold T · Taunts
            </button>
          )}
        </div>
      )}
    </>
  );
}
