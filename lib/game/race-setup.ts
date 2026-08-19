import type { VehicleId } from "@/lib/game/vehicles";
import { parseWeather, type WeatherId } from "@/lib/game/weather";

export const MAX_AI_CARS = 4;
export const MIN_AI_CARS = 1;

/** Opponent paints — never the player Sports GT red. */
export const AI_PAINTS = [
  { paint: "#1d6bff", paintDark: "#0c3a9a", label: "Blue" },
  { paint: "#14b86a", paintDark: "#0a6b3c", label: "Green" },
  { paint: "#f0b429", paintDark: "#a06a10", label: "Amber" },
  { paint: "#9b4dff", paintDark: "#5a1fad", label: "Violet" },
] as const;

export type RaceMode = "solo" | "ai";

export interface RaceSetup {
  mode: RaceMode;
  aiCount: number;
  difficulty: number;
  /** Solo-only: race a translucent PB ghost. Never combined with AI. */
  ghost: boolean;
  weather: WeatherId;
}

export interface ResolvedAiOpponent {
  id: string;
  vehicleId: VehicleId;
  paint: string;
  paintDark: string;
  /** 0-based grid slot behind / beside the player. */
  gridIndex: number;
  /** Always 1 — same top speed / accel as the player's car. */
  paceMul: number;
  /** 0–1 from the difficulty slider: only corner cleanliness, not stats. */
  skill: number;
  /** Metres of centreline lead at lights-out (staggered start). */
  startOffsetM: number;
}

export function clampAiCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_AI_CARS;
  return Math.max(MIN_AI_CARS, Math.min(MAX_AI_CARS, Math.round(value)));
}

export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function parseRaceSetup(input: {
  mode?: string | null;
  ai?: string | number | null;
  difficulty?: string | number | null;
  ghost?: string | boolean | null;
  weather?: string | null;
}): RaceSetup {
  const mode: RaceMode = input.mode === "ai" ? "ai" : "solo";
  const ghostFlag =
    input.ghost === true || input.ghost === "1" || input.ghost === "true";
  return {
    mode,
    aiCount: mode === "ai" ? clampAiCount(Number(input.ai ?? 2)) : 0,
    difficulty: clampDifficulty(Number(input.difficulty ?? 50)),
    ghost: mode === "solo" && ghostFlag,
    weather: parseWeather(input.weather),
  };
}

export function raceSetupSearchParams(setup: RaceSetup): string {
  const params = new URLSearchParams();
  if (setup.mode === "ai") {
    params.set("mode", "ai");
    params.set("ai", String(clampAiCount(setup.aiCount)));
    params.set("difficulty", String(clampDifficulty(setup.difficulty)));
  } else if (setup.ghost) {
    params.set("ghost", "1");
  }
  if (setup.weather !== "clear") params.set("weather", setup.weather);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Difficulty 1–100 → corner skill only. Vehicle stats stay identical. */
export function difficultySkill(difficulty: number): number {
  return clampDifficulty(difficulty) / 100;
}

export function resolveAiOpponents(
  setup: RaceSetup,
  playerVehicleId: VehicleId,
): ResolvedAiOpponent[] {
  if (setup.mode !== "ai") return [];
  const count = clampAiCount(setup.aiCount);
  const skill = difficultySkill(setup.difficulty);
  const opponents: ResolvedAiOpponent[] = [];
  for (let i = 0; i < count; i += 1) {
    const palette = AI_PAINTS[i % AI_PAINTS.length];
    opponents.push({
      id: `ai-${i + 1}`,
      vehicleId: playerVehicleId,
      paint: palette.paint,
      paintDark: palette.paintDark,
      gridIndex: i,
      paceMul: 1,
      skill,
      startOffsetM: 5 + i * 4,
    });
  }
  return opponents;
}
