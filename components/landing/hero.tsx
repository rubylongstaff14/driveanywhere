import { Flag, Gauge, Share2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export function Hero() {
  return (
    <section className="border-line relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(245,166,35,0.18),transparent_45%),radial-gradient(ellipse_at_90%_20%,rgba(56,189,248,0.12),transparent_40%),linear-gradient(180deg,#07090d_0%,#0b1018_55%,#07090d_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] [background-size:48px_48px] opacity-[0.12]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:py-24 lg:py-28">
        <div className="space-y-7">
          <p className="text-accent font-mono text-xs tracking-[0.28em] uppercase">
            London prototype routes
          </p>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            DriveAnywhere
            <span className="text-accent">.ai</span>
          </h1>
          <p className="text-mist max-w-xl text-lg leading-relaxed">
            Race simplified versions of real London routes and challenge your
            friends for the fastest time.
          </p>
          <p className="text-fog max-w-xl text-sm leading-relaxed">
            Browser-based arcade driving on prepared, lightweight 3D routes —
            not photoreal digital twins.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/routes" size="lg">
              Play a route
            </ButtonLink>
            <ButtonLink href="/register" variant="secondary" size="lg">
              Create account
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3 self-center">
          <TelemetryCard
            icon={<Gauge className="text-accent h-4 w-4" />}
            label="Live timing"
            value="Checkpoint-accurate laps"
          />
          <TelemetryCard
            icon={<Flag className="h-4 w-4 text-sky-300" />}
            label="Prepared London routes"
            value="Short, fast-loading sprints"
          />
          <TelemetryCard
            icon={<Share2 className="h-4 w-4 text-emerald-300" />}
            label="Challenge links"
            value="Share a time. Beat a friend."
          />
        </div>
      </div>
    </section>
  );
}

function TelemetryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line bg-panel/70 rounded-lg border p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-fog font-mono text-[11px] tracking-[0.18em] uppercase">
          {label}
        </p>
      </div>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
