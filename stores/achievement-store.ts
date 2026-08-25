"use client";

import { create } from "zustand";
import {
  ACHIEVEMENTS,
  checkNewAchievements,
  defaultStats,
  type AchievementDef,
  type PlayerStats,
} from "@/lib/progression/achievements";

const STORAGE_KEY = "driveanywhere:achievements:v1";

// ── Persistence ──────────────────────────────────────────────────────────────

interface PersistedStats {
  racesCompleted: number;
  racesWon: number;
  onlineRaces: number;
  onlineWins: number;
  personalBests: number;
  totalDistanceKm: number;
  driftSeconds: number;
  topSpeedKph: number;
  turboBursts: number;
  tauntsUsed: number;
  cleanLaps: number;
  mapsRaced: string[];
  currentStreak: number;
  lastPlayedDate: string | null;
  cratesOpened: number;
  coinsSpent: number;
}

interface PersistedAchievementData {
  earned: string[];
  stats: PersistedStats;
}

function defaultPersistedStats(): PersistedStats {
  return {
    racesCompleted: 0,
    racesWon: 0,
    onlineRaces: 0,
    onlineWins: 0,
    personalBests: 0,
    totalDistanceKm: 0,
    driftSeconds: 0,
    topSpeedKph: 0,
    turboBursts: 0,
    tauntsUsed: 0,
    cleanLaps: 0,
    mapsRaced: [],
    currentStreak: 0,
    lastPlayedDate: null,
    cratesOpened: 0,
    coinsSpent: 0,
  };
}

function statsToLive(p: PersistedStats): PlayerStats {
  return {
    racesCompleted: p.racesCompleted,
    racesWon: p.racesWon,
    onlineRaces: p.onlineRaces,
    onlineWins: p.onlineWins,
    personalBests: p.personalBests,
    totalDistanceKm: p.totalDistanceKm,
    driftSeconds: p.driftSeconds,
    topSpeedKph: p.topSpeedKph,
    turboBursts: p.turboBursts,
    tauntsUsed: p.tauntsUsed,
    cleanLaps: p.cleanLaps,
    mapsRaced: new Set(p.mapsRaced),
    currentStreak: p.currentStreak,
    cratesOpened: p.cratesOpened,
    coinsSpent: p.coinsSpent,
  };
}

function statsToPersist(live: PlayerStats, lastPlayedDate: string | null): PersistedStats {
  return {
    racesCompleted: live.racesCompleted,
    racesWon: live.racesWon,
    onlineRaces: live.onlineRaces,
    onlineWins: live.onlineWins,
    personalBests: live.personalBests,
    totalDistanceKm: live.totalDistanceKm,
    driftSeconds: live.driftSeconds,
    topSpeedKph: live.topSpeedKph,
    turboBursts: live.turboBursts,
    tauntsUsed: live.tauntsUsed,
    cleanLaps: live.cleanLaps,
    mapsRaced: [...live.mapsRaced],
    currentStreak: live.currentStreak,
    lastPlayedDate,
    cratesOpened: live.cratesOpened,
    coinsSpent: live.coinsSpent,
  };
}

function readPersist(): { data: PersistedAchievementData; lastPlayedDate: string | null } {
  const fallback = {
    data: { earned: [], stats: defaultPersistedStats() },
    lastPlayedDate: null,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedAchievementData & { lastPlayedDate: string | null }>;
    const stats: PersistedStats = {
      ...defaultPersistedStats(),
      ...(parsed.stats ?? {}),
      mapsRaced: Array.isArray(parsed.stats?.mapsRaced) ? parsed.stats.mapsRaced : [],
    };
    return {
      data: {
        earned: Array.isArray(parsed.earned) ? parsed.earned : [],
        stats,
      },
      lastPlayedDate: parsed.lastPlayedDate ?? null,
    };
  } catch {
    return fallback;
  }
}

function savePersist(earned: string[], stats: PlayerStats, lastPlayedDate: string | null): void {
  if (typeof window === "undefined") return;
  const payload: PersistedAchievementData & { lastPlayedDate: string | null } = {
    earned,
    stats: statsToPersist(stats, lastPlayedDate),
    lastPlayedDate,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface AchievementState {
  earned: string[];
  stats: PlayerStats;
  pendingToast: AchievementDef | null;
  toastQueue: AchievementDef[];
  hydrated: boolean;
  /** Tracks last-played date for streak calculation (not in PlayerStats itself). */
  lastPlayedDate: string | null;

  hydrate(): void;

  recordRace(input: {
    finished: boolean;
    valid: boolean;
    position: number | null;
    mapSlug: string;
    online: boolean;
    personalBest: boolean;
    driftSeconds: number;
    topSpeed: number;
    cleanLap: boolean;
    distanceKm?: number;
  }): AchievementDef[];

  recordTaunt(): void;
  recordTurbo(): void;
  recordDrift(seconds: number): void;
  recordCrateOpen(): void;
  recordCoinSpend(amount: number): void;
  popToast(): void;
}

function pushToastQueue(
  newAchievements: AchievementDef[],
  current: Pick<AchievementState, "pendingToast" | "toastQueue">,
): Pick<AchievementState, "pendingToast" | "toastQueue"> {
  if (newAchievements.length === 0) return current;
  const combined = [...current.toastQueue, ...newAchievements];
  if (!current.pendingToast) {
    const [first, ...rest] = combined;
    return { pendingToast: first ?? null, toastQueue: rest };
  }
  return { pendingToast: current.pendingToast, toastQueue: combined };
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  earned: [],
  stats: defaultStats(),
  pendingToast: null,
  toastQueue: [],
  hydrated: false,
  lastPlayedDate: null,

  hydrate() {
    const { data, lastPlayedDate } = readPersist();
    set({
      earned: data.earned,
      stats: statsToLive(data.stats),
      lastPlayedDate,
      hydrated: true,
    });
  },

  recordRace(input) {
    const s = get();
    const today = todayUTC();

    // ── Streak calculation ──────────────────────────────────────
    let { currentStreak } = s.stats;
    let { lastPlayedDate } = s;

    if (lastPlayedDate !== today) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      currentStreak = lastPlayedDate === yStr ? currentStreak + 1 : 1;
      lastPlayedDate = today;
    }

    // ── Build next stats ────────────────────────────────────────
    const prev = s.stats;
    const nextMaps = new Set(prev.mapsRaced);
    if (input.mapSlug) nextMaps.add(input.mapSlug);

    const nextStats: PlayerStats = {
      ...prev,
      racesCompleted: prev.racesCompleted + (input.finished ? 1 : 0),
      racesWon: prev.racesWon + (input.finished && input.position === 1 ? 1 : 0),
      onlineRaces: prev.onlineRaces + (input.online ? 1 : 0),
      onlineWins:
        prev.onlineWins + (input.online && input.position === 1 ? 1 : 0),
      personalBests: prev.personalBests + (input.personalBest ? 1 : 0),
      driftSeconds: prev.driftSeconds + input.driftSeconds,
      topSpeedKph: Math.max(prev.topSpeedKph, input.topSpeed),
      cleanLaps: prev.cleanLaps + (input.cleanLap ? 1 : 0),
      mapsRaced: nextMaps,
      currentStreak,
      totalDistanceKm: prev.totalDistanceKm + (input.distanceKm ?? 0),
    };

    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);

    savePersist(nextEarned, nextStats, lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, lastPlayedDate, ...toastState });
    return newAchievements;
  },

  recordTaunt() {
    const s = get();
    const nextStats: PlayerStats = {
      ...s.stats,
      tauntsUsed: s.stats.tauntsUsed + 1,
    };
    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);
    savePersist(nextEarned, nextStats, s.lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, ...toastState });
  },

  recordTurbo() {
    const s = get();
    const nextStats: PlayerStats = {
      ...s.stats,
      turboBursts: s.stats.turboBursts + 1,
    };
    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);
    savePersist(nextEarned, nextStats, s.lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, ...toastState });
  },

  recordDrift(seconds) {
    const s = get();
    const nextStats: PlayerStats = {
      ...s.stats,
      driftSeconds: s.stats.driftSeconds + seconds,
    };
    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);
    savePersist(nextEarned, nextStats, s.lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, ...toastState });
  },

  recordCrateOpen() {
    const s = get();
    const nextStats: PlayerStats = {
      ...s.stats,
      cratesOpened: s.stats.cratesOpened + 1,
    };
    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);
    savePersist(nextEarned, nextStats, s.lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, ...toastState });
  },

  recordCoinSpend(amount) {
    const s = get();
    const nextStats: PlayerStats = {
      ...s.stats,
      coinsSpent: s.stats.coinsSpent + amount,
    };
    const earnedSet = new Set(s.earned);
    const newAchievements = checkNewAchievements(nextStats, earnedSet);
    const nextEarned = [...s.earned, ...newAchievements.map((a) => a.id)];
    const toastState = pushToastQueue(newAchievements, s);
    savePersist(nextEarned, nextStats, s.lastPlayedDate);
    set({ stats: nextStats, earned: nextEarned, ...toastState });
  },

  popToast() {
    const s = get();
    const [next, ...rest] = s.toastQueue;
    set({ pendingToast: next ?? null, toastQueue: rest });
  },
}));

export { ACHIEVEMENTS };

/**
 * Returns a crate reward when a streak milestone is newly crossed.
 * Call this after `recordRace` with the previous and new streak values.
 */
export function checkStreakRewards(
  prevStreak: number,
  newStreak: number,
): { crateId: string; message: string } | null {
  if (prevStreak < 30 && newStreak >= 30) {
    return { crateId: "apex", message: "30-Day Streak — Apex crate rewarded!" };
  }
  if (prevStreak < 7 && newStreak >= 7) {
    return { crateId: "street", message: "7-Day Streak — Free crate rewarded!" };
  }
  return null;
}
