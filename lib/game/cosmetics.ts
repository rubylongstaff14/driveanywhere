import { VEHICLES, type VehicleId } from "@/lib/game/vehicles";

export type CosmeticRarity =
  | "consumer"
  | "industrial"
  | "milspec"
  | "restricted"
  | "classified"
  | "covert";

export type CosmeticSlot = "paint" | "bumper" | "wing" | "kit";

export type BumperStyle = "stock" | "lip" | "aggressive" | "track";
export type WingStyle = "none" | "lip" | "gt" | "swan";
export type KitStyle = "none" | "skirts" | "canards" | "roof" | "lights";

export interface CosmeticItem {
  id: string;
  vehicleId: VehicleId;
  slot: CosmeticSlot;
  name: string;
  rarity: CosmeticRarity;
  paint?: string;
  paintDark?: string;
  bumper?: BumperStyle;
  wing?: WingStyle;
  kit?: KitStyle;
}

export interface CarLoadout {
  paintId: string;
  bumperId: string;
  wingId: string;
  kitId: string;
}

export const RARITY_ORDER: CosmeticRarity[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
];

export const RARITY_LABEL: Record<CosmeticRarity, string> = {
  consumer: "Standard",
  industrial: "Uncommon",
  milspec: "Rare",
  restricted: "Epic",
  classified: "Legendary",
  covert: "Covert",
};

export const RARITY_COLOR: Record<CosmeticRarity, string> = {
  consumer: "#b7c0ce",
  industrial: "#5ad18a",
  milspec: "#4aa3ff",
  restricted: "#b56bff",
  classified: "#f5a623",
  covert: "#ff5c5c",
};

function item(
  vehicleId: VehicleId,
  slot: CosmeticSlot,
  slug: string,
  name: string,
  rarity: CosmeticRarity,
  extra: Partial<CosmeticItem> = {},
): CosmeticItem {
  return {
    id: `${vehicleId}-${slot}-${slug}`,
    vehicleId,
    slot,
    name,
    rarity,
    ...extra,
  };
}

function catalogFor(id: VehicleId): CosmeticItem[] {
  const stock = VEHICLES[id];
  return [
    item(id, "paint", "stock", `${stock.name} Factory`, "consumer", {
      paint: stock.paint,
      paintDark: stock.paintDark,
    }),
    item(id, "paint", "midnight", "Midnight Pearl", "industrial", {
      paint: "#1a2744",
      paintDark: "#0c1220",
    }),
    item(id, "paint", "volt", "Volt Flare", "restricted", {
      paint: "#c8ff3a",
      paintDark: "#6a8a12",
    }),
    item(id, "paint", "sunset", "Sunset Chrome", "classified", {
      paint: "#ff6a2a",
      paintDark: "#8a2208",
    }),
    item(id, "paint", "obsidian", "Obsidian Gold", "covert", {
      paint: "#0a0a0c",
      paintDark: "#c9a227",
    }),
    item(id, "paint", "glacier", "Glacier Mirror", "milspec", {
      paint: "#c8e8f8",
      paintDark: "#4a7088",
    }),
    item(id, "paint", "amethyst", "Amethyst Night", "classified", {
      paint: "#5a2a8a",
      paintDark: "#1a0c28",
    }),
    item(id, "paint", "carbon", "Carbon Flare", "covert", {
      paint: "#1c1e22",
      paintDark: "#ff5c5c",
    }),
    item(id, "bumper", "stock", "Stock Bumper", "consumer", { bumper: "stock" }),
    item(id, "bumper", "lip", "Split Lip", "milspec", { bumper: "lip" }),
    item(id, "bumper", "aggressive", "Aero Chin", "restricted", {
      bumper: "aggressive",
    }),
    item(id, "bumper", "track", "Track Splitter", "classified", { bumper: "track" }),
    item(id, "wing", "none", "Clean Deck", "consumer", { wing: "none" }),
    item(id, "wing", "lip", "Deck Lip", "industrial", { wing: "lip" }),
    item(id, "wing", "gt", "GT Wing", "restricted", { wing: "gt" }),
    item(id, "wing", "swan", "Swan Neck", "classified", { wing: "swan" }),
    item(id, "kit", "none", "Factory Body", "consumer", { kit: "none" }),
    item(id, "kit", "skirts", "Aero Skirts", "industrial", { kit: "skirts" }),
    item(id, "kit", "canards", "Dive Planes", "milspec", { kit: "canards" }),
    item(id, "kit", "roof", "Roof Scoop", "restricted", { kit: "roof" }),
    item(id, "kit", "lights", "Night Signature", "classified", { kit: "lights" }),
  ];
}

export const COSMETICS: CosmeticItem[] = (
  ["sports", "f1", "corsa", "gwagon"] as VehicleId[]
).flatMap(catalogFor);

const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

export function getCosmetic(id: string | null | undefined): CosmeticItem | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function cosmeticsForVehicle(vehicleId: VehicleId): CosmeticItem[] {
  return COSMETICS.filter((c) => c.vehicleId === vehicleId);
}

export function cosmeticsForSlot(
  vehicleId: VehicleId,
  slot: CosmeticSlot,
): CosmeticItem[] {
  return cosmeticsForVehicle(vehicleId).filter((c) => c.slot === slot);
}

export function defaultLoadout(vehicleId: VehicleId): CarLoadout {
  const items = cosmeticsForVehicle(vehicleId);
  const pick = (slot: CosmeticSlot) =>
    items.find((c) => c.slot === slot && c.rarity === "consumer")?.id ??
    items.find((c) => c.slot === slot)!.id;
  return {
    paintId: pick("paint"),
    bumperId: pick("bumper"),
    wingId: pick("wing"),
    kitId: pick("kit"),
  };
}

export function resolveLoadoutVisual(vehicleId: VehicleId, loadout: CarLoadout) {
  const paint = getCosmetic(loadout.paintId);
  const bumper = getCosmetic(loadout.bumperId);
  const wing = getCosmetic(loadout.wingId);
  const kit = getCosmetic(loadout.kitId);
  const stock = VEHICLES[vehicleId];
  return {
    paint: paint?.paint ?? stock.paint,
    paintDark: paint?.paintDark ?? stock.paintDark,
    bumper: bumper?.bumper ?? "stock",
    wing: wing?.wing ?? "none",
    kit: kit?.kit ?? "none",
  };
}

export function stockIdsFor(vehicleId: VehicleId): string[] {
  return cosmeticsForVehicle(vehicleId)
    .filter((c) => c.rarity === "consumer")
    .map((c) => c.id);
}
