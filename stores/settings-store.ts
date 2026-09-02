"use client";

import { create } from "zustand";

export type QualityPreset = "low" | "medium" | "high";

export interface QualityConfig {
  /** Device pixel ratio clamp passed to the renderer. */
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  /** Metres beyond which scenery and buildings are culled. */
  drawDistance: number;
  /** Fraction of street furniture that is drawn. */
  sceneryDensity: number;
  fogFar: number;
  antialias: boolean;
  /** Max building physics colliders near the ribbon. */
  buildingColliderCap: number;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  low: {
    dpr: [0.6, 0.9],
    shadows: false,
    shadowMapSize: 512,
    drawDistance: 240,
    sceneryDensity: 0.32,
    fogFar: 290,
    antialias: false,
    buildingColliderCap: 120,
  },
  medium: {
    dpr: [0.85, 1.1],
    shadows: false,
    shadowMapSize: 512,
    drawDistance: 420,
    sceneryDensity: 0.62,
    fogFar: 480,
    antialias: false,
    buildingColliderCap: 280,
  },
  high: {
    dpr: [1, 1.35],
    shadows: true,
    shadowMapSize: 1024,
    drawDistance: 620,
    sceneryDensity: 0.84,
    fogFar: 700,
    antialias: true,
    buildingColliderCap: 400,
  },
};

const STORAGE_KEY = "driveanywhere:quality:v2";
const VOLUME_KEY = "driveanywhere:engineVolume";

function isPreset(value: unknown): value is QualityPreset {
  return value === "low" || value === "medium" || value === "high";
}

/** Prefer dense city view so Unreal-parity densify is visible by default. */
function detectDefaultPreset(): QualityPreset {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = window.innerWidth < 900;
  if (coarse && narrow) return "low";
  if (cores <= 4 || (memory !== undefined && memory <= 4)) return "medium";
  return "high";
}

interface SettingsState {
  quality: QualityPreset;
  engineVolume: number;
  hydrated: boolean;
  setQuality: (quality: QualityPreset) => void;
  setEngineVolume: (volume: number) => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  quality: "medium",
  engineVolume: 0.55,
  hydrated: false,
  setQuality: (quality) => {
    set({ quality });
    try {
      window.localStorage.setItem(STORAGE_KEY, quality);
    } catch {
      // Storage can be blocked; the preset still applies for this session.
    }
  },
  setEngineVolume: (volume) => {
    const engineVolume = Math.max(0, Math.min(1, volume));
    set({ engineVolume });
    try {
      window.localStorage.setItem(VOLUME_KEY, String(engineVolume));
    } catch {
      // ignore
    }
  },
  hydrate: () => {
    let stored: string | null = null;
    let volStored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
      volStored = window.localStorage.getItem(VOLUME_KEY);
    } catch {
      stored = null;
      volStored = null;
    }
    const parsedVol = volStored !== null ? Number(volStored) : 0.55;
    set({
      quality: isPreset(stored) ? stored : detectDefaultPreset(),
      engineVolume: Number.isFinite(parsedVol)
        ? Math.max(0, Math.min(1, parsedVol))
        : 0.55,
      hydrated: true,
    });
  },
}));

export function useQualityConfig(): QualityConfig {
  const quality = useSettingsStore((s) => s.quality);
  return QUALITY_PRESETS[quality];
}
