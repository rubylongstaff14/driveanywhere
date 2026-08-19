import Link from "next/link";
import type { RouteSummary } from "@/types/route";
import { RouteCard } from "@/components/routes/route-card";
import { ButtonLink } from "@/components/ui/button-link";

interface FeaturedRoutesProps {
  routes: RouteSummary[];
}

export function FeaturedRoutes({ routes }: FeaturedRoutesProps) {
  return (
    <section className="border-line border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
              Featured routes
            </p>
            <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
              Featured circuits
            </h2>
            <p className="text-mist mt-3">
              F1-inspired laps — Monaco streets, Monza straights, Silverstone
              flow and Spa rhythm — each built around landmark viewing.
            </p>
          </div>
          <ButtonLink href="/routes" variant="secondary" size="sm">
            View all routes
          </ButtonLink>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>

        <p className="text-fog mt-6 text-sm">
          Looking for something specific?{" "}
          <Link
            href="/routes"
            className="text-accent-bright underline-offset-4 hover:underline"
          >
            Browse the full route library
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
