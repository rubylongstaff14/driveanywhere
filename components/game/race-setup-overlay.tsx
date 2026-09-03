"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AI_PAINTS,
  MAX_AI_CARS,
  MIN_AI_CARS,
  type RaceMode,
} from "@/lib/game/race-setup";
import { hasGhostTape } from "@/lib/game/ghost-tape";
import { WEATHER_OPTIONS, type WeatherId } from "@/lib/game/weather";
import { useGameStore } from "@/stores/game-store";

interface RaceSetupOverlayProps {
  routeName: string;
  routeId: string;
}

export function RaceSetupOverlay({ routeName, routeId }: RaceSetupOverlayProps) {
  const storedMode = useGameStore((s) => s.raceMode);
  const storedCount = useGameStore((s) => s.aiCount);
  const storedDifficulty = useGameStore((s) => s.difficulty);
  const storedWeather = useGameStore((s) => s.weather);
  const storedGhost = useGameStore((s) => s.ghostEnabled);
  const storedLapCount = useGameStore((s) => s.lapCount);
  const personalBestMs = useGameStore((s) => s.personalBestMs);
  const confirmSession = useGameStore((s) => s.confirmSession);
  const setGarageOpen = () =>
    useGameStore.setState({ garageConfirmed: false, paused: true });

  const ghostAvailable = useMemo(
    () => personalBestMs !== null && hasGhostTape(routeId),
    [personalBestMs, routeId],
  );

  const [mode, setMode] = useState<RaceMode>(storedMode);
  const [aiCount, setAiCount] = useState(
    storedCount >= MIN_AI_CARS ? storedCount : 2,
  );
  const [difficulty, setDifficulty] = useState(storedDifficulty);
  const [weather, setWeather] = useState<WeatherId>(storedWeather);
  const [ghost, setGhost] = useState(storedGhost);
  const [lapCount, setLapCount] = useState<1 | 2>(storedLapCount);

  const difficultyLabel =
    difficulty < 34 ? "Easy" : difficulty < 67 ? "Medium" : "Hard";

  return (
    <div className="mobile-scroll-overlay absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink-975/80 p-4 backdrop-blur-md da-fade-in">
      <div className="mobile-scroll-panel max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-panel p-6 shadow-2xl da-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Session
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">{routeName}</h2>
        <p className="mt-2 text-sm text-mist">
          Play alone, race your ghost, or take on AI — then pick the weather.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("solo")}
            className={
              mode === "solo"
                ? "rounded-lg border-2 border-accent bg-ink-950/80 px-4 py-3 text-left"
                : "rounded-lg border border-line bg-ink-950/40 px-4 py-3 text-left hover:border-fog"
            }
          >
            <p className="font-medium text-white">Play alone</p>
            <p className="mt-1 text-xs text-mist">
              Time trial — just you and the clock.
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ai");
              setGhost(false);
            }}
            className={
              mode === "ai"
                ? "rounded-lg border-2 border-accent bg-ink-950/80 px-4 py-3 text-left"
                : "rounded-lg border border-line bg-ink-950/40 px-4 py-3 text-left hover:border-fog"
            }
          >
            <p className="font-medium text-white">Play against AI</p>
            <p className="mt-1 text-xs text-mist">
              Up to {MAX_AI_CARS} rivals, each a different colour.
            </p>
          </button>
        </div>

        {mode === "solo" ? (
          <button
            type="button"
            onClick={() => setGhost((value) => !value)}
            className={
              ghost
                ? "mt-3 w-full rounded-lg border-2 border-accent bg-ink-950/80 px-4 py-3 text-left"
                : "mt-3 w-full rounded-lg border border-line bg-ink-950/40 px-4 py-3 text-left hover:border-fog"
            }
          >
            <p className="font-medium text-white">Race your ghost</p>
            <p className="mt-1 text-xs text-mist">
              {ghost
                ? ghostAvailable
                  ? "On — a translucent PB car runs your best lap."
                  : "On — the ghost appears after you set a valid lap."
                : "Click to race a ghost of your personal best. Never used with AI."}
            </p>
          </button>
        ) : (
          <div className="mt-4 space-y-4 rounded-lg border border-line bg-ink-950/50 p-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
                AI cars — {aiCount}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: MAX_AI_CARS }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAiCount(n)}
                      className={
                        aiCount === n
                          ? "h-10 w-10 rounded-md border-2 border-accent bg-ink-900 text-white"
                          : "h-10 w-10 rounded-md border border-line bg-ink-900/60 text-mist hover:border-fog"
                      }
                    >
                      {n}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {AI_PAINTS.slice(0, aiCount).map((swatch) => (
                  <span
                    key={swatch.paint}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900 px-2 py-1 text-[11px] text-mist"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/40"
                      style={{ background: swatch.paint }}
                      aria-hidden
                    />
                    {swatch.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-fog">
                Same car and stats as you — only how hard they take corners
                changes. Min {MIN_AI_CARS}, max {MAX_AI_CARS}.
              </p>
            </div>

            <div>
              <label
                htmlFor="ai-difficulty-ingame"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog"
              >
                Difficulty — {difficultyLabel} ({difficulty})
              </label>
              <input
                id="ai-difficulty-ingame"
                type="range"
                min={1}
                max={100}
                value={difficulty}
                onChange={(event) => setDifficulty(Number(event.target.value))}
                className="mt-3 w-full accent-[var(--accent,#e8b84a)]"
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            Race distance
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([1, 2] as const).map((laps) => (
              <button
                key={laps}
                type="button"
                onClick={() => setLapCount(laps)}
                className={
                  lapCount === laps
                    ? "rounded-lg border-2 border-accent bg-ink-950/80 px-3 py-2 text-white"
                    : "rounded-lg border border-line bg-ink-950/40 px-3 py-2 text-mist"
                }
              >
                {laps} {laps === 1 ? "lap" : "laps"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            Weather
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WEATHER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setWeather(option.id)}
                className={
                  weather === option.id
                    ? "rounded-lg border-2 border-accent bg-ink-950/80 px-3 py-2 text-left"
                    : "rounded-lg border border-line bg-ink-950/40 px-3 py-2 text-left hover:border-fog"
                }
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="mt-0.5 text-[10px] text-mist">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            onClick={() =>
              confirmSession({
                mode,
                aiCount,
                difficulty,
                ghost: mode === "solo" && ghost,
                weather,
                vehicleId: useGameStore.getState().selectedVehicleId,
                lapCount,
              })
            }
          >
            {mode === "ai"
              ? "Start vs AI"
              : ghost
                ? "Start vs ghost"
                : "Start time trial"}
          </Button>
          <Button type="button" variant="secondary" onClick={setGarageOpen}>
            Back to cars
          </Button>
        </div>
      </div>
    </div>
  );
}
