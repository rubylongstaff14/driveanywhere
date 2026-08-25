import Link from "next/link";
import { Trophy, Flame, Users, Star } from "lucide-react";

const features = [
  {
    href: "/tournament",
    icon: Trophy,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Tournaments",
    headline: "Race for coins",
    body: "Buy in with coins. Race 3 maps. Top points wins the entire pot.",
    badge: "New",
    badgeColor: "bg-amber-400/20 text-amber-400",
  },
  {
    href: "/hot-lap",
    icon: Flame,
    iconColor: "text-rose-400",
    bgColor: "bg-rose-400/10",
    label: "Daily Hot Lap",
    headline: "One attempt only",
    body: "New map every day. No retries. Your time posts instantly — publicly.",
    badge: "Daily",
    badgeColor: "bg-rose-400/20 text-rose-400",
  },
  {
    href: "/leaderboard",
    icon: Star,
    iconColor: "text-sky-300",
    bgColor: "bg-sky-300/10",
    label: "Weekly Prize",
    headline: "Win real prizes",
    body: "Fastest lap per week wins a real gift card. Leaderboard resets every Monday.",
    badge: "£25 this week",
    badgeColor: "bg-sky-300/20 text-sky-300",
  },
  {
    href: "/play/online",
    icon: Users,
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    label: "Multiplayer",
    headline: "Race live",
    body: "Create or join a room. Up to 8 drivers. Turbo, taunts, live standings.",
    badge: "Live",
    badgeColor: "bg-emerald-400/20 text-emerald-400",
  },
];

export function FeaturesStrip() {
  return (
    <section className="border-line border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-accent font-mono text-xs uppercase tracking-[0.22em]">
            What&apos;s new
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
            More reasons to race
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="border-line group relative flex flex-col rounded-xl border bg-panel/50 p-5 transition-colors hover:bg-panel/80"
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.bgColor}`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} aria-hidden />
              </div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
                  {f.label}
                </p>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${f.badgeColor}`}>
                  {f.badge}
                </span>
              </div>
              <p className="text-base font-semibold text-white">{f.headline}</p>
              <p className="text-fog mt-1.5 text-sm leading-relaxed">{f.body}</p>
              <span className="text-accent mt-4 text-xs font-medium transition-all group-hover:translate-x-0.5">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
