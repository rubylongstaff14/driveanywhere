"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProgressionStore } from "@/stores/progression-store";
import { useAchievementStore, ACHIEVEMENTS } from "@/stores/achievement-store";
import { rankForXp, nextRank } from "@/lib/progression/economy";
import {
  readAttempts,
  getPersonalBest,
  getRecentAttempts,
} from "@/lib/database/mock/attempts";
import type { AttemptRecord } from "@/lib/game/attempt-validation";
import Link from "next/link";

const ALL_MAPS = [
  { slug: "westminster-sprint", name: "Westminster Sprint", id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
  { slug: "embankment-run", name: "Embankment Run", id: "b2c3d4e5-f6a7-8901-bcde-f12345678901" },
  { slug: "canary-wharf-loop", name: "Canary Wharf Loop", id: "c3d4e5f6-a7b8-9012-cdef-123456789012" },
  { slug: "dubai-marina-circuit", name: "Dubai Marina Circuit", id: "d4e5f6a7-b8c9-0123-defa-234567890123" },
  { slug: "egypt-pyramids", name: "Egypt Pyramids", id: "e5f6a7b8-c9d0-1234-efab-345678901234" },
  { slug: "new-york-harbor-circuit", name: "New York Harbor Circuit", id: "f6a7b8c9-d0e1-2345-fabc-456789012345" },
  { slug: "tokyo-drift-circuit", name: "Tokyo Drift Circuit", id: "a7b8c9d0-e1f2-3456-abcd-567890123456" },
  { slug: "alps-mountain-pass", name: "Alps Mountain Pass", id: "b8c9d0e1-f2a3-4567-bcde-678901234567" },
  { slug: "rio-coast-circuit", name: "Rio Coast Circuit", id: "c9d0e1f2-a3b4-5678-cdef-789012345678" },
];

function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${String(millis).padStart(2, "0")}`;
}

function formatDrift(s: number): string {
  if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${Math.round(s)}s`;
}

function timeRank(ms: number): string {
  if (ms < 60_000) return "S";
  if (ms < 90_000) return "A";
  if (ms < 120_000) return "B";
  if (ms < 180_000) return "C";
  return "D";
}

function timeRankColor(rank: string): string {
  switch (rank) {
    case "S": return "text-amber-400";
    case "A": return "text-emerald-400";
    case "B": return "text-blue-400";
    case "C": return "text-fog";
    default: return "text-fog/60";
  }
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 px-5 py-4 backdrop-blur-sm">
      <div className="mb-2 text-xl">{icon}</div>
      <p className="font-mono text-2xl font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 font-mono text-xs text-fog">{sub}</p>}
      <p className="mt-1 text-xs uppercase tracking-wide text-fog/70">{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  const xp = useProgressionStore((s) => s.xp);
  const coins = useProgressionStore((s) => s.coins);
  const hydrateProgression = useProgressionStore((s) => s.hydrate);
  const progressionHydrated = useProgressionStore((s) => s.hydrated);

  const stats = useAchievementStore((s) => s.stats);
  const earned = useAchievementStore((s) => s.earned);
  const hydrateAchievements = useAchievementStore((s) => s.hydrate);
  const achievementsHydrated = useAchievementStore((s) => s.hydrated);

  const [copied, setCopied] = useState(false);
  const [personalBests, setPersonalBests] = useState<Record<string, number | null>>({});
  const [recentAttempts, setRecentAttempts] = useState<AttemptRecord[]>([]);

  useEffect(() => {
    hydrateAuth();
    hydrateProgression();
    hydrateAchievements();
  }, [hydrateAuth, hydrateProgression, hydrateAchievements]);

  useEffect(() => {
    if (!authHydrated) return;
    const userId = user?.id ?? "guest";
    const bests: Record<string, number | null> = {};
    for (const map of ALL_MAPS) {
      bests[map.slug] = getPersonalBest(userId, map.id);
    }
    setPersonalBests(bests);
    setRecentAttempts(getRecentAttempts(userId, 5));
  }, [authHydrated, user]);

  const rank = rankForXp(xp);
  const next = nextRank(xp);
  const xpForNext = next ? next.minXp - rank.minXp : null;
  const xpProgress = next
    ? ((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100
    : 100;

  const earnedSet = new Set(earned);
  const earnedDefs = ACHIEVEMENTS.filter((a) => earnedSet.has(a.id)).slice(0, 12);
  const totalAchievements = ACHIEVEMENTS.length;

  const isGuest = !user || user.mode === "guest";
  const displayName = user?.displayName ?? user?.username ?? "Guest Driver";

  function handleCopy() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const hydrated = authHydrated && progressionHydrated && achievementsHydrated;

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-mono text-sm text-fog animate-pulse">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-10">

      {/* ── Guest notice ─────────────────────────────────────────── */}
      {isGuest && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-5 py-3 flex items-center gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <p className="text-sm text-amber-200/80">
            You&apos;re playing as a guest. Progress is saved locally.{" "}
            <Link href="/auth/register" className="underline text-amber-400 hover:text-amber-300">
              Sign up
            </Link>{" "}
            to save progress permanently.
          </p>
        </div>
      )}

      {/* ── Hero section ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-ink-950/70 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            {/* Avatar placeholder + name */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold text-white ring-2 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${rank.color}33, ${rank.color}88)` }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white truncate">{displayName}</h1>
                {user?.email && (
                  <p className="text-sm text-fog truncate">{user.email}</p>
                )}
              </div>
            </div>

            {/* Rank badge */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                style={{
                  color: rank.color,
                  borderColor: `${rank.color}50`,
                  background: `${rank.color}12`,
                }}
              >
                ◆ {rank.name}
              </span>
              <span className="font-mono text-sm text-fog">
                {xp.toLocaleString()} XP
              </span>
              <span className="font-mono text-sm" style={{ color: "#e8b84a" }}>
                🪙 {coins.toLocaleString()}
              </span>
            </div>

            {/* XP progress bar */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-fog">
                  {next ? `Progress to ${next.name}` : "Maximum rank achieved"}
                </span>
                {next && (
                  <span className="font-mono text-xs text-fog">
                    {(xp - rank.minXp).toLocaleString()} / {xpForNext?.toLocaleString()} XP
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, xpProgress)}%`,
                    background: `linear-gradient(90deg, ${rank.color}90, ${rank.color})`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Copy profile link */}
          <button
            onClick={handleCopy}
            className="self-start shrink-0 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-fog transition hover:border-white/20 hover:text-white active:scale-95"
          >
            {copied ? "✓ Copied!" : "🔗 Copy Profile Link"}
          </button>
        </div>
      </section>

      {/* ── Stats grid ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-fog">
          Stats
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon="🏁"
            label="Races"
            value={stats.racesCompleted.toLocaleString()}
            sub={`${stats.racesWon} won`}
          />
          <StatCard
            icon="🔥"
            label="Best Streak"
            value={`${stats.currentStreak}d`}
            sub={stats.driftSeconds > 0 ? `${formatDrift(stats.driftSeconds)} drift` : undefined}
          />
          <StatCard
            icon="⚡"
            label="Top Speed"
            value={stats.topSpeedKph > 0 ? `${Math.round(stats.topSpeedKph)} km/h` : "—"}
          />
          <StatCard
            icon="🗺️"
            label="Maps Raced"
            value={`${stats.mapsRaced.size}/9`}
            sub={stats.mapsRaced.size === 9 ? "Globe Trotter!" : undefined}
          />
        </div>
      </section>

      {/* ── Achievements section ─────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-fog">
            Achievements
          </h2>
          <span className="font-mono text-xs text-fog">
            {earned.length} / {totalAchievements}
          </span>
        </div>

        {earnedDefs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {earnedDefs.map((ach) => (
              <div
                key={ach.id}
                title={`${ach.name}: ${ach.description}`}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-ink-950/50 p-3 text-center transition hover:border-white/20"
              >
                <span className="text-2xl">{ach.icon}</span>
                <span className="text-[10px] leading-tight text-fog">{ach.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-fog">
            Complete races to earn achievements
          </p>
        )}

        {earned.length > 12 && (
          <p className="mt-3 text-center text-xs text-fog/60">
            +{earned.length - 12} more earned
          </p>
        )}
      </section>

      {/* ── Personal Bests table ─────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-fog">
          Personal Bests
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-ink-950/80">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-fog">
                  Map
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-fog">
                  Best Time
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-fog">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody>
              {ALL_MAPS.map((map, idx) => {
                const best = personalBests[map.slug];
                const rankLabel = best != null ? timeRank(best) : null;
                return (
                  <tr
                    key={map.slug}
                    className={`border-b border-white/5 transition hover:bg-white/3 ${idx % 2 === 0 ? "bg-ink-950/30" : ""}`}
                  >
                    <td className="px-4 py-3 text-white">{map.name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-fog">
                      {best != null ? formatLapTime(best) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rankLabel != null ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-semibold ${timeRankColor(rankLabel)} bg-white/5`}
                        >
                          {rankLabel}
                        </span>
                      ) : (
                        <span className="text-fog/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-fog">
          Recent Activity
        </h2>
        {recentAttempts.length > 0 ? (
          <div className="space-y-2">
            {recentAttempts.map((attempt) => {
              const mapName =
                ALL_MAPS.find(
                  (m) => m.slug === attempt.routeSlug || m.id === attempt.routeId,
                )?.name ?? attempt.routeSlug;
              const date = new Date(attempt.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-ink-950/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{attempt.isValid ? "🏁" : "❌"}</span>
                    <div>
                      <p className="text-sm text-white">{mapName}</p>
                      <p className="text-xs text-fog">{date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-white">
                      {formatLapTime(attempt.completionTimeMs)}
                    </p>
                    {!attempt.isValid && (
                      <p className="text-xs text-rose-400">Invalid</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-fog">
            No races recorded yet — head to{" "}
            <Link href="/" className="text-accent-bright underline hover:text-white">
              the track
            </Link>
            !
          </p>
        )}
      </section>
    </div>
  );
}
