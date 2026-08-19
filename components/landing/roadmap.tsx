const roadmap = [
  {
    phase: "Now",
    title: "Foundation",
    items: ["Landing & route library", "Mock data mode", "Local development"],
  },
  {
    phase: "Next",
    title: "Drive",
    items: ["3D arcade vehicle", "Checkpoints & timing", "Personal bests"],
  },
  {
    phase: "Then",
    title: "Compete",
    items: ["Accounts & profiles", "Leaderboards", "Challenge links"],
  },
  {
    phase: "Later",
    title: "Expand",
    items: [
      "More cities",
      "Licensed imagery pipeline",
      "Richer procedural scenery",
    ],
  },
];

export function Roadmap() {
  return (
    <section className="border-line border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            Roadmap
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
            Built in small, testable milestones
          </h2>
          <p className="text-mist mt-3">
            We are shipping a focused MVP first — not the entire long-term
            vision at once.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((item) => (
            <article
              key={item.title}
              className="border-line bg-panel/40 rounded-lg border p-5"
            >
              <p className="text-fog font-mono text-[11px] tracking-[0.18em] uppercase">
                {item.phase}
              </p>
              <h3 className="mt-2 text-lg text-white">{item.title}</h3>
              <ul className="text-mist mt-4 space-y-2 text-sm">
                {item.items.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="bg-accent mt-2 h-1 w-1 shrink-0 rounded-full" />
                    <span>{line}</span>
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
