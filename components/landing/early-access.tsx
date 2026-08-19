"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EarlyAccess() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    // Milestone 1: local acknowledgement only — no external newsletter service.
    setStatus("saved");
    setEmail("");
  }

  return (
    <section className="border-line bg-ink-975/60 border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="border-line rounded-xl border bg-[linear-gradient(135deg,rgba(245,166,35,0.08),transparent_40%),#0d121b] p-6 sm:p-8 md:p-10">
          <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
            Early access
          </p>
          <h2 className="font-display mt-3 max-w-xl text-3xl tracking-tight text-white">
            Get notified as new London routes go live
          </h2>
          <p className="text-mist mt-3 max-w-xl text-sm">
            Leave an email for local MVP testing. Nothing is sent to a third
            party yet — this form stores nothing beyond this page session.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row"
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
                if (status === "saved") {
                  setStatus("idle");
                }
              }}
              placeholder="you@example.com"
              className="border-line bg-ink-950 placeholder:text-fog/60 focus-visible:ring-accent h-11 flex-1 rounded-md border px-3 text-sm text-white focus-visible:ring-2 focus-visible:outline-none"
            />
            <Button type="submit" variant="primary">
              Notify me
            </Button>
          </form>

          <p
            className="mt-3 min-h-5 text-sm text-emerald-300"
            role="status"
            aria-live="polite"
          >
            {status === "saved"
              ? "Thanks — interest noted for this local session."
              : null}
          </p>
        </div>
      </div>
    </section>
  );
}
