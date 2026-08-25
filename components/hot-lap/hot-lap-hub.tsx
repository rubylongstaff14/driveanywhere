"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatLapTime } from "@/lib/utils/format";
import {
  getHotLapState,
  getHotLapLeaderboard,
  getHotLapHistory,
  msUntilMidnightUTC,
  getTodaysHotLapMap,
  type HotLapEntry,
} from "@/lib/progression/hot-lap";

function useCountdown(getMsRemaining: () => number) {
  const [ms, setMs] = useState(getMsRemaining);
  useEffect(() => {
    const tick = setInterval(() => setMs(getMsRemaining()), 1000);
    return () => clearInterval(tick);
  }, [getMsRemaining]);
  return ms;
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="font-mono text-fog tabular-nums">{rank}</span>;
}

export function HotLapHub() {
  const [state, setState] = useState<HotLapEntry | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    rank: number;
    totalEntrants: number;
    coinsAwarded: number;
  } | null>(null);

  const midnightMs = useCountdown(msUntilMidnightUTC);
  const cd = formatCountdown(midnightMs);

  useEffect(() => {
    setState(getHotLapState());
  }, []);

  // Listen for hot lap submissions from the game
  useEffect(() => {
    function handleHotLapSubmit(e: Event) {
      const detail = (e as CustomEvent<{ rank: number; totalEntrants: number; coinsAwarded: number }>).detail;
      setSubmitResult(detail);
      setState(getHotLapState());
    }
    window.addEventListener("driveanywhere-hotlap-submitted", handleHotLapSubmit);
    return () => window.removeEventListener("driveanywhere-hotlap-submitted", handleHotLapSubmit);
  }, []);

  if (!state) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  const todayMap = getTodaysHotLapMap();
  const leaderboard = getHotLapLeaderboard(
    state.mapSlug,
    state.date,
    state.playerTimeMs,
  );
  const history = getHotLapHistory();

  return (
    <div className="space-y-8 da-fade-up">
      {/* Submit result banner */}
      {submitResult && (
        <div className="relative overflow-hidden rounded-xl border border-accent/40 bg-ink-950/90 p-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-transparent pointer-events-none" />
          <div className="relative text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Hot Lap Submitted!
            </p>
            <p className="mt-3 font-display text-5xl text-white">
              #{submitResult.rank}
            </p>
            <p className="mt-1 text-mist">
              of {submitResult.totalEntrants} drivers
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2">
              <span className="font-mono text-sm font-bold text-accent-bright">
                +{submitResult.coinsAwarded} coins
              </span>
            </div>
            <p className="mt-4 text-sm text-fog">
              Share your result:{" "}
              <span className="font-mono text-white">
                &quot;I ranked #{submitResult.rank} of {submitResult.totalEntrants} on today&apos;s OpenRace Hot Lap — {state.mapName}! {formatLapTime(state.playerTimeMs)}&quot;
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Today's challenge card */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-950/80 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-red-400">
              ⚡ ONE ATTEMPT ONLY — No retries
            </p>
            <h2 className="mt-3 font-display text-3xl text-white">
              {state.mapName}
            </h2>
            <p className="mt-2 text-sm text-mist">
              {state.totalEntrants} drivers competing today
            </p>

            {state.locked ? (
              <div className="mt-4 space-y-1">
                <p className="font-mono text-sm text-fog">Your time</p>
                <p className="font-mono text-3xl font-bold text-accent-bright">
                  {formatLapTime(state.playerTimeMs)}
                </p>
                {state.rank !== null && (
                  <p className="text-sm text-mist">
                    Rank{" "}
                    <span className="font-mono font-bold text-white">
                      #{state.rank}
                    </span>{" "}
                    of {state.totalEntrants}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-fog">
                  Today&apos;s best:{" "}
                  <span className="font-mono text-accent-bright">
                    {formatLapTime(state.topTimeMs)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-widest text-fog">
              Resets in
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <CountdownBlock value={cd.hours} label="hrs" />
              <span className="font-mono text-3xl font-bold text-accent/60 sm:text-4xl">:</span>
              <CountdownBlock value={cd.minutes} label="min" />
              <span className="font-mono text-3xl font-bold text-accent/60 sm:text-4xl">:</span>
              <CountdownBlock value={cd.seconds} label="sec" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="relative mt-6 flex flex-wrap gap-3">
          {state.locked ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 font-mono text-sm text-fog">
              🔒 Attempt locked for today
            </div>
          ) : (
            <Link
              href={`/play/${todayMap.slug}?hotlap=1`}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-mono text-sm font-bold text-ink-975 transition hover:bg-accent/90"
            >
              Race Now →
            </Link>
          )}
        </div>
      </div>

      {/* Today's leaderboard */}
      <div>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-fog">
          Today&apos;s Top Times
        </h3>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Today&apos;s hot lap leaderboard</caption>
            <thead className="bg-panel font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
              <tr>
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
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

      {/* History */}
      <div>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-fog">
          Recent Days
        </h3>
        <div className="space-y-2">
          {history.map((day) => (
            <div
              key={day.date}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/20 px-5 py-3"
            >
              <div>
                <p className="font-mono text-xs text-fog">{day.date}</p>
                <p className="mt-0.5 text-sm text-white">{day.mapName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-mist">
                  Winner:{" "}
                  <span className="font-medium text-white">{day.winnerName}</span>
                </p>
                <p className="font-mono text-xs text-accent-bright">
                  {formatLapTime(day.winnerTimeMs)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
