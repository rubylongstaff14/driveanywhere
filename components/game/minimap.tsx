"use client";

import { useEffect, useRef } from "react";
import { carTelemetry } from "@/lib/game/telemetry";
import type { RouteData } from "@/lib/validation/route-data";

interface MinimapProps {
  route: RouteData;
  size?: number;
}

/**
 * Draws the route outline and live car position on a 2D canvas.
 * Runs on its own animation frame and never touches React state.
 */
export function Minimap({ route, size = 168 }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const xs = route.roadPoints.map((p) => p.x);
    const zs = route.roadPoints.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const padding = 14;
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    const scale = (size - padding * 2) / span;
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;

    const toScreen = (x: number, z: number): [number, number] => [
      size / 2 + (x - centreX) * scale,
      size / 2 + (z - centreZ) * scale,
    ];

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      ctx.fillStyle = "rgba(8, 12, 18, 0.72)";
      ctx.fillRect(0, 0, size, size);

      // Road centreline
      ctx.strokeStyle = "rgba(148, 172, 200, 0.85)";
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      route.roadPoints.forEach((point, index) => {
        const [sx, sy] = toScreen(point.x, point.z);
        if (index === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Checkpoints, with the next one highlighted
      route.checkpoints.forEach((checkpoint, index) => {
        const [sx, sy] = toScreen(checkpoint.position.x, checkpoint.position.z);
        const isFinish = index === route.checkpoints.length - 1;
        ctx.fillStyle = isFinish
          ? "#34d399"
          : index === 0
            ? "#e8eef7"
            : "rgba(56, 189, 248, 0.9)";
        ctx.beginPath();
        ctx.arc(sx, sy, isFinish ? 3.6 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Car
      const [cx, cy] = toScreen(carTelemetry.x, carTelemetry.z);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-carTelemetry.yaw);
      ctx.fillStyle = carTelemetry.offRoad ? "#f97316" : "#f43f5e";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.2, 5);
      ctx.lineTo(-4.2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [route, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={`Minimap of ${route.name}`}
      className="rounded-xl border border-white/10 shadow-lg shadow-black/40"
      style={{ width: size, height: size }}
    />
  );
}
