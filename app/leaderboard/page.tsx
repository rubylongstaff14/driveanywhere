import type { Metadata } from "next";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";

export const metadata: Metadata = {
  title: "Leaderboard — OpenRace",
  description: "Weekly competition, Hall of Fame, and your personal bests across all circuits.",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Compete
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-white">
          Leaderboard
        </h1>
        <p className="mt-3 text-mist">
          Weekly prizes, all-time records, and your personal bests across every circuit.
        </p>
      </div>

      <LeaderboardTabs />
    </div>
  );
}
