"use client";

import { create } from "zustand";
import {
  TOURNAMENT_DEFS,
  generateGhostTimes,
  scoreTournamentRound,
  resolveTournament,
  type ActiveTournament,
  type TournamentRound,
} from "@/lib/progression/tournament";
import { useProgressionStore } from "@/stores/progression-store";

const STORAGE_KEY = "driveanywhere:tournament:v1";

interface TournamentPersist {
  active: ActiveTournament | null;
  history: ActiveTournament[];
}

function readPersist(): TournamentPersist {
  const fallback: TournamentPersist = { active: null, history: [] };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as TournamentPersist;
  } catch {
    return fallback;
  }
}

function savePersist(data: TournamentPersist): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface TournamentState {
  active: ActiveTournament | null;
  history: ActiveTournament[];
  hydrated: boolean;

  hydrate(): void;
  enterTournament(defId: string): { ok: true } | { ok: false; reason: string };
  submitRoundTime(timeMs: number): {
    ok: true;
    round: TournamentRound;
    tournamentComplete: boolean;
    coinsWon: number;
  } | { ok: false; reason: string };
  abandonTournament(): void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  active: null,
  history: [],
  hydrated: false,

  hydrate() {
    const data = readPersist();
    set({ active: data.active, history: data.history, hydrated: true });
  },

  enterTournament(defId) {
    const def = TOURNAMENT_DEFS.find((d) => d.id === defId);
    if (!def) return { ok: false, reason: "Unknown tournament." };

    const { active } = get();
    if (active && active.status === "active") {
      return { ok: false, reason: "You already have an active tournament. Finish or abandon it first." };
    }

    const progression = useProgressionStore.getState();
    if (progression.coins < def.entryFee) {
      return { ok: false, reason: `Not enough coins. Need ${def.entryFee}, you have ${progression.coins}.` };
    }

    // Deduct entry fee
    progression.awardRace(0, -def.entryFee);

    const rounds: TournamentRound[] = def.maps.map((mapSlug, i) => ({
      roundNumber: i + 1,
      mapSlug,
      mapName: def.mapNames[i] ?? mapSlug,
      playerTimeMs: null,
      ghostTimes: generateGhostTimes(mapSlug, 50),
      playerPoints: 0,
      completed: false,
    }));

    const newTournament: ActiveTournament = {
      defId,
      enteredAt: Date.now(),
      status: "active",
      coinsPaid: def.entryFee,
      rounds,
      totalPlayerPoints: 0,
      finalPosition: null,
      coinsWon: 0,
    };

    const data: TournamentPersist = { active: newTournament, history: get().history };
    savePersist(data);
    set({ active: newTournament });
    return { ok: true };
  },

  submitRoundTime(timeMs) {
    const { active } = get();
    if (!active || active.status !== "active") {
      return { ok: false, reason: "No active tournament." };
    }

    const currentRoundIndex = active.rounds.findIndex((r) => !r.completed);
    if (currentRoundIndex === -1) {
      return { ok: false, reason: "All rounds already completed." };
    }

    const currentRound = active.rounds[currentRoundIndex];
    if (!currentRound) return { ok: false, reason: "Round not found." };

    const { position, points, updatedGhosts } = scoreTournamentRound(
      timeMs,
      currentRound.ghostTimes,
    );

    const updatedRound: TournamentRound = {
      ...currentRound,
      playerTimeMs: timeMs,
      ghostTimes: updatedGhosts,
      playerPoints: points,
      completed: true,
    };

    const updatedRounds = active.rounds.map((r, i) =>
      i === currentRoundIndex ? updatedRound : r,
    );

    const allComplete = updatedRounds.every((r) => r.completed);
    let coinsWon = 0;
    let updatedTournament: ActiveTournament;

    if (allComplete) {
      const def = TOURNAMENT_DEFS.find((d) => d.id === active.defId);
      const entryFee = def?.entryFee ?? active.coinsPaid;
      const result = resolveTournament(updatedRounds, entryFee);
      coinsWon = result.coinsWon;

      updatedTournament = {
        ...active,
        rounds: updatedRounds,
        totalPlayerPoints: result.totalPoints,
        finalPosition: result.position,
        coinsWon,
        status: "finished",
      };

      if (coinsWon > 0) {
        useProgressionStore.getState().awardRace(0, coinsWon);
      }
    } else {
      const totalPlayerPoints = updatedRounds.reduce((sum, r) => sum + r.playerPoints, 0);
      updatedTournament = {
        ...active,
        rounds: updatedRounds,
        totalPlayerPoints,
      };
    }

    const nextHistory = allComplete
      ? [...get().history, updatedTournament]
      : get().history;

    const data: TournamentPersist = {
      active: allComplete ? null : updatedTournament,
      history: nextHistory,
    };
    savePersist(data);
    set({
      active: allComplete ? null : updatedTournament,
      history: nextHistory,
    });

    return {
      ok: true,
      round: updatedRound,
      tournamentComplete: allComplete,
      coinsWon,
    };
  },

  abandonTournament() {
    const { active } = get();
    if (!active) return;

    const abandoned: ActiveTournament = {
      ...active,
      status: "finished",
      finalPosition: 6,
      coinsWon: 0,
    };

    const nextHistory = [...get().history, abandoned];
    const data: TournamentPersist = { active: null, history: nextHistory };
    savePersist(data);
    set({ active: null, history: nextHistory });
  },
}));
