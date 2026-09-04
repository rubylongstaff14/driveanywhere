"use client";
import { useEffect } from "react";
const ROUTE_FILES = ["alps-mountain-pass","canary-wharf-loop","dubai-marina-circuit","egypt-pyramids","embankment-run","new-york-harbor-circuit","rio-coast-circuit","tokyo-drift-circuit","westminster-sprint"].map((slug) => `/routes/${slug}.json`);
export function RuntimeCache() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (registration) => {
      await navigator.serviceWorker.ready;
      if (!cancelled) (registration.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "CACHE_RACE_ASSETS", urls: ROUTE_FILES });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return null;
}
