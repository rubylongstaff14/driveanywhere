"use client";

import { useSyncExternalStore } from "react";
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
    <div className="bg-ink-975/90 absolute inset-0 z-30 flex items-center justify-center p-6">
      <div className="border-line bg-panel max-w-md rounded-xl border p-6">
        <h2 className="font-display text-2xl text-white">
          Mobile controls ready
        </h2>
        <p className="text-mist mt-3 text-sm leading-relaxed">
          Turn your phone sideways for the smoothest race. Graphics have been
          reduced automatically for mobile and the driving buttons appear at the
          bottom of the track.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="bg-accent text-ink-950 inline-flex h-11 items-center rounded-md px-5 text-sm font-medium"
            onClick={() => setDismissed(true)}
          >
            Start mobile race
          </button>
        </div>
      </div>
    </div>
  );
}
