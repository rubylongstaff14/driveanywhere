import { Car, Map, Share2, Shield, Timer, Trophy, Users, Zap } from "lucide-react";

const steps = [
  {
    icon: Map,
    step: "01",
    title: "Pick a world city",
    body: "Choose from 9 cities — London, Dubai, Tokyo, Monaco, and more. Each route uses real road data baked into a fast 3D mesh.",
    color: "text-sky-300",
  },
  {
    icon: Car,
    step: "02",
    title: "Choose your car & kit",
    body: "F1 open-wheeler, GT, SUV, or hatchback. Unlock paints, body kits, aero wings and bumpers from the garage.",
    color: "text-violet-300",
  },
  {
    icon: Users,
    step: "03",
    title: "Race online or solo",
    body: "Join live multiplayer rooms with up to 8 drivers — or run solo time trials and ghost races. AI fills any empty spots.",
    color: "text-emerald-300",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Earn & level up",
    body: "Finish races to earn XP and coins. Unlock achievements, complete daily and weekly challenges, and climb from Rookie to Legend.",
    color: "text-accent",
  },
];

const features = [
  {
    icon: Zap,
    title: "Turbo & draft",
    desc: "Fall behind? Turbo kicks in. Get close enough and you feel the slipstream pull.",
  },
  {
    icon: Shield,
    title: "Clean lap tracking",
    desc: "Invalid runs flagged in real time — no barrier-banking your way to a PB.",
  },
  {
    icon: Share2,
    title: "Taunts & social",
    desc: "Push!, Nice!, Too close! — real-time taunt wheel feeds into a live message strip.",
  },
  {
    icon: Timer,
    title: "Sector splits",
    desc: "Mini-sector timing turns every lap into a debrief. Purple = PB pace.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            How it works
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
            Ready to race in under 30 seconds
          </h2>
          <p className="text-mist mt-3 text-base leading-relaxed">
            No download. No install. Real physics, real roads, real competition — straight in the browser.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.title}
              className="border-line bg-panel/50 group relative rounded-xl border p-5 transition-colors hover:bg-panel/80"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/6">
                  <step.icon className={`h-5 w-5 ${step.color}`} aria-hidden />
                </div>
                <span className="text-fog font-mono text-xs">{step.step}</span>
              </div>
              <h3 className="text-base font-semibold text-white">{step.title}</h3>
              <p className="text-mist mt-2 text-sm leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>

        {/* Feature grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="border-line flex gap-3 rounded-xl border bg-white/[0.025] p-4"
            >
              <f.icon className="text-accent mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-fog mt-1 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
