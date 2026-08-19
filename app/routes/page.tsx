import type { Metadata } from "next";
import { RouteGrid } from "@/components/routes/route-grid";
import { getPublishedRoutes } from "@/lib/routes/get-routes";

export const metadata: Metadata = {
  title: "Routes",
  description:
    "Browse short prepared London prototype routes for DriveAnywhere.ai.",
};

export default async function RoutesPage() {
  const routes = await getPublishedRoutes();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
          Route library
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-white">
          London prototypes
        </h1>
        <p className="text-mist mt-3">
          Three short courses for the MVP. These are simplified, playable
          approximations inspired by real-world layouts — not perfect digital
          twins.
        </p>
      </div>

      <RouteGrid routes={routes} />
    </div>
  );
}
