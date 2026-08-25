"use client";

import { create } from "zustand";
import {
  clampAiCount,
  clampDifficulty,
  clampOnlineAiCount,
  type RaceMode,
  type RaceSetup,
} from "@/lib/game/race-setup";
import type { VehicleId } from "@/lib/game/vehicles";
import { parseWeather, type WeatherId } from "@/lib/game/weather";

export type CameraMode = "chase" | "far" | "hood" | "bumper";

const CAMERA_CYCLE: CameraMode[] = ["chase", "far", "hood", "bumper"];

interface GameHudSnapshot {
  speedKph: number;
  elapsedMs: number;
  checkpointIndex: number;
  checkpointTotal: number;
  progress: number;
  gear: number;
  rpm: number;
  rpmNorm: number;
  sectorIndex: number;
  splitMs: number | null;
  splitDeltaMs: number | null;
  splitTone: "purple" | "green" | "red" | null;
}

interface GameStoreState extends GameHudSnapshot {
  paused: boolean;
  started: boolean;
  finished: boolean;
  invalid: boolean;
  invalidReason: string | null;
  cameraMode: CameraMode;
  restartToken: number;
  /** Bumped to snap the car back to the last passed checkpoint (R / pause). */
  checkpointResetToken: number;
  personalBestMs: number | null;
  /** Seconds left on the start light sequence; null when not counting in. */
  countdown: number | null;
  /** ~7 s cinematic fly-through before the start lights. */
  introActive: boolean;
  selectedVehicleId: VehicleId;
  garageConfirmed: boolean;
  /** Solo vs AI lobby — confirmed after the garage. */
  sessionConfirmed: boolean;
  raceMode: RaceMode;
  aiCount: number;
  difficulty: number;
  ghostEnabled: boolean;
  weather: WeatherId;
  photoMode: boolean;
  setPhotoMode: (v: boolean) => void;
  setHud: (partial: Partial<GameHudSnapshot>) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  beginCountdown: () => void;
  finishIntro: () => void;
  tickCountdown: () => void;
  startRun: () => void;
  finishRun: () => void;
  markInvalid: (reason: string) => void;
  toggleCamera: () => void;
  requestRestart: () => void;
  requestCheckpointReset: () => void;
  resetRunState: () => void;
  setPersonalBest: (ms: number | null) => void;
  setSelectedVehicle: (id: VehicleId) => void;
  confirmGarage: () => void;
  hydrateRaceSetup: (setup: RaceSetup) => void;
  confirmSession: (setup: RaceSetup) => void;
}

const hudDefaults: GameHudSnapshot = {
  speedKph: 0,
  elapsedMs: 0,
  checkpointIndex: 0,
  checkpointTotal: 2,
  progress: 0,
  gear: 0,
  rpm: 0,
  rpmNorm: 0,
  sectorIndex: 0,
  splitMs: null,
  splitDeltaMs: null,
  splitTone: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...hudDefaults,
  paused: false,
  started: false,
  finished: false,
  invalid: false,
  invalidReason: null,
  cameraMode: "chase",
  restartToken: 0,
  checkpointResetToken: 0,
  personalBestMs: null,
  countdown: null,
  introActive: false,
  selectedVehicleId: "sports",
  garageConfirmed: false,
  sessionConfirmed: false,
  raceMode: "solo",
  aiCount: 2,
  difficulty: 50,
  ghostEnabled: false,
  weather: "clear",
  photoMode: false,
  setPhotoMode: (v) => set({ photoMode: v }),
  setHud: (partial) => set(partial),
  setPaused: (paused) => set({ paused }),
  togglePause: () => set({ paused: !get().paused }),
  beginCountdown: () => set({ countdown: 3, paused: true, introActive: false }),
  finishIntro: () => set({ introActive: false }),
  tickCountdown: () => {
    const current = get().countdown;
    if (current === null) return;
    if (current <= 1) {
      set({ countdown: null, paused: false });
      return;
    }
    set({ countdown: current - 1 });
  },
  startRun: () =>
    set({
      started: true,
      finished: false,
      invalid: false,
      invalidReason: null,
      elapsedMs: 0,
    }),
  finishRun: () => set({ finished: true, paused: true }),
  markInvalid: (reason) => set({ invalid: true, invalidReason: reason }),
  toggleCamera: () => {
    const current = get().cameraMode;
    const idx = CAMERA_CYCLE.indexOf(current);
    set({ cameraMode: CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length] });
  },
  requestRestart: () =>
    set((state) => ({
      ...hudDefaults,
      countdown: null,
      introActive: false,
      checkpointTotal: state.checkpointTotal,
      personalBestMs: state.personalBestMs,
      paused: true,
      started: false,
      finished: false,
      invalid: false,
      invalidReason: null,
      cameraMode: state.cameraMode,
      selectedVehicleId: state.selectedVehicleId,
      garageConfirmed: false,
      sessionConfirmed: false,
      raceMode: state.raceMode,
      aiCount: state.aiCount,
      difficulty: state.difficulty,
      ghostEnabled: state.ghostEnabled,
      weather: state.weather,
      restartToken: state.restartToken + 1,
      checkpointResetToken: state.checkpointResetToken,
    })),
  requestCheckpointReset: () =>
    set((state) => ({
      checkpointResetToken: state.checkpointResetToken + 1,
      paused: false,
    })),
  resetRunState: () =>
    set((state) => ({
      ...hudDefaults,
      countdown: null,
      introActive: false,
      checkpointTotal: state.checkpointTotal,
      personalBestMs: state.personalBestMs,
      paused: false,
      started: false,
      finished: false,
      invalid: false,
      invalidReason: null,
      cameraMode: state.cameraMode,
      selectedVehicleId: state.selectedVehicleId,
      garageConfirmed: false,
      sessionConfirmed: false,
      raceMode: state.raceMode,
      aiCount: state.aiCount,
      difficulty: state.difficulty,
      ghostEnabled: state.ghostEnabled,
      weather: state.weather,
      checkpointResetToken: state.checkpointResetToken,
    })),
  setPersonalBest: (ms) => set({ personalBestMs: ms }),
  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  confirmGarage: () => set({ garageConfirmed: true, paused: true }),
  hydrateRaceSetup: (setup) =>
    set({
      raceMode: setup.mode,
      aiCount:
        setup.mode === "ai" || setup.mode === "online"
          ? setup.aiCount
          : 2,
      difficulty: clampDifficulty(setup.difficulty),
      ghostEnabled: setup.mode === "solo" && setup.ghost,
      weather: parseWeather(setup.weather),
      selectedVehicleId: setup.vehicleId,
    }),
  confirmSession: (setup) =>
    set({
      raceMode: setup.mode,
      aiCount:
        setup.mode === "online"
          ? clampOnlineAiCount(setup.aiCount)
          : clampAiCount(setup.aiCount || get().aiCount),
      difficulty: clampDifficulty(setup.difficulty),
      ghostEnabled: setup.mode === "solo" && setup.ghost,
      weather: parseWeather(setup.weather),
      selectedVehicleId: setup.vehicleId,
      sessionConfirmed: true,
      paused: true,
      introActive: setup.mode !== "online",
      countdown: null,
    }),
}));
