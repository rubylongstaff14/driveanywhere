import type { Metadata } from "next";
import { HotLapHub } from "@/components/hot-lap/hot-lap-hub";

export const metadata: Metadata = {
  title: "Daily Hot Lap — OpenRace",
  description: "One attempt only. Today's featured circuit. Compete for glory.",
};

export default function HotLapPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Daily challenge
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-white">
          Hot Lap
        </h1>
        <p className="mt-3 text-mist">
          One attempt. No retries. Post the fastest time before midnight UTC.
        </p>
      </div>

      <HotLapHub />
    </div>
  );
}
