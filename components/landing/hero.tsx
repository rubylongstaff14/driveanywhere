import { Flag, Gauge, Globe, Trophy, Users, Zap } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export function Hero() {
  return (
    <section className="border-line relative overflow-hidden border-b">
      {/* Background gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_-10%,rgba(245,166,35,0.22),transparent_60%),radial-gradient(ellipse_50%_60%_at_85%_30%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(ellipse_40%_40%_at_50%_100%,rgba(167,139,250,0.08),transparent_60%),linear-gradient(180deg,#07090d_0%,#0b1018_55%,#07090d_100%)]"
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] [background-size:48px_48px]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-28 lg:py-32">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] tracking-[0.22em] text-emerald-400 uppercase">
            V1.0.0 · Live online multiplayer · 9 world cities
          </span>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-7">
            <h1 className="font-display da-fade-up text-5xl leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Race real city
              <br />
              <span className="text-accent">streets.</span> Online.
            </h1>
            <p className="text-mist max-w-lg text-lg leading-relaxed">
              Arcade racing built from real-world data — Westminster, Dubai,
              Tokyo, Silverstone and more. Race strangers and friends in live
              multiplayer, or chase your personal best.
            </p>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/play/online" size="lg">
                Play Online Now
              </ButtonLink>
              <ButtonLink href="/routes" variant="secondary" size="lg">
                Solo Time Trial
              </ButtonLink>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              {[
                "Free to play",
                "No download",
                "Real-time multiplayer",
                "9 city maps",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-fog font-mono text-xs tracking-wide"
                >
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <StatCard
              icon={<Globe className="h-4 w-4 text-sky-300" />}
              label="World circuits"
              value="9 real cities"
              sub="London · Dubai · Tokyo · more"
            />
            <StatCard
              icon={<Users className="h-4 w-4 text-violet-300" />}
              label="Multiplayer"
              value="Live online rooms"
              sub="Race, spectate, taunt"
            />
            <StatCard
              icon={<Trophy className="text-accent h-4 w-4" />}
              label="Progression"
              value="Ranks · Crates · Cosmetics"
              sub="Rookie → Legend"
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-emerald-300" />}
              label="Turbo system"
              value="Draft & catch-up boost"
              sub="Slip-stream rivals ahead"
            />
          </div>
        </div>

        {/* Feature strip */}
        <div className="border-line mt-14 grid grid-cols-2 divide-x divide-white/8 rounded-xl border bg-white/[0.03] sm:grid-cols-4">
          {[
            {
              icon: Gauge,
              label: "Lap timing",
              desc: "Sector splits + PB delta",
            },
            { icon: Flag, label: "Checkpoints", desc: "Gate-based validation" },
            {
              icon: Users,
              label: "Up to 8 players",
              desc: "Live rooms with AI fill",
            },
            {
              icon: Trophy,
              label: "Achievements",
              desc: "40 unlockable badges",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex flex-col items-center px-4 py-5 text-center"
            >
              <Icon className="text-accent mb-2 h-5 w-5" aria-hidden />
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-fog mt-0.5 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-line bg-panel/60 rounded-xl border p-4 backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <p className="text-fog font-mono text-[11px] tracking-[0.18em] uppercase">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-fog mt-0.5 text-xs">{sub}</p>
    </div>
  );
}
