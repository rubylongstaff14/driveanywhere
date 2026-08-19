import type { RouteSummary } from "@/types/route";
import { RouteCard } from "@/components/routes/route-card";

interface RouteGridProps {
  routes: RouteSummary[];
}

export function RouteGrid({ routes }: RouteGridProps) {
  if (routes.length === 0) {
    return (
      <p className="border-line bg-panel/40 text-mist rounded-lg border p-6">
        No published routes are available yet.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {routes.map((route) => (
        <RouteCard key={route.id} route={route} />
      ))}
    </div>
  );
}
