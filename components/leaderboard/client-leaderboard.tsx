"use client";

import { useSyncExternalStore } from "react";
import {
  getPersonalBest,
  readAttempts,
  type AttemptRecord,
} from "@/lib/database/mock/attempts";
import {
  getMergedLeaderboardPreview,
  getMergedRouteLeaderboard,
} from "@/lib/routes/leaderboard";
import { formatLapTime } from "@/lib/utils/format";
import type { LeaderboardEntry } from "@/types/route";
import { useAuthStore } from "@/stores/auth-store";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";

function subscribeAttempts(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = (event: StorageEvent) => {
    if (event.key === "driveanywhere.attempts") onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("driveanywhere-attempts", onStoreChange);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("driveanywhere-attempts", onStoreChange);
  };
}

function getAttemptsSnapshot() {
  return JSON.stringify(readAttempts());
}

function getServerAttemptsSnapshot() {
  return "[]";
}

export function RecentAttemptsPanel() {
  const user = useAuthStore((s) => s.user);
  const raw = useSyncExternalStore(
    subscribeAttempts,
    getAttemptsSnapshot,
    getServerAttemptsSnapshot,
  );
  const attempts: AttemptRecord[] = user
    ? (JSON.parse(raw) as AttemptRecord[])
        .filter((attempt) => attempt.userId === user.id)
        .slice(0, 8)
    : [];

  if (!user) return null;

  return (
    <div className="rounded-xl border border-line bg-panel/40 p-5">
      <h2 className="text-lg text-white">Recent attempts</h2>
      {attempts.length === 0 ? (
        <p className="mt-2 text-sm text-mist">
          No attempts yet. Finish a route and submit your time.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {attempts.map((attempt) => {
            const routeName =
              MOCK_ROUTES.find((route) => route.id === attempt.routeId)?.name ??
              attempt.routeSlug;
            return (
              <li
                key={attempt.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="text-white">{routeName}</p>
                  <p className="text-xs text-fog">
                    {attempt.isValid ? "Valid" : attempt.invalidReason}
                  </p>
                </div>
                <span className="font-mono text-accent-bright">
                  {formatLapTime(attempt.completionTimeMs)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RoutePersonalBest({ routeId }: { routeId: string }) {
  const user = useAuthStore((s) => s.user);
  useSyncExternalStore(
    subscribeAttempts,
    getAttemptsSnapshot,
    getServerAttemptsSnapshot,
  );
  const best = user ? getPersonalBest(user.id, routeId) : null;

  return <span className="text-white">{formatLapTime(best)}</span>;
}

export function ClientLeaderboard({
  routeId,
  limit = 10,
}: {
  routeId?: string;
  limit?: number;
}) {
  useSyncExternalStore(
    subscribeAttempts,
    getAttemptsSnapshot,
    getServerAttemptsSnapshot,
  );

  const parsed: LeaderboardEntry[] = routeId
    ? getMergedRouteLeaderboard(routeId, limit)
    : getMergedLeaderboardPreview(limit);

  const routeNameById = new Map(
    MOCK_ROUTES.map((route) => [route.id, route.name]),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Leaderboard</caption>
        <thead className="bg-panel font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            {!routeId ? (
              <th className="px-4 py-3 font-medium">Route</th>
            ) : null}
            <th className="px-4 py-3 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {parsed.map((entry, index) => (
            <tr
              key={entry.id}
              className="border-t border-line/80 odd:bg-panel/30"
            >
              <td className="px-4 py-3 font-mono text-fog">{index + 1}</td>
              <td className="px-4 py-3 text-white">
                {entry.displayName}
                {entry.isGuest ? (
                  <span className="ml-2 text-xs text-fog">guest</span>
                ) : null}
              </td>
              {!routeId ? (
                <td className="px-4 py-3 text-mist">
                  {routeNameById.get(entry.routeId) ?? "Unknown"}
                </td>
              ) : null}
              <td className="px-4 py-3 font-mono text-accent-bright">
                {formatLapTime(entry.completionTimeMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
