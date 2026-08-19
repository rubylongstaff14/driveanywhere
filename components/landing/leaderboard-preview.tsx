import type { LeaderboardEntry, RouteSummary } from "@/types/route";
import { formatLapTime } from "@/lib/utils/format";
import { ButtonLink } from "@/components/ui/button-link";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
  routes: RouteSummary[];
}

export function LeaderboardPreview({
  entries,
  routes,
}: LeaderboardPreviewProps) {
  const routeNameById = new Map(routes.map((route) => [route.id, route.name]));

  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
              Leaderboard
            </p>
            <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
              Top seeded times
            </h2>
            <p className="text-mist mt-3 max-w-xl">
              Mock leaderboard data for local development. Your real runs land
              here in later milestones.
            </p>
          </div>
          <ButtonLink href="/leaderboard" variant="secondary" size="sm">
            Open leaderboard
          </ButtonLink>
        </div>

        <div className="border-line overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Preview of top lap times</caption>
            <thead className="bg-panel text-fog font-mono text-[11px] tracking-[0.16em] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Route
                </th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className="border-line/80 odd:bg-panel/30 border-t"
                >
                  <td className="text-fog px-4 py-3 font-mono">{index + 1}</td>
                  <td className="px-4 py-3 text-white">
                    {entry.displayName}
                    {entry.isGuest ? (
                      <span className="text-fog ml-2 text-xs">guest</span>
                    ) : null}
                  </td>
                  <td className="text-mist hidden px-4 py-3 sm:table-cell">
                    {routeNameById.get(entry.routeId) ?? "Unknown route"}
                  </td>
                  <td className="text-accent-bright px-4 py-3 font-mono">
                    {formatLapTime(entry.completionTimeMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
