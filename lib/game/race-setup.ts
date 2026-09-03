import { parseVehicleId, type VehicleId } from "@/lib/game/vehicles";
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

export type RaceMode = "solo" | "ai" | "online";

export interface RaceSetup {
  mode: RaceMode;
  aiCount: number;
  difficulty: number;
  /** Solo-only: race a translucent PB ghost. Never combined with AI. */
  ghost: boolean;
  weather: WeatherId;
  /** Locked for the whole grid — host pick online, player pick solo/AI. */
  vehicleId: VehicleId;
  lapCount: 1 | 2;
}

export interface ResolvedAiOpponent {
  id: string;
  vehicleId: VehicleId;
  paint: string;
  paintDark: string;
  gridIndex: number;
  paceMul: number;
  skill: number;
  startOffsetM: number;
}

export function clampAiCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_AI_CARS;
  return Math.max(MIN_AI_CARS, Math.min(MAX_AI_CARS, Math.round(value)));
}

/** Online fill cars — host may choose zero. */
export function clampOnlineAiCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_AI_CARS, Math.round(value)));
}

export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function lobbyDifficultyToSkill(level: "easy" | "medium" | "hard"): number {
  if (level === "easy") return 25;
  if (level === "hard") return 85;
  return 50;
}

export function parseRaceSetup(input: {
  mode?: string | null;
  ai?: string | number | null;
  difficulty?: string | number | null;
  ghost?: string | boolean | null;
  weather?: string | null;
  vehicle?: string | null;
  laps?: string | number | null;
}): RaceSetup {
  const mode: RaceMode =
    input.mode === "online" ? "online" : input.mode === "ai" ? "ai" : "solo";
  const ghostFlag =
    input.ghost === true || input.ghost === "1" || input.ghost === "true";
  const rawAi = Number(input.ai ?? (mode === "ai" ? 2 : 0));
  return {
    mode,
    aiCount:
      mode === "ai"
        ? clampAiCount(rawAi)
        : mode === "online"
          ? clampOnlineAiCount(rawAi)
          : 0,
    difficulty: clampDifficulty(Number(input.difficulty ?? 50)),
    ghost: mode === "solo" && ghostFlag,
    weather: parseWeather(input.weather),
    vehicleId: parseVehicleId(input.vehicle),
    lapCount: Number(input.laps) === 2 ? 2 : 1,
  };
}

export function raceSetupSearchParams(setup: RaceSetup): string {
  const params = new URLSearchParams();
  if (setup.mode === "ai") {
    params.set("mode", "ai");
    params.set("ai", String(clampAiCount(setup.aiCount)));
    params.set("difficulty", String(clampDifficulty(setup.difficulty)));
  } else if (setup.mode === "online") {
    params.set("mode", "online");
    params.set("ai", String(clampOnlineAiCount(setup.aiCount)));
    params.set("difficulty", String(clampDifficulty(setup.difficulty)));
  } else if (setup.ghost) {
    params.set("ghost", "1");
  }
  if (setup.vehicleId !== "sports") params.set("vehicle", setup.vehicleId);
  if (setup.weather !== "clear") params.set("weather", setup.weather);
  if (setup.lapCount === 2) params.set("laps", "2");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function difficultySkill(difficulty: number): number {
  return clampDifficulty(difficulty) / 100;
}

export function resolveAiOpponents(
  setup: RaceSetup,
  playerVehicleId: VehicleId,
): ResolvedAiOpponent[] {
  if (setup.mode !== "ai" && setup.mode !== "online") return [];
  const count =
    setup.mode === "online"
      ? clampOnlineAiCount(setup.aiCount)
      : clampAiCount(setup.aiCount);
  if (count <= 0) return [];
  const skill = difficultySkill(setup.difficulty);
  const vehicleId = playerVehicleId;
  const opponents: ResolvedAiOpponent[] = [];
  for (let i = 0; i < count; i += 1) {
    const palette = AI_PAINTS[i % AI_PAINTS.length];
    opponents.push({
      id: `ai-${i + 1}`,
      vehicleId,
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
