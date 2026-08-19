import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Flag, MapPin, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  ClientLeaderboard,
  RoutePersonalBest,
} from "@/components/leaderboard/client-leaderboard";
import { FavouriteButton } from "@/components/routes/favourite-button";
import { getPublishedRoutes, getRouteBySlug } from "@/lib/routes/get-routes";
import {
  formatDifficulty,
  formatDistance,
  formatDuration,
  formatLapTime,
} from "@/lib/utils/format";

interface RouteDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const routes = await getPublishedRoutes();
  return routes.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({
  params,
}: RouteDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    return { title: "Route not found" };
  }

  return {
    title: route.name,
    description: route.description,
  };
}

export default async function RouteDetailPage({
  params,
}: RouteDetailPageProps) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="border-line bg-ink-900 relative mb-6 aspect-[16/9] overflow-hidden rounded-xl border">
            <Image
              src={route.thumbnail}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </div>

          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            {route.city}, {route.country}
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-tight text-white">
            {route.name}
          </h1>
          <p className="text-mist mt-4 max-w-2xl">{route.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="accent">{formatDifficulty(route.difficulty)}</Badge>
            {route.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat
              icon={<MapPin className="text-accent h-4 w-4" />}
              label="Distance"
              value={formatDistance(route.distanceMetres)}
            />
            <Stat
              icon={<Flag className="h-4 w-4 text-sky-300" />}
              label="Checkpoints"
              value={String(route.checkpointCount)}
            />
            <Stat
              icon={<Timer className="h-4 w-4 text-emerald-300" />}
              label="Estimated"
              value={formatDuration(route.estimatedDurationSeconds)}
            />
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/play/${route.slug}`} size="lg">
              Start route
            </ButtonLink>
            <ButtonLink href="/routes" variant="secondary" size="lg">
              Back to library
            </ButtonLink>
            <FavouriteButton
              routeId={route.id}
              routeName={route.name}
              withLabel
            />
          </div>

          <p className="text-fog mt-6 text-xs">{route.dataAttribution}</p>
        </div>

        <aside className="space-y-6">
          <div className="border-line bg-panel/50 rounded-xl border p-5">
            <h2 className="font-display text-xl text-white">Route facts</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact label="Surface" value={route.surfaceType} />
              <div className="border-line/70 flex items-center justify-between gap-3 border-b pb-3">
                <dt className="text-fog">Personal best</dt>
                <dd>
                  <RoutePersonalBest routeId={route.id} />
                </dd>
              </div>
              <Fact
                label="Seeded best"
                value={formatLapTime(route.bestTimeMs)}
              />
              <Fact label="Attempts" value={String(route.attemptCount)} />
            </dl>
            <p className="text-fog mt-4 text-xs">
              Challenge share links come later. Times you submit while playing
              are stored in this browser for now.
            </p>
          </div>

          <div className="border-line bg-panel/50 rounded-xl border p-5">
            <h2 className="font-display mb-4 text-xl text-white">
              Leaderboard preview
            </h2>
            <ClientLeaderboard routeId={route.id} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line bg-panel/40 rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <dt className="text-fog font-mono text-[11px] tracking-[0.16em] uppercase">
          {label}
        </dt>
      </div>
      <dd className="text-lg text-white">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line/70 flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <dt className="text-fog">{label}</dt>
      <dd className="text-white capitalize">{value}</dd>
    </div>
  );
}
