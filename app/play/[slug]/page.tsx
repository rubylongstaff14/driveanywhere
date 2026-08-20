import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameExperience } from "@/components/game/game-experience";
import { parseRaceSetup } from "@/lib/game/race-setup";
import { getPublishedRoutes, getRouteBySlug } from "@/lib/routes/get-routes";
import { getRouteData } from "@/lib/routes/route-registry";

interface PlayPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    mode?: string | string[];
    ai?: string | string[];
    difficulty?: string | string[];
    ghost?: string | string[];
    weather?: string | string[];
    vehicle?: string | string[];
    roomId?: string | string[];
  }>;
}

export async function generateStaticParams() {
  const routes = await getPublishedRoutes();
  return routes.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({
  params,
}: PlayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);
  return {
    title: route ? `Play · ${route.name}` : "Play",
  };
}

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const route = await getRouteBySlug(slug);
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const raceSetup = parseRaceSetup({
    mode: first(query.mode),
    ai: first(query.ai),
    difficulty: first(query.difficulty),
    ghost: first(query.ghost),
    weather: first(query.weather),
    vehicle: first(query.vehicle),
  });

  // Geometry is resolved on the server so the browser never has to fetch it.
  const routeData = route ? getRouteData(route.slug) : null;

  if (!route || !routeData) {
    notFound();
  }

  return (
    <GameExperience
      route={routeData}
      routeName={route.name}
      routeSlug={route.slug}
      raceSetup={raceSetup}
    />
  );
}
