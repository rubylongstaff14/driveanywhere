import type { CosmeticRarity, CosmeticItem } from "@/lib/game/cosmetics";
import { COSMETICS, RARITY_ORDER, stockIdsFor } from "@/lib/game/cosmetics";
import type { VehicleId } from "@/lib/game/vehicles";

export interface RankTier {
  id: string;
  name: string;
  minXp: number;
  color: string;
}

export const RANKS: RankTier[] = [
  { id: "rookie", name: "Rookie", minXp: 0, color: "#8b97a8" },
  { id: "club", name: "Club", minXp: 400, color: "#5ad18a" },
  { id: "pro", name: "Pro", minXp: 1200, color: "#4aa3ff" },
  { id: "elite", name: "Elite", minXp: 2800, color: "#b56bff" },
  { id: "master", name: "Master", minXp: 5200, color: "#f5a623" },
  { id: "legend", name: "Legend", minXp: 9000, color: "#ff5c5c" },
];

export function rankForXp(xp: number): RankTier {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

export function nextRank(xp: number): RankTier | null {
  const current = rankForXp(xp);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return RANKS[idx + 1] ?? null;
}

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  priceLabel: string;
  bonus?: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: "starter", name: "Starter Wallet", coins: 800, priceLabel: "£1.99" },
  { id: "weekend", name: "Weekend Stack", coins: 2200, priceLabel: "£4.99", bonus: "+10%" },
  { id: "pro", name: "Pro Vault", coins: 6000, priceLabel: "£9.99", bonus: "+20%" },
  { id: "legend", name: "Legend Chest", coins: 15000, priceLabel: "£19.99", bonus: "+35%" },
];

export type CrateId = "street" | "night" | "apex";

export interface CrateDef {
  id: CrateId;
  name: string;
  tagline: string;
  cost: number;
  /** Weights aligned with RARITY_ORDER. */
  weights: number[];
}

export const CRATES: CrateDef[] = [
  {
    id: "street",
    name: "Street Crate",
    tagline: "Mostly factory and uncommon drops.",
    cost: 250,
    weights: [55, 28, 12, 4, 1, 0],
  },
  {
    id: "night",
    name: "Night Crate",
    tagline: "Better shot at rare aero.",
    cost: 600,
    weights: [18, 32, 28, 14, 6, 2],
  },
  {
    id: "apex",
    name: "Apex Crate",
    tagline: "Highest covert odds.",
    cost: 1400,
    weights: [6, 16, 28, 26, 16, 8],
  },
];

export function getCrate(id: string): CrateDef | null {
  return CRATES.find((c) => c.id === id) ?? null;
}

export interface RaceReward {
  xp: number;
  coins: number;
  personalBest: boolean;
}

export function raceReward(input: {
  finished: boolean;
  valid: boolean;
  personalBest: boolean;
}): RaceReward {
  if (!input.finished || !input.valid) {
    return { xp: 15, coins: 8, personalBest: false };
  }
  const xp = 90 + (input.personalBest ? 50 : 0);
  const coins = 45 + (input.personalBest ? 30 : 0);
  return { xp, coins, personalBest: input.personalBest };
}

function weightedRarity(weights: number[]): CosmeticRarity {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITY_ORDER.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return RARITY_ORDER[i];
  }
  return "consumer";
}

export function rollCrateDrop(crate: CrateDef, vehicleId?: VehicleId): CosmeticItem {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rarity = weightedRarity(crate.weights);
    const pool = COSMETICS.filter(
      (c) =>
        c.rarity === rarity &&
        (!vehicleId || c.vehicleId === vehicleId) &&
        !stockIdsFor(c.vehicleId).includes(c.id),
    );
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const fallback = COSMETICS.filter((c) => c.rarity !== "consumer");
  return fallback[Math.floor(Math.random() * fallback.length)] ?? COSMETICS[0];
}

export const STARTING_COINS = 900;
export const STARTING_XP = 0;
/** Temporary guest economy so crate testing is unblocked. */
export const GUEST_UNLIMITED_COINS = 999_999;
