"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";

export function EarlyAccess() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("saved");
    setEmail("");
  }

  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        {/* Main CTA */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(245,166,35,0.10),rgba(167,139,250,0.06)_50%,transparent),#0d121b] p-8 sm:p-10 md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
                Play now · Free · No download
              </p>
              <h2 className="font-display mt-3 text-3xl tracking-tight text-white sm:text-4xl">
                Race starts in your browser
              </h2>
              <p className="text-mist mt-3 max-w-md leading-relaxed">
                Nine real-world city tracks. Live multiplayer rooms.
                Achievements, cosmetics, daily challenges.
                No install — click and race.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/play/online" size="lg">
                  Play Online
                </ButtonLink>
                <ButtonLink href="/routes" variant="secondary" size="lg">
                  View All Maps
                </ButtonLink>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "9", label: "City maps" },
                { value: "4", label: "Vehicle classes" },
                { value: "40+", label: "Achievements" },
                { value: "∞", label: "Daily challenges" },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center"
                >
                  <p className="font-display text-3xl font-bold text-white">{value}</p>
                  <p className="text-fog mt-1 text-xs tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-line rounded-xl border bg-panel/30 p-6">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            Stay in the loop
          </p>
          <h3 className="font-display mt-2 text-xl text-white">
            Get notified when new maps and features drop
          </h3>
          <form
            onSubmit={handleSubmit}
            className="mt-4 flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="early-access-email">
              Email address
            </label>
            <input
              id="early-access-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status === "saved") setStatus("idle");
              }}
              placeholder="you@example.com"
              className="border-line bg-ink-950 placeholder:text-fog/60 focus-visible:ring-accent h-11 flex-1 rounded-lg border px-3 text-sm text-white focus-visible:ring-2 focus-visible:outline-none"
            />
            <Button type="submit" variant="primary">
              Notify me
            </Button>
          </form>
          <p
            className="mt-2.5 min-h-5 text-sm text-emerald-300"
            role="status"
            aria-live="polite"
          >
            {status === "saved" ? "You're on the list — we'll be in touch." : null}
          </p>
        </div>
      </div>
    </section>
  );
}
