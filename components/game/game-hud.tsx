"use client";

import { useEffect } from "react";
import { formatLapTime } from "@/lib/utils/format";
import { useGameStore } from "@/stores/game-store";

function SpeedoDial({
  speedKph,
  rpmNorm,
  gear,
  rpm,
}: {
  speedKph: number;
  rpmNorm: number;
  gear: number;
  rpm: number;
}) {
  const maxDisplay = 220;
  const speedAngle = -120 + (Math.min(speedKph, maxDisplay) / maxDisplay) * 240;
  const rpmAngle = -120 + Math.min(1, Math.max(0, rpmNorm)) * 240;
  const gearLabel = gear <= 0 ? "N" : String(gear);

  return (
    <div className="relative mx-auto h-[7.5rem] w-[7.5rem]">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="rgba(8,10,14,0.92)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="2"
        />
        <path
          d="M 20 88 A 46 46 0 1 1 100 88"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 20 88 A 46 46 0 1 1 100 88"
          fill="none"
          stroke={rpmNorm > 0.88 ? "#ff4d4d" : "#e8b84a"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, rpmNorm) * 180} 200`}
        />
        {Array.from({ length: 11 }, (_, i) => {
          const a = ((-120 + i * 24) * Math.PI) / 180;
          const x1 = 60 + Math.cos(a) * 42;
          const y1 = 60 + Math.sin(a) * 42;
          const x2 = 60 + Math.cos(a) * 48;
          const y2 = 60 + Math.sin(a) * 48;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={i % 2 === 0 ? 2 : 1}
            />
          );
        })}
        <g transform={`rotate(${speedAngle} 60 60)`}>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="22"
            stroke="#f4f6f8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        <g transform={`rotate(${rpmAngle} 60 60)`}>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="30"
            stroke="#e8b84a"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>
        <circle cx="60" cy="60" r="4" fill="#e8b84a" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
          km/h
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums text-white leading-none">
          {Math.round(speedKph)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-accent-bright">
            {gearLabel}
          </span>
          <span className="font-mono text-[9px] tabular-nums text-fog">
            {Math.round(rpm)} rpm
          </span>
        </div>
      </div>
    </div>
  );
}

export function GameHud({ routeName }: { routeName: string }) {
  const speedKph = useGameStore((s) => s.speedKph);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const checkpointIndex = useGameStore((s) => s.checkpointIndex);
  const checkpointTotal = useGameStore((s) => s.checkpointTotal);
  const progress = useGameStore((s) => s.progress);
  const personalBestMs = useGameStore((s) => s.personalBestMs);
  const started = useGameStore((s) => s.started);
  const finished = useGameStore((s) => s.finished);
  const gear = useGameStore((s) => s.gear);
  const rpm = useGameStore((s) => s.rpm);
  const rpmNorm = useGameStore((s) => s.rpmNorm);
  const raceMode = useGameStore((s) => s.raceMode);
  const aiCount = useGameStore((s) => s.aiCount);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const ghostEnabled = useGameStore((s) => s.ghostEnabled);
  const sectorIndex = useGameStore((s) => s.sectorIndex);
  const splitMs = useGameStore((s) => s.splitMs);
  const splitDeltaMs = useGameStore((s) => s.splitDeltaMs);
  const splitTone = useGameStore((s) => s.splitTone);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setHud = useGameStore((s) => s.setHud);

  useEffect(() => {
    if (splitMs == null) return;
    const id = window.setTimeout(() => {
      setHud({ splitMs: null, splitDeltaMs: null, splitTone: null });
    }, 3200);
    return () => window.clearTimeout(id);
  }, [setHud, splitMs]);

  const progressPct = Math.round(progress * 100);

  const deltaPb =
    personalBestMs && started ? elapsedMs - personalBestMs * progress : null;

  const sessionLabel =
    sessionConfirmed && (raceMode === "ai" || raceMode === "online") && aiCount > 0
      ? ` · ${aiCount} AI`
      : ghostEnabled && raceMode === "solo"
        ? " · Ghost"
        : raceMode === "online"
          ? " · Online"
          : " · Solo";

  const splitColor =
    splitTone === "purple"
      ? "text-violet-300"
      : splitTone === "green"
        ? "text-emerald-400"
        : splitTone === "red"
          ? "text-rose-400"
          : "text-white";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 select-none p-3 sm:p-4">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-2">
        {/* ---- Timer block ---- */}
        <div className="rounded-xl border border-white/12 bg-ink-950/78 px-4 py-2.5 backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog">
            {routeName}
            {sessionLabel}
          </p>
          <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums text-white drop-shadow">
            {started ? formatLapTime(elapsedMs) : "—:——.———"}
          </p>

          {personalBestMs ? (
            <p
              className={`mt-0.5 font-mono text-xs ${deltaPb !== null && deltaPb < 0 ? "text-emerald-400" : "text-amber-400"}`}
            >
              PB {formatLapTime(personalBestMs)}
              {deltaPb !== null && (
                <span className="ml-2">
                  {deltaPb < 0
                    ? `-${formatLapTime(-deltaPb)}`
                    : `+${formatLapTime(deltaPb)}`}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-0.5 font-mono text-[10px] text-fog">
              {started
                ? "No PB yet"
                : "Drive through the white gate to start"}
            </p>
          )}
        </div>

        {/* ---- Speedometer + auto gearbox ---- */}
        <div className="rounded-xl border border-white/12 bg-ink-950/78 px-3 py-2 backdrop-blur-sm">
          <SpeedoDial
            speedKph={speedKph}
            rpmNorm={rpmNorm}
            gear={gear}
            rpm={rpm}
          />
          <p className="mt-0.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-fog">
            Auto · {rpm > 0 ? `${Math.round(rpm)} rpm` : "idle"}
          </p>
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-fog/80">
            Cam {cameraMode} · C to cycle
          </p>
        </div>

        {/* ---- Checkpoint + progress ---- */}
        <div className="min-w-[200px] rounded-xl border border-white/12 bg-ink-950/78 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog">
              Checkpoint
            </p>
            <span className="font-mono text-sm tabular-nums text-white">
              {checkpointIndex}
              <span className="text-fog">/{checkpointTotal}</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-fog">{progressPct}%</p>
          {splitMs != null ? (
            <p className={`mt-1 font-mono text-xs tabular-nums ${splitColor}`}>
              S{Math.max(1, sectorIndex)} {formatLapTime(splitMs)}
              {splitDeltaMs != null ? (
                <span className="ml-1.5">
                  {splitDeltaMs < 0
                    ? `-${formatLapTime(-splitDeltaMs)}`
                    : `+${formatLapTime(splitDeltaMs)}`}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fog/80">
              Space — handbrake drift
            </p>
          )}
          {finished && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              Lap complete ✓
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
