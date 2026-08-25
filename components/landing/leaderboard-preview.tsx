import type { LeaderboardEntry, RouteSummary } from "@/types/route";
import { formatLapTime } from "@/lib/utils/format";
import { ButtonLink } from "@/components/ui/button-link";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
  routes: RouteSummary[];
}

const positionStyle = (index: number) => {
  if (index === 0) return "text-amber-400 font-bold";
  if (index === 1) return "text-slate-300 font-semibold";
  if (index === 2) return "text-amber-700 font-semibold";
  return "text-fog";
};

const positionLabel = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
};

export function LeaderboardPreview({
  entries,
  routes,
}: LeaderboardPreviewProps) {
  const routeNameById = new Map(routes.map((route) => [route.id, route.name]));

  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
              Leaderboard
            </p>
            <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
              Fastest lap times
            </h2>
            <p className="text-mist mt-3 max-w-xl">
              Race any route and your best valid lap lands here automatically.
              Beat the top time to take P1.
            </p>
          </div>
          <ButtonLink href="/leaderboard" variant="secondary" size="sm">
            Full leaderboard
          </ButtonLink>
        </div>

        <div className="border-line overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Top lap times leaderboard</caption>
            <thead className="border-line bg-panel border-b font-mono text-[11px] tracking-[0.16em] text-fog uppercase">
              <tr>
                <th className="w-12 px-4 py-3 font-medium">Pos</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Circuit
                </th>
                <th className="px-4 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    index === 0 ? "bg-amber-400/[0.03]" : ""
                  }`}
                >
                  <td className={`px-4 py-3.5 font-mono text-sm ${positionStyle(index)}`}>
                    {positionLabel(index)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-white">
                      {entry.displayName}
                    </span>
                    {entry.isGuest ? (
                      <span className="text-fog ml-2 rounded bg-white/6 px-1.5 py-0.5 font-mono text-[10px]">
                        guest
                      </span>
                    ) : null}
                  </td>
                  <td className="text-mist hidden px-4 py-3.5 sm:table-cell">
                    {routeNameById.get(entry.routeId) ?? "Unknown route"}
                  </td>
                  <td className="text-accent-bright px-4 py-3.5 text-right font-mono font-semibold tabular-nums">
                    {formatLapTime(entry.completionTimeMs)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-fog px-4 py-8 text-center text-sm"
                  >
                    No times recorded yet — be the first to set a lap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-fog mt-4 text-xs">
          Times are validated server-side. Ghost runs and invalid laps are excluded from rankings.
        </p>
      </div>
    </section>
  );
}
