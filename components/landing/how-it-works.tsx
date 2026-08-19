import { Map, Share2, Timer, Trophy } from "lucide-react";

const steps = [
  {
    icon: Map,
    title: "Pick a London route",
    body: "Choose a short prepared sprint designed to load quickly in the browser.",
  },
  {
    icon: Timer,
    title: "Drive and beat the clock",
    body: "Pass checkpoints in order, finish clean, and lock in your personal best.",
  },
  {
    icon: Share2,
    title: "Share a challenge",
    body: "Send a link with your target time and race friends on the same route.",
  },
  {
    icon: Trophy,
    title: "Climb the board",
    body: "Valid runs feed route leaderboards so the fastest times stay visible.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            How it works
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
            From map to lap in four steps
          </h2>
          <p className="text-mist mt-3">
            One purpose per step. No clutter — just drive, time, and compete.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="border-line bg-panel/50 rounded-lg border p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <step.icon className="text-accent h-5 w-5" aria-hidden />
                <span className="text-fog font-mono text-xs">0{index + 1}</span>
              </div>
              <h3 className="text-base font-medium text-white">{step.title}</h3>
              <p className="text-mist mt-2 text-sm leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
