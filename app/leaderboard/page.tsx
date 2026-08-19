import type { Metadata } from "next";
import { ClientLeaderboard } from "@/components/leaderboard/client-leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top times across DriveAnywhere.ai London routes.",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Compete
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-white">
          Leaderboard
        </h1>
        <p className="mt-3 text-mist">
          Seeded mock times plus valid runs saved in this browser.
        </p>
      </div>

      <ClientLeaderboard limit={20} />
    </div>
  );
}
