"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatLapTime } from "@/lib/utils/format";
import {
  getWeeklyEntries,
  getHallOfFame,
  getWeeklyPrize,
  getPrizeHistory,
  msUntilWeekReset,
  MAP_NAMES,
  type WeeklyEntry,
  type HallOfFameEntry,
} from "@/lib/progression/weekly-leaderboard";
import { readAttempts } from "@/lib/database/mock/attempts";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";
import { useAuthStore } from "@/stores/auth-store";

const MAP_SLUGS = [
  "westminster-sprint",
  "embankment-run",
  "canary-wharf-loop",
  "dubai-marina-circuit",
  "egypt-pyramids",
  "new-york-harbor-circuit",
  "tokyo-drift-circuit",
  "alps-mountain-pass",
  "rio-coast-circuit",
];

type Tab = "weekly" | "hof" | "records" | "prizes";

function useCountdown(getMsRemaining: () => number) {
  const [ms, setMs] = useState(getMsRemaining);
  useEffect(() => {
    const tick = setInterval(() => setMs(getMsRemaining()), 1000);
    return () => clearInterval(tick);
  }, [getMsRemaining]);
  return ms;
}

function formatCountdown(ms: number): { days: string; hours: string; minutes: string; seconds: string } {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="font-mono text-fog tabular-nums">
      {String(rank).padStart(2, " ")}
    </span>
  );
}

function CountdownBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
        {value}
      </span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fog">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return <span className="font-mono text-3xl font-bold text-accent/60 sm:text-4xl">:</span>;
}

// ── Weekly Tab ─────────────────────────────────────────────────────────────────
function WeeklyTab({ user }: { user: ReturnType<typeof useAuthStore.getState>["user"] }) {
  const [selectedMap, setSelectedMap] = useState(MAP_SLUGS[0]);
  const weekMs = useCountdown(msUntilWeekReset);
  const cd = formatCountdown(weekMs);
  const prize = getWeeklyPrize();

  // Get player PB for selected map
  const routeForMap = MOCK_ROUTES.find((r) => r.slug === selectedMap);
  const playerBestMs = (() => {
    if (!user || !routeForMap) return null;
    const attempts = readAttempts();
    const valid = attempts.filter(
      (a) => a.userId === user.id && a.routeId === routeForMap.id && a.isValid,
    );
    if (valid.length === 0) return null;
    return Math.min(...valid.map((a) => a.completionTimeMs));
  })();

  const entries = getWeeklyEntries(selectedMap, playerBestMs);

  return (
    <div className="space-y-6 da-fade-up">
      {/* Prize card */}
      <div className="relative overflow-hidden rounded-xl border border-accent/30 bg-ink-950/80 p-5 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              🏆 This Week&apos;s Prize
            </p>
            <p className="mt-2 font-display text-2xl text-white">{prize.label}</p>
            <p className="mt-1 text-sm text-fog">Sponsored by {prize.sponsor} · Win by posting fastest lap</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-widest text-fog">Resets in</p>
            <div className="mt-2 flex items-center gap-1.5">
              <CountdownBlock value={cd.days} label="days" />
              <Separator />
              <CountdownBlock value={cd.hours} label="hrs" />
              <Separator />
              <CountdownBlock value={cd.minutes} label="min" />
              <Separator />
              <CountdownBlock value={cd.seconds} label="sec" />
            </div>
          </div>
        </div>
      </div>

      {/* Map selector */}
      <div className="flex flex-wrap gap-2">
        {MAP_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setSelectedMap(slug)}
            className={
              selectedMap === slug
                ? "rounded-full bg-accent px-3 py-1.5 font-mono text-xs font-medium text-ink-975 transition"
                : "rounded-full border border-line px-3 py-1.5 font-mono text-xs text-fog transition hover:border-accent/50 hover:text-white"
            }
          >
            {MAP_NAMES[slug] ?? slug}
          </button>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Weekly leaderboard for {MAP_NAMES[selectedMap]}</caption>
          <thead className="bg-panel font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            <tr>
              <th className="px-4 py-3 font-medium w-12">#</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={`${entry.rank}-${entry.displayName}`}
                className={[
                  "border-t border-line/80",
                  entry.isPlayer
                    ? "bg-accent/10 outline outline-1 outline-accent/30"
                    : "odd:bg-panel/30",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-4 py-3 text-white">
                  {entry.displayName}
                  {entry.isPlayer && (
                    <span className="ml-2 rounded-full bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      YOU
                    </span>
                  )}
                  {entry.isGuest && !entry.isPlayer && (
                    <span className="ml-2 text-xs text-fog">guest</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-accent-bright">
                  {formatLapTime(entry.timeMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Hall of Fame Tab ────────────────────────────────────────────────────────────
function HallOfFameTab() {
  const entries = getHallOfFame();

  return (
    <div className="space-y-6 da-fade-up">
      <div className="rounded-xl border border-white/10 bg-ink-950/90 p-5 backdrop-blur-sm">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-fog">
          All-time records
        </p>
        <h2 className="mt-2 font-display text-2xl text-white">Hall of Fame</h2>
        <p className="mt-1 text-sm text-mist">
          Frozen records. These times stand until someone dares to break them.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Hall of fame all-time records</caption>
          <thead className="bg-ink-950/80 font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            <tr>
              <th className="px-4 py-3 font-medium w-12">#</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Circuit</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
              <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Set</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.rank}
                className={[
                  "border-t border-white/5",
                  entry.rank === 1
                    ? "bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent"
                    : "odd:bg-white/[0.02]",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  {entry.rank === 1 ? (
                    <span className="text-lg">👑</span>
                  ) : (
                    <RankBadge rank={entry.rank} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-white">{entry.country} {entry.displayName}</span>
                </td>
                <td className="px-4 py-3 text-mist text-xs">
                  {MAP_NAMES[entry.mapSlug] ?? entry.mapSlug}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-accent-bright">
                  {formatLapTime(entry.timeMs)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-fog hidden sm:table-cell">
                  {entry.setAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Your Records Tab ─────────────────────────────────────────────────────────
function subscribeAttempts(cb: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: StorageEvent) => {
    if (e.key === "driveanywhere.attempts") cb();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("driveanywhere-attempts", cb);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("driveanywhere-attempts", cb);
  };
}

function getAttemptsSnap() { return JSON.stringify(readAttempts()); }
function getServerSnap() { return "[]"; }

function YourRecordsTab({ user }: { user: ReturnType<typeof useAuthStore.getState>["user"] }) {
  const raw = useSyncExternalStore(subscribeAttempts, getAttemptsSnap, getServerSnap);

  const records = MAP_SLUGS.map((slug) => {
    const route = MOCK_ROUTES.find((r) => r.slug === slug);
    if (!route) return { slug, name: MAP_NAMES[slug] ?? slug, bestMs: null, globalRank: null };

    let bestMs: number | null = null;
    if (user) {
      const attempts = (JSON.parse(raw) as ReturnType<typeof readAttempts>).filter(
        (a) => a.userId === user.id && a.routeId === route.id && a.isValid,
      );
      if (attempts.length > 0) {
        bestMs = Math.min(...attempts.map((a) => a.completionTimeMs));
      }
    }

    // Estimate global rank
    let globalRank: string | null = null;
    if (bestMs !== null) {
      const base = route.bestTimeMs ?? null;
      if (!base) return { slug, name: MAP_NAMES[slug] ?? slug, bestMs, globalRank };
      const ratio = bestMs / base;
      if (ratio < 1.02) globalRank = "Top 1%";
      else if (ratio < 1.05) globalRank = "Top 5%";
      else if (ratio < 1.10) globalRank = "Top 15%";
      else if (ratio < 1.20) globalRank = "Top 30%";
      else globalRank = "Top 50%";
    }

    return { slug, name: MAP_NAMES[slug] ?? slug, bestMs, globalRank };
  });

  const hasAny = records.some((r) => r.bestMs !== null);

  return (
    <div className="space-y-4 da-fade-up">
      {!user && (
        <div className="rounded-xl border border-line bg-panel/40 p-6 text-center">
          <p className="text-mist">Sign in or race as a guest to track your personal bests.</p>
        </div>
      )}
      {user && !hasAny && (
        <div className="rounded-xl border border-line bg-panel/40 p-6 text-center">
          <p className="text-mist">No records yet — finish a race to see your times here.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {records.map(({ slug, name, bestMs, globalRank }) => (
          <div
            key={slug}
            className={[
              "rounded-xl border p-4",
              bestMs !== null
                ? "border-accent/30 bg-ink-950/80 backdrop-blur-sm"
                : "border-line bg-panel/20 opacity-60",
            ].join(" ")}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
              {name}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-accent-bright">
              {formatLapTime(bestMs)}
            </p>
            {globalRank && (
              <p className="mt-1 text-xs text-mist">{globalRank} globally</p>
            )}
            {bestMs === null && (
              <p className="mt-2 text-xs text-fog">Not attempted</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prize History Tab ───────────────────────────────────────────────────────
function PrizeHistoryTab() {
  const history = getPrizeHistory();

  return (
    <div className="space-y-4 da-fade-up">
      <div className="rounded-xl border border-line bg-panel/40 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-fog">Past winners</p>
        <h2 className="mt-2 font-display text-xl text-white">Prize History</h2>
        <p className="mt-1 text-sm text-mist">Past 4 weeks of winners and prizes.</p>
      </div>
      <div className="space-y-3">
        {history.map(({ week, prize, winner, country }) => (
          <div
            key={week}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/30 px-5 py-4"
          >
            <div>
              <p className="font-mono text-xs text-fog">{week}</p>
              <p className="mt-1 text-white font-medium">
                {country} {winner}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-accent-bright">{prize.label}</p>
              <p className="text-xs text-fog">via {prize.sponsor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main tabs component ───────────────────────────────────────────────────────
export function LeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("weekly");
  const user = useAuthStore((s) => s.user);

  const tabs: { id: Tab; label: string }[] = [
    { id: "weekly", label: "Weekly" },
    { id: "hof", label: "Hall of Fame" },
    { id: "records", label: "Your Records" },
    { id: "prizes", label: "Prize History" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-panel/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex-1 rounded-lg px-3 py-2.5 font-mono text-xs font-medium transition sm:text-sm",
              activeTab === tab.id
                ? "bg-accent text-ink-975"
                : "text-fog hover:text-white",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "weekly" && <WeeklyTab user={user} />}
      {activeTab === "hof" && <HallOfFameTab />}
      {activeTab === "records" && <YourRecordsTab user={user} />}
      {activeTab === "prizes" && <PrizeHistoryTab />}
    </div>
  );
}
