"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RaceResult } from "@/lib/multiplayer/protocol";
import { raceColorByHex, RACE_COLORS } from "@/lib/multiplayer/race-colors";
import { timeAtProgress } from "@/lib/game/route-progress";
import type { RouteData } from "@/lib/validation/route-data";

interface TrackDeltaOverviewProps {
  route: RouteData;
  results: RaceResult[];
  myId: string | null;
  width?: number;
  height?: number;
}

/**
 * Post-race track map: each segment coloured by who was fastest there
 * (universal race hex), plus per-player trails and a delta legend.
 */
export function TrackDeltaOverview({
  route,
  results,
  myId,
  width = 420,
  height = 280,
}: TrackDeltaOverviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const finished = useMemo(
    () =>
      results.filter(
        (r) => r.finished && r.path && r.path.length >= 2 && r.paint,
      ),
    [results],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const xs = route.roadPoints.map((p) => p.x);
    const zs = route.roadPoints.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const padding = 22;
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    const scale = (Math.min(width, height) - padding * 2) / span;
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;

    const toScreen = (x: number, z: number): [number, number] => [
      width / 2 + (x - centreX) * scale,
      height / 2 + (z - centreZ) * scale,
    ];

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(8, 12, 18, 0.92)";
    ctx.fillRect(0, 0, width, height);

    // Base track (dim)
    ctx.strokeStyle = "rgba(100, 120, 140, 0.35)";
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    route.roadPoints.forEach((pt, i) => {
      const [sx, sy] = toScreen(pt.x, pt.z);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    const segs = 48;
    if (finished.length > 0) {
      for (let i = 0; i < segs; i += 1) {
        const p0 = i / segs;
        const p1 = (i + 1) / segs;
        const mid = (p0 + p1) / 2;

        let best: RaceResult | null = null;
        let bestT = Infinity;
        for (const r of finished) {
          const t = timeAtProgress(r.path!, mid);
          if (t != null && t < bestT) {
            bestT = t;
            best = r;
          }
        }
        if (!best?.paint) continue;

        const i0 = Math.min(
          route.roadPoints.length - 1,
          Math.floor(p0 * (route.roadPoints.length - 1)),
        );
        const i1 = Math.min(
          route.roadPoints.length - 1,
          Math.ceil(p1 * (route.roadPoints.length - 1)),
        );
        const a = route.roadPoints[i0];
        const b = route.roadPoints[Math.max(i0, i1)];
        const [sx0, sy0] = toScreen(a.x, a.z);
        const [sx1, sy1] = toScreen(b.x, b.z);

        ctx.strokeStyle = best.paint;
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Per-player thin trails (same universal colour)
    for (const r of finished) {
      ctx.strokeStyle = r.paint!;
      ctx.lineWidth = r.playerId === myId ? 2.4 : 1.4;
      ctx.globalAlpha = r.playerId === myId ? 0.95 : 0.55;
      ctx.beginPath();
      let started = false;
      for (const s of r.path!) {
        const idx = Math.min(
          route.roadPoints.length - 1,
          Math.round(s.p * (route.roadPoints.length - 1)),
        );
        const pt = route.roadPoints[idx];
        const [sx, sy] = toScreen(pt.x, pt.z);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Start / finish markers
    const start = route.roadPoints[0];
    const finish = route.roadPoints[route.roadPoints.length - 1];
    if (start) {
      const [sx, sy] = toScreen(start.x, start.z);
      ctx.fillStyle = "#e8eef7";
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (finish) {
      const [sx, sy] = toScreen(finish.x, finish.z);
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Your delta vs leader ribbon (green = you faster, red = slower)
    const me = finished.find((r) => r.playerId === myId);
    const leader = finished[0];
    if (me && leader && me.playerId !== leader.playerId && me.path && leader.path) {
      ctx.lineWidth = 3;
      for (let i = 0; i < segs; i += 1) {
        const mid = (i + 0.5) / segs;
        const myT = timeAtProgress(me.path, mid);
        const leadT = timeAtProgress(leader.path, mid);
        if (myT == null || leadT == null) continue;
        const d = myT - leadT;
        const i0 = Math.min(
          route.roadPoints.length - 1,
          Math.floor((i / segs) * (route.roadPoints.length - 1)),
        );
        const i1 = Math.min(
          route.roadPoints.length - 1,
          Math.ceil(((i + 1) / segs) * (route.roadPoints.length - 1)),
        );
        const a = route.roadPoints[i0];
        const b = route.roadPoints[Math.max(i0, i1)];
        const [sx0, sy0] = toScreen(a.x, a.z);
        const [sx1, sy1] = toScreen(b.x, b.z);
        // Outer glow ribbon offset slightly — green gain / red loss
        ctx.strokeStyle = d <= 0 ? "rgba(16,185,129,0.85)" : "rgba(244,63,94,0.75)";
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();
      }
    }
  }, [finished, height, myId, route.roadPoints, width]);

  return (
    <div className="rounded-xl border border-white/5 bg-ink-975 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-mist">
        Track overview — colour = who was fastest on that sector
      </p>
      <canvas
        ref={canvasRef}
        style={{ width, height, maxWidth: "100%" }}
        className="mx-auto block rounded-lg"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {results.map((r) => {
          const color =
            raceColorByHex(r.paint)?.hex ??
            r.paint ??
            RACE_COLORS[(r.position - 1) % RACE_COLORS.length].hex;
          return (
            <div
              key={r.playerId}
              className="flex items-center gap-1.5 rounded-md bg-ink-950 px-2 py-1 text-[10px] text-white/80"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>
                P{r.position} {r.playerName}
                {r.playerId === myId ? " (you)" : ""}
              </span>
            </div>
          );
        })}
      </div>
      {finished.length >= 2 && (
        <p className="mt-2 text-[9px] text-mist/80">
          Outer ribbon: <span className="text-emerald-400">green</span> = you
          gaining vs leader · <span className="text-rose-400">red</span> = losing
          time. Colours match every screen.
        </p>
      )}
      {finished.length === 0 && (
        <p className="mt-2 text-[9px] text-mist/70">
          Heatmap needs path data from this race — run again after this update.
        </p>
      )}
    </div>
  );
}
