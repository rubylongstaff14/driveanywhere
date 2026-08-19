import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { RouteSummary } from "@/types/route";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { FavouriteButton } from "@/components/routes/favourite-button";
import {
  formatDifficulty,
  formatDistance,
  formatDuration,
  formatLapTime,
} from "@/lib/utils/format";

interface RouteCardProps {
  route: RouteSummary;
}

export function RouteCard({ route }: RouteCardProps) {
  const difficultyTone =
    route.difficulty === "easy"
      ? "success"
      : route.difficulty === "medium"
        ? "warning"
        : "accent";

  return (
    <article className="group border-line bg-panel/50 hover:border-fog/35 flex h-full flex-col overflow-hidden rounded-xl border transition-colors">
      <Link
        href={`/routes/${route.slug}`}
        className="bg-ink-900 focus-visible:ring-accent relative block aspect-[16/10] overflow-hidden focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <Image
          src={route.thumbnail}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="from-ink-950/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between gap-2">
          <Badge tone={difficultyTone}>
            {formatDifficulty(route.difficulty)}
          </Badge>
          <span className="text-fog font-mono text-xs">{route.city}</span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className="text-lg font-medium text-white">
            <Link
              href={`/routes/${route.slug}`}
              className="hover:text-accent-bright focus-visible:ring-accent focus-visible:ring-2 focus-visible:outline-none"
            >
              {route.name}
            </Link>
          </h3>
          <p className="text-mist mt-2 line-clamp-2 text-sm">
            {route.description}
          </p>
        </div>

        <dl className="text-fog grid grid-cols-2 gap-3 font-mono text-[11px] tracking-[0.12em] uppercase">
          <div>
            <dt>Distance</dt>
            <dd className="mt-1 text-sm tracking-normal text-white normal-case">
              {formatDistance(route.distanceMetres)}
            </dd>
          </div>
          <div>
            <dt>Est. time</dt>
            <dd className="mt-1 text-sm tracking-normal text-white normal-case">
              {formatDuration(route.estimatedDurationSeconds)}
            </dd>
          </div>
          <div>
            <dt>Best</dt>
            <dd className="text-accent-bright mt-1 text-sm tracking-normal normal-case">
              {formatLapTime(route.bestTimeMs)}
            </dd>
          </div>
          <div>
            <dt>Attempts</dt>
            <dd className="mt-1 text-sm tracking-normal text-white normal-case">
              {route.attemptCount}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {route.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          <ButtonLink href={`/play/${route.slug}`} className="flex-1" size="sm">
            <Play className="h-4 w-4" aria-hidden />
            Play
          </ButtonLink>
          <FavouriteButton routeId={route.id} routeName={route.name} />
        </div>
      </div>
    </article>
  );
}
