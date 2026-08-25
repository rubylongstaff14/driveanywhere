"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RaceResult } from "@/lib/multiplayer/protocol";
import {
  biggestGainSector,
  smoothDeltaSeries,
  timeAtProgress,
} from "@/lib/game/route-progress";
import type { RouteData } from "@/lib/validation/route-data";

interface TrackDeltaOverviewProps {
  route: RouteData;
  results: RaceResult[];
  myId: string | null;
  width?: number;
  height?: number;
}

/**
 * Post-race angled track map with a rise/fall delta ribbon (vs leader)
 * and hysteresis-stable sector colours for who was fastest.
 */
export function TrackDeltaOverview({
  route,
  results,
  myId,
  width = 440,
  height = 300,
}: TrackDeltaOverviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const finished = useMemo(
    () =>
      results.filter((r) => {
        if (!r.finished) return false;
        const path = r.path;
        return Boolean(path && path.length >= 2);
      }),
    [results],
  );

  const me = finished.find((r) => r.playerId === myId) ?? null;
  const leader = finished[0] ?? null;
  const gain = useMemo(() => {
    if (!me?.path || !leader?.path || me.playerId === leader.playerId) return null;
    return biggestGainSector(me.path, leader.path);
  }, [leader, me]);

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
    const padding = 28;
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    const scale = (Math.min(width, height) - padding * 2) / span;
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;

    // Slight isometric tilt so the track reads with depth
    const tilt = 0.52;
    const skew = 0.28;
    const toScreen = (x: number, z: number, lift = 0): [number, number] => {
      const dx = (x - centreX) * scale;
      const dz = (z - centreZ) * scale;
      const sx = width / 2 + dx + dz * skew;
      const sy = height * 0.58 + dz * tilt - lift;
      return [sx, sy];
    };

    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "rgba(10, 16, 26, 0.96)");
    bg.addColorStop(1, "rgba(6, 10, 16, 0.98)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Soft ground plane shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    route.roadPoints.forEach((pt, i) => {
      const [sx, sy] = toScreen(pt.x, pt.z, -6);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.lineWidth = 18;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();

    // Base track
    ctx.strokeStyle = "rgba(90, 110, 130, 0.4)";
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    route.roadPoints.forEach((pt, i) => {
      const [sx, sy] = toScreen(pt.x, pt.z);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    const segs = 72;
    const roadAt = (p: number) => {
      const idx = Math.min(
        route.roadPoints.length - 1,
        Math.max(0, p * (route.roadPoints.length - 1)),
      );
      const i0 = Math.floor(idx);
      const i1 = Math.min(route.roadPoints.length - 1, i0 + 1);
      const u = idx - i0;
      const a = route.roadPoints[i0];
      const b = route.roadPoints[i1];
      return {
        x: a.x + (b.x - a.x) * u,
        z: a.z + (b.z - a.z) * u,
      };
    };

    const palette = [
      "#e11d48",
      "#10b981",
      "#3b82f6",
      "#f59e0b",
      "#a855f7",
      "#06b6d4",
    ];
    const paintFor = (r: RaceResult, idx: number) =>
      r.paint && /^#[0-9a-fA-F]{6}$/.test(r.paint)
        ? r.paint
        : palette[idx % palette.length];

    // Sector colour with hysteresis — avoids flicker when times are close
    if (finished.length > 0) {
      let lastPaint = paintFor(finished[0], 0);
      let lastBest = Infinity;
      for (let i = 0; i < segs; i += 1) {
        const mid = (i + 0.5) / segs;
        let best: RaceResult | null = null;
        let bestIdx = 0;
        let bestT = Infinity;
        finished.forEach((r, idx) => {
          const t = timeAtProgress(r.path!, mid);
          if (t != null && t < bestT) {
            bestT = t;
            best = r;
            bestIdx = idx;
          }
        });
        if (!best) continue;
        const candidate = paintFor(best, bestIdx);
        if (i === 0 || bestT < lastBest - 90 || candidate === lastPaint) {
          lastPaint = candidate;
          lastBest = bestT;
        }

        const a = roadAt(i / segs);
        const b = roadAt((i + 1) / segs);
        const [sx0, sy0] = toScreen(a.x, a.z);
        const [sx1, sy1] = toScreen(b.x, b.z);
        ctx.strokeStyle = lastPaint;
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Rise / fall delta ribbon vs leader (smooth, cumulative)
    if (me?.path && leader?.path && me.playerId !== leader.playerId) {
      const series = smoothDeltaSeries(me.path, leader.path, 80);
      const peak = Math.max(
        120,
        ...series.map((s) => Math.abs(s.deltaMs)),
      );
      const maxLift = 28;

      // Filled ribbon polygon
      ctx.beginPath();
      for (let i = 0; i < series.length; i += 1) {
        const s = series[i];
        const pt = roadAt(s.p);
        // Negative delta (ahead) rises; positive (behind) falls
        const lift = (-s.deltaMs / peak) * maxLift;
        const [sx, sy] = toScreen(pt.x, pt.z, lift);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      for (let i = series.length - 1; i >= 0; i -= 1) {
        const s = series[i];
        const pt = roadAt(s.p);
        const [sx, sy] = toScreen(pt.x, pt.z, 0);
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 40, 0, height - 20);
      fill.addColorStop(0, "rgba(16,185,129,0.35)");
      fill.addColorStop(0.5, "rgba(148,163,184,0.12)");
      fill.addColorStop(1, "rgba(244,63,94,0.32)");
      ctx.fillStyle = fill;
      ctx.fill();

      // Stroke the delta crest
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < series.length; i += 1) {
        const s = series[i];
        const pt = roadAt(s.p);
        const lift = (-s.deltaMs / peak) * maxLift;
        const [sx, sy] = toScreen(pt.x, pt.z, lift);
        const ahead = s.deltaMs <= 0;
        ctx.strokeStyle = ahead
          ? "rgba(52,211,153,0.95)"
          : "rgba(251,113,133,0.9)";
        if (i === 0) ctx.moveTo(sx, sy);
        else {
          ctx.lineTo(sx, sy);
          // Stroke in chunks so colour follows gain/loss
          if (i % 4 === 0) {
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.strokeStyle = ahead
              ? "rgba(52,211,153,0.95)"
              : "rgba(251,113,133,0.9)";
          }
        }
      }
      ctx.stroke();
    }

    // Start / finish
    const start = route.roadPoints[0];
    const finishPt = route.roadPoints[route.roadPoints.length - 1];
    if (start) {
      const [sx, sy] = toScreen(start.x, start.z, 4);
      ctx.fillStyle = "#e8eef7";
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (finishPt) {
      const [sx, sy] = toScreen(finishPt.x, finishPt.z, 4);
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [finished, height, leader, me, route.roadPoints, width]);

  return (
    <div className="rounded-xl border border-white/5 bg-ink-975 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-mist">
        Delta track — ribbon rises when you&apos;re ahead, falls when behind
      </p>
      <canvas
        ref={canvasRef}
        style={{ width, height, maxWidth: "100%" }}
        className="mx-auto block rounded-lg"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {results.map((r) => {
          const color = r.paint ?? "#94a3b8";
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
      {gain && (
        <p className="mt-2 text-[10px] text-emerald-400/90">
          Biggest gain: sector {gain.band} (−{(gain.gainMs / 1000).toFixed(2)}s
          vs leader)
        </p>
      )}
      {finished.length >= 2 && (
        <p className="mt-1 text-[9px] text-mist/80">
          Track colour = who was fastest on that stretch (stable). Ribbon = your
          live time gap vs P1 along the lap.
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
