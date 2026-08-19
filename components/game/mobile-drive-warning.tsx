"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useState } from "react";

function subscribe() {
  return () => undefined;
}

function getSnapshot() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  return coarse && narrow;
}

function getServerSnapshot() {
  return false;
}

export function MobileDriveWarning({ routeSlug }: { routeSlug: string }) {
  const likelyUnsupported = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  if (!likelyUnsupported || dismissed) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-975/90 p-6">
      <div className="max-w-md rounded-xl border border-line bg-panel p-6">
        <h2 className="font-display text-2xl text-white">Desktop recommended</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          This driving prototype is currently designed for desktop browsers. You
          can still browse routes, profiles and leaderboards on mobile.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/routes/${routeSlug}`}
            className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-ink-950"
          >
            Back to route
          </Link>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md border border-line px-5 text-sm text-fog"
            onClick={() => setDismissed(true)}
          >
            Try anyway
          </button>
        </div>
      </div>
    </div>
  );
}
