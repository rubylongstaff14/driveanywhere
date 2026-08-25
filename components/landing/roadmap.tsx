const roadmap = [
  {
    phase: "Shipped",
    status: "done",
    title: "Online Multiplayer",
    items: [
      "Live rooms up to 8 players",
      "Turbo catch-up system",
      "Taunt wheel & chat",
      "Post-race heatmap",
      "Spectator mode",
    ],
  },
  {
    phase: "Shipped",
    status: "done",
    title: "9 World Cities",
    items: [
      "Westminster, Canary Wharf",
      "Dubai, Tokyo, Monaco",
      "Silverstone, Alps, Egypt",
      "Unreal-baked city density",
      "4 vehicle classes",
    ],
  },
  {
    phase: "Now",
    status: "active",
    title: "Progression & Retention",
    items: [
      "40 achievements",
      "Daily & weekly challenges",
      "Rank system (Rookie → Legend)",
      "Coin economy + crate drops",
      "Cosmetic garage",
    ],
  },
  {
    phase: "Next",
    status: "upcoming",
    title: "Graphics & Feel",
    items: [
      "Post-processing (bloom, SSAO)",
      "PBR car materials & clearcoat",
      "Weather variants per map",
      "Better physics tuning",
      "Controller support",
    ],
  },
  {
    phase: "Soon",
    status: "upcoming",
    title: "Competitive Layer",
    items: [
      "Ranked seasons",
      "Crew / clan system",
      "Weekly tournaments",
      "Ghost replay challenges",
      "Global leaderboards",
    ],
  },
  {
    phase: "Future",
    status: "upcoming",
    title: "Unreal / Steam",
    items: [
      "Unreal 5 native client",
      "Nanite + Lumen graphics",
      "Steam Early Access",
      "Cross-progression",
      "Dedicated ranked servers",
    ],
  },
];

const statusStyle: Record<string, string> = {
  done: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25",
  active: "bg-amber-400/15 text-amber-400 border-amber-400/25",
  upcoming: "bg-white/8 text-fog border-white/10",
};

const dotStyle: Record<string, string> = {
  done: "bg-emerald-400",
  active: "bg-amber-400 animate-pulse",
  upcoming: "bg-fog/40",
};

export function Roadmap() {
  return (
    <section className="border-line border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            Roadmap
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
            Where we&apos;re headed
          </h2>
          <p className="text-mist mt-3 text-base leading-relaxed">
            Multiplayer and 9 world maps are live. Now pushing hard on
            progression, graphics, and competitive play — with Steam and Unreal in sight.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.map((item) => (
            <article
              key={item.title}
              className={`border-line rounded-xl border p-5 transition-colors ${
                item.status === "active"
                  ? "bg-amber-400/[0.04] ring-1 ring-amber-400/20"
                  : item.status === "done"
                    ? "bg-emerald-400/[0.03]"
                    : "bg-panel/40"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-[0.14em] uppercase ${statusStyle[item.status]}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dotStyle[item.status]}`} />
                  {item.phase}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <ul className="mt-4 space-y-2">
                {item.items.map((line) => (
                  <li key={line} className="flex gap-2.5 text-sm">
                    <span
                      className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${
                        item.status === "done" ? "bg-emerald-400" : "bg-accent"
                      }`}
                    />
                    <span
                      className={
                        item.status === "done" ? "text-mist/70 line-through" : "text-mist"
                      }
                    >
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
