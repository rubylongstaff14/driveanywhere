"use client";

import { create } from "zustand";
import {
  getDailyChallenges,
  getWeeklyChallenges,
  getISOWeekString,
  getUTCDateString,
  type ChallengeDef,
  type ChallengeMetric,
} from "@/lib/progression/challenges";

const STORAGE_KEY = "driveanywhere:challenges:v1";

// ── Persistence ──────────────────────────────────────────────────────────────

interface PersistedChallengeData {
  dailyProgress: Record<string, number>;
  weeklyProgress: Record<string, number>;
  dailyCompleted: string[];
  weeklyCompleted: string[];
  lastDailyReset: string;
  lastWeeklyReset: string;
}

function readPersist(): PersistedChallengeData {
  const fallback: PersistedChallengeData = {
    dailyProgress: {},
    weeklyProgress: {},
    dailyCompleted: [],
    weeklyCompleted: [],
    lastDailyReset: "",
    lastWeeklyReset: "",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedChallengeData>;
    return {
      dailyProgress: parsed.dailyProgress ?? {},
      weeklyProgress: parsed.weeklyProgress ?? {},
      dailyCompleted: Array.isArray(parsed.dailyCompleted) ? parsed.dailyCompleted : [],
      weeklyCompleted: Array.isArray(parsed.weeklyCompleted) ? parsed.weeklyCompleted : [],
      lastDailyReset: parsed.lastDailyReset ?? "",
      lastWeeklyReset: parsed.lastWeeklyReset ?? "",
    };
  } catch {
    return fallback;
  }
}

function savePersist(data: PersistedChallengeData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface ChallengesState {
  dailyProgress: Record<string, number>;
  weeklyProgress: Record<string, number>;
  dailyCompleted: string[];
  weeklyCompleted: string[];
  lastDailyReset: string;
  lastWeeklyReset: string;
  hydrated: boolean;

  hydrate(): void;

  /**
   * Increments challenge progress for the given metric by `amount`.
   * Returns any challenges that became newly completed as a result.
   */
  progressChallenge(metric: ChallengeMetric, amount: number): ChallengeDef[];

  getDailyChallengesWithProgress(): Array<ChallengeDef & { progress: number; completed: boolean }>;
  getWeeklyChallengesWithProgress(): Array<ChallengeDef & { progress: number; completed: boolean }>;
}

/**
 * Applies daily/weekly resets if the stored reset tokens are stale relative to
 * the current UTC date / ISO week.
 */
function applyResets(data: PersistedChallengeData): PersistedChallengeData {
  const today = getUTCDateString();
  const thisWeek = getISOWeekString();
  let next = { ...data };

  if (next.lastDailyReset !== today) {
    next = {
      ...next,
      dailyProgress: {},
      dailyCompleted: [],
      lastDailyReset: today,
    };
  }

  if (next.lastWeeklyReset !== thisWeek) {
    next = {
      ...next,
      weeklyProgress: {},
      weeklyCompleted: [],
      lastWeeklyReset: thisWeek,
    };
  }

  return next;
}

export const useChallengesStore = create<ChallengesState>((set, get) => ({
  dailyProgress: {},
  weeklyProgress: {},
  dailyCompleted: [],
  weeklyCompleted: [],
  lastDailyReset: "",
  lastWeeklyReset: "",
  hydrated: false,

  hydrate() {
    const raw = readPersist();
    const data = applyResets(raw);
    savePersist(data);
    set({ ...data, hydrated: true });
  },

  progressChallenge(metric, amount) {
    const s = get();
    const now = new Date();
    const dailyChallenges = getDailyChallenges(now);
    const weeklyChallenges = getWeeklyChallenges(now);

    const nextDailyProgress = { ...s.dailyProgress };
    const nextWeeklyProgress = { ...s.weeklyProgress };
    const nextDailyCompleted = [...s.dailyCompleted];
    const nextWeeklyCompleted = [...s.weeklyCompleted];
    const newlyCompleted: ChallengeDef[] = [];

    for (const ch of dailyChallenges) {
      if (ch.metric !== metric) continue;
      if (nextDailyCompleted.includes(ch.id)) continue;
      const prev = nextDailyProgress[ch.id] ?? 0;
      const next = prev + amount;
      nextDailyProgress[ch.id] = next;
      if (next >= ch.target) {
        nextDailyCompleted.push(ch.id);
        newlyCompleted.push(ch);
      }
    }

    for (const ch of weeklyChallenges) {
      if (ch.metric !== metric) continue;
      if (nextWeeklyCompleted.includes(ch.id)) continue;
      const prev = nextWeeklyProgress[ch.id] ?? 0;
      const next = prev + amount;
      nextWeeklyProgress[ch.id] = next;
      if (next >= ch.target) {
        nextWeeklyCompleted.push(ch.id);
        newlyCompleted.push(ch);
      }
    }

    const updated: PersistedChallengeData = {
      dailyProgress: nextDailyProgress,
      weeklyProgress: nextWeeklyProgress,
      dailyCompleted: nextDailyCompleted,
      weeklyCompleted: nextWeeklyCompleted,
      lastDailyReset: s.lastDailyReset,
      lastWeeklyReset: s.lastWeeklyReset,
    };
    savePersist(updated);
    set(updated);
    return newlyCompleted;
  },

  getDailyChallengesWithProgress() {
    const s = get();
    return getDailyChallenges().map((ch) => ({
      ...ch,
      progress: s.dailyProgress[ch.id] ?? 0,
      completed: s.dailyCompleted.includes(ch.id),
    }));
  },

  getWeeklyChallengesWithProgress() {
    const s = get();
    return getWeeklyChallenges().map((ch) => ({
      ...ch,
      progress: s.weeklyProgress[ch.id] ?? 0,
      completed: s.weeklyCompleted.includes(ch.id),
    }));
  },
}));
