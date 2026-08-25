"use client";
import { useEffect, useState } from "react";
import { getPingMs, getConnectionQuality } from "@/lib/multiplayer/ws-client";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

type Quality = ReturnType<typeof getConnectionQuality>;

const QUALITY_BARS: Record<Quality, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
  offline: 0,
};

const QUALITY_COLOR: Record<Quality, string> = {
  excellent: "#10b981", // emerald-500
  good: "#22c55e",     // green-500
  fair: "#f59e0b",     // amber-500
  poor: "#ef4444",     // red-500
  offline: "#6b7280",  // gray-500
};

const BAR_HEIGHTS = [2, 4, 6, 8];

export function LagHud() {
  const racing = useMultiplayerStore((s) => s.racing);
  const [pingMs, setPingMs] = useState(0);
  const [quality, setQuality] = useState<Quality>("offline");

  useEffect(() => {
    if (!racing) return;
    const id = setInterval(() => {
      setPingMs(getPingMs());
      setQuality(getConnectionQuality());
    }, 500);
    return () => clearInterval(id);
  }, [racing]);

  if (!racing) return null;

  const filledBars = QUALITY_BARS[quality];
  const color = QUALITY_COLOR[quality];

  return (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/70 px-2.5 py-1.5 backdrop-blur-sm">
      {/* Signal bars */}
      <div className="flex items-end gap-[2px]">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              backgroundColor: i < filledBars ? color : "rgba(255,255,255,0.20)",
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </div>
      {/* Ping label */}
      <span
        className="font-mono text-[10px] tabular-nums leading-none"
        style={{ color }}
      >
        {quality === "offline" ? "—" : `${pingMs}ms`}
      </span>
    </div>
  );
}
