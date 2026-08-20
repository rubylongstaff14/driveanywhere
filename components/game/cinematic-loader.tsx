"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "Hold Space and steer to rotate the rear through hairpins.",
  "C cycles chase, far, hood and bumper cameras.",
  "Crates unlock cosmetics only — class stats never change.",
  "Online: the host picks the car and AI count for everyone.",
];

interface CinematicLoaderProps {
  title?: string;
  subtitle?: string;
  /** 0–100. Omit for an indeterminate sweep. */
  progress?: number;
  compact?: boolean;
}

export function CinematicLoader({
  title = "Loading circuit",
  subtitle = "Compiling lights, asphalt and skyline",
  progress,
  compact = false,
}: CinematicLoaderProps) {
  const [tip] = useState(
    () => TIPS[Math.floor(Math.random() * TIPS.length)],
  );
  const [sweep, setSweep] = useState(12);

  useEffect(() => {
    if (progress !== undefined) return;
    const id = window.setInterval(() => {
      setSweep((v) => (v >= 88 ? 18 : v + 7));
    }, 180);
    return () => window.clearInterval(id);
  }, [progress]);

  const width = progress ?? sweep;

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-[16rem] items-center justify-center bg-ink-975"
          : "relative flex h-full min-h-[100dvh] items-center justify-center overflow-hidden bg-ink-975"
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(245,166,35,0.22), transparent 42%), radial-gradient(ellipse at 90% 80%, rgba(56,189,248,0.12), transparent 40%)",
        }}
      />
      <div
        aria-hidden
        className="da-scanlines pointer-events-none absolute inset-0"
      />
      <div className="relative z-10 w-full max-w-md px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.38em] text-accent">
          DriveAnywhere.ai
        </p>
        <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-mist">{subtitle}</p>
        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent shadow-[0_0_18px_rgba(245,166,35,0.65)] transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(6, Math.min(100, width))}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-[11px] tabular-nums text-fog">
          {Math.round(width)}%
        </p>
        <p className="mt-6 text-xs leading-relaxed text-fog">{tip}</p>
      </div>
    </div>
  );
}
