"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { pulseTouchDrive, setTouchDrive } from "@/lib/game/touch-controls";

type HoldControl =
  "accelerate" | "brake" | "steerLeft" | "steerRight" | "handbrake";

function HoldButton({
  control,
  label,
  className = "",
}: {
  control: HoldControl;
  label: string;
  className?: string;
}) {
  const set = (active: boolean) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (active) event.currentTarget.setPointerCapture(event.pointerId);
    setTouchDrive(control, active);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`active:bg-accent flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/55 text-lg font-bold text-white shadow-lg backdrop-blur-sm select-none active:scale-95 active:text-black ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onLostPointerCapture={set(false)}
    >
      {label}
    </button>
  );
}

export function MobileControls({ active = true }: { active?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [autoThrottle, setAutoThrottle] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () =>
      setEnabled(query.matches || navigator.maxTouchPoints > 0);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (active) return;
    setAutoThrottle(false);
    setTouchDrive("accelerate", false);
  }, [active]);

  useEffect(() => {
    const stopOnHide = () => {
      if (document.visibilityState === "visible") return;
      setAutoThrottle(false);
      setTouchDrive("accelerate", false);
    };
    document.addEventListener("visibilitychange", stopOnHide);
    return () => document.removeEventListener("visibilitychange", stopOnHide);
  }, []);

  if (!enabled || !active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex items-end justify-between px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto flex gap-3">
        <HoldButton control="steerLeft" label="◀" />
        <HoldButton control="steerRight" label="▶" />
      </div>
      <div className="pointer-events-auto mb-1 flex gap-2">
        <button
          type="button"
          className="h-10 rounded-full border border-white/20 bg-black/55 px-3 text-xs font-bold text-white backdrop-blur-sm"
          onPointerDown={() => pulseTouchDrive("camera")}
        >
          CAMERA
        </button>
        <HoldButton
          control="handbrake"
          label="DRIFT"
          className="h-12 w-12 text-[10px]"
        />
        <button
          type="button"
          className="h-10 rounded-full border border-white/20 bg-black/55 px-3 text-xs font-bold text-white backdrop-blur-sm"
          onPointerDown={() => pulseTouchDrive("reset")}
        >
          RESET
        </button>
      </div>
      <div className="pointer-events-auto flex gap-3">
        <HoldButton control="brake" label="BRAKE" className="text-[11px]" />
        <button
          type="button"
          aria-pressed={autoThrottle}
          className={`h-20 w-20 rounded-full border text-sm font-black shadow-lg backdrop-blur-sm select-none active:scale-95 ${
            autoThrottle
              ? "border-accent bg-accent text-black shadow-[0_0_24px_rgba(255,215,0,0.45)]"
              : "border-accent/60 bg-accent/25 text-white"
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={(event) => {
            event.preventDefault();
            const next = !autoThrottle;
            setAutoThrottle(next);
            setTouchDrive("accelerate", next);
          }}
        >
          {autoThrottle ? "GOING" : "GO"}
        </button>
      </div>
    </div>
  );
}
