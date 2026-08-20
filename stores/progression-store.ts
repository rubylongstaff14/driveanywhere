"use client";

import { create } from "zustand";
import {
  COSMETICS,
  defaultLoadout,
  stockIdsFor,
  type CarLoadout,
} from "@/lib/game/cosmetics";
import {
  COIN_PACKS,
  CRATES,
  getCrate,
  rollCrateDrop,
  GUEST_UNLIMITED_COINS,
  STARTING_COINS,
  STARTING_XP,
  type CrateId,
} from "@/lib/progression/economy";
import { getSession } from "@/lib/auth/auth-service";
import type { VehicleId } from "@/lib/game/vehicles";
import { VEHICLE_LIST } from "@/lib/game/vehicles";

const STORAGE_KEY = "driveanywhere:progression:v2";

interface ProgressionPersist {
  coins: number;
  xp: number;
  unlocked: string[];
  loadouts: Record<VehicleId, CarLoadout>;
  lastDropId: string | null;
}

function emptyLoadouts(): Record<VehicleId, CarLoadout> {
  return {
    sports: defaultLoadout("sports"),
    f1: defaultLoadout("f1"),
    corsa: defaultLoadout("corsa"),
    gwagon: defaultLoadout("gwagon"),
  };
}

function defaultUnlocked(): string[] {
  return VEHICLE_LIST.flatMap((v) => stockIdsFor(v.id));
}

function readPersist(): ProgressionPersist {
  if (typeof window === "undefined") {
    return {
      coins: STARTING_COINS,
      xp: STARTING_XP,
      unlocked: defaultUnlocked(),
      loadouts: emptyLoadouts(),
      lastDropId: null,
    };
  }
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem("driveanywhere:progression:v1");
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<ProgressionPersist>;
    const loadouts = emptyLoadouts();
    if (parsed.loadouts) {
      for (const id of VEHICLE_LIST.map((v) => v.id)) {
        if (parsed.loadouts[id]) loadouts[id] = parsed.loadouts[id];
      }
    }
    const unlocked = new Set([
      ...defaultUnlocked(),
      ...(parsed.unlocked ?? []),
    ]);
    return {
      coins: Math.max(0, Number(parsed.coins) || STARTING_COINS),
      xp: Math.max(0, Number(parsed.xp) || 0),
      unlocked: [...unlocked],
      loadouts,
      lastDropId: parsed.lastDropId ?? null,
    };
  } catch {
    return {
      coins: STARTING_COINS,
      xp: STARTING_XP,
      unlocked: defaultUnlocked(),
      loadouts: emptyLoadouts(),
      lastDropId: null,
    };
  }
}

interface ProgressionState extends ProgressionPersist {
  hydrated: boolean;
  hydrate: () => void;
  awardRace: (xp: number, coins: number) => void;
  buyCoins: (packId: string) => { ok: true } | { ok: false; message: string };
  openCrate: (
    crateId: CrateId,
    vehicleId?: VehicleId,
  ) =>
    | { ok: true; itemId: string; duplicate: boolean; coinsBack: number }
    | { ok: false; message: string };
  equip: (vehicleId: VehicleId, slot: keyof CarLoadout, itemId: string) => void;
  saveLoadouts: () => void;
  isUnlocked: (itemId: string) => boolean;
}

function guestUnlimited(): boolean {
  const session = getSession();
  return !session || session.user.mode === "guest";
}

function persist(state: ProgressionPersist) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  coins: STARTING_COINS,
  xp: STARTING_XP,
  unlocked: defaultUnlocked(),
  loadouts: emptyLoadouts(),
  lastDropId: null,
  hydrated: false,
  hydrate: () => {
    const data = readPersist();
    if (guestUnlimited()) {
      data.coins = GUEST_UNLIMITED_COINS;
    }
    set({ ...data, hydrated: true });
  },
  awardRace: (xp, coins) => {
    set((s) => {
      const next = {
        coins: s.coins + coins,
        xp: s.xp + xp,
        unlocked: s.unlocked,
        loadouts: s.loadouts,
        lastDropId: s.lastDropId,
      };
      persist(next);
      return next;
    });
  },
  buyCoins: (packId) => {
    const pack = COIN_PACKS.find((p) => p.id === packId);
    if (!pack) return { ok: false, message: "Unknown coin pack." };
    set((s) => {
      const next = {
        coins: s.coins + pack.coins,
        xp: s.xp,
        unlocked: s.unlocked,
        loadouts: s.loadouts,
        lastDropId: s.lastDropId,
      };
      persist(next);
      return next;
    });
    return { ok: true };
  },
  openCrate: (crateId, vehicleId) => {
    const crate = getCrate(crateId);
    if (!crate) return { ok: false, message: "Unknown crate." };
    const unlimited = guestUnlimited();
    const { coins, unlocked } = get();
    if (!unlimited && coins < crate.cost) {
      return { ok: false, message: `Need ${crate.cost} coins.` };
    }
    const drop = rollCrateDrop(crate, vehicleId);
    const duplicate = unlocked.includes(drop.id);
    const coinsBack = unlimited ? 0 : duplicate ? Math.round(crate.cost * 0.35) : 0;
    set((s) => {
      const nextUnlocked = duplicate ? s.unlocked : [...s.unlocked, drop.id];
      const next = {
        coins: unlimited
          ? GUEST_UNLIMITED_COINS
          : s.coins - crate.cost + coinsBack,
        xp: s.xp,
        unlocked: nextUnlocked,
        loadouts: s.loadouts,
        lastDropId: drop.id,
      };
      persist(next);
      return next;
    });
    return { ok: true, itemId: drop.id, duplicate, coinsBack };
  },
  equip: (vehicleId, slot, itemId) => {
    const item = COSMETICS.find((c) => c.id === itemId);
    if (!item || item.vehicleId !== vehicleId) return;
    if (!get().unlocked.includes(itemId)) return;
    const slotKey =
      item.slot === "paint"
        ? "paintId"
        : item.slot === "bumper"
          ? "bumperId"
          : item.slot === "wing"
            ? "wingId"
            : "kitId";
    if (slotKey !== slot && slot !== slotKey) {
      // allow callers to pass the cosmetic slot mapping
    }
    set((s) => {
      const loadouts = {
        ...s.loadouts,
        [vehicleId]: { ...s.loadouts[vehicleId], [slotKey]: itemId },
      };
      const next = {
        coins: s.coins,
        xp: s.xp,
        unlocked: s.unlocked,
        loadouts,
        lastDropId: s.lastDropId,
      };
      persist(next);
      return next;
    });
  },
  isUnlocked: (itemId) => get().unlocked.includes(itemId),
  saveLoadouts: () => {
    const s = get();
    persist({
      coins: s.coins,
      xp: s.xp,
      unlocked: s.unlocked,
      loadouts: s.loadouts,
      lastDropId: s.lastDropId,
    });
  },
}));

export { CRATES };
