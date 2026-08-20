"use client";

import { useEffect, useState } from "react";
import { CinematicLoader } from "@/components/game/cinematic-loader";

export function CircuitBoot({
  routeName,
  city,
}: {
  routeName: string;
  city: string;
}) {
  const [progress, setProgress] = useState(8);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setProgress(8);
    setDone(false);
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + (p < 70 ? 9 : 4)));
    }, 140);
    const finish = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => setDone(true), 280);
    }, 2100);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(finish);
    };
  }, [routeName]);

  if (done) return null;

  return (
    <div className="absolute inset-0 z-50">
      <CinematicLoader
        title={routeName}
        subtitle={`Staging ${city} — lighting, colliders, skyline`}
        progress={progress}
      />
    </div>
  );
}
