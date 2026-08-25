import { VEHICLES } from "@/lib/game/vehicles";
export const RARITY_ORDER = [
    "consumer",
    "industrial",
    "milspec",
    "restricted",
    "classified",
    "covert",
];
export const RARITY_LABEL = {
    consumer: "Standard",
    industrial: "Uncommon",
    milspec: "Rare",
    restricted: "Epic",
    classified: "Legendary",
    covert: "Covert",
};
export const RARITY_COLOR = {
    consumer: "#b7c0ce",
    industrial: "#5ad18a",
    milspec: "#4aa3ff",
    restricted: "#b56bff",
    classified: "#f5a623",
    covert: "#ff5c5c",
};
function item(vehicleId, slot, slug, name, rarity, extra = {}) {
    return {
        id: `${vehicleId}-${slot}-${slug}`,
        vehicleId,
        slot,
        name,
        rarity,
        ...extra,
    };
}
function paintCatalog(id) {
    const stock = VEHICLES[id];
    return [
        item(id, "paint", "stock", `${stock.name} Factory`, "consumer", {
            paint: stock.paint,
            paintDark: stock.paintDark,
        }),
        item(id, "paint", "blue", "Racing Blue", "consumer", {
            paint: "#1d6bff",
            paintDark: "#0c3a9a",
        }),
        item(id, "paint", "green", "Track Green", "consumer", {
            paint: "#14b86a",
            paintDark: "#0a6b3c",
        }),
        item(id, "paint", "amber", "Grid Amber", "consumer", {
            paint: "#f0b429",
            paintDark: "#a06a10",
        }),
        item(id, "paint", "white", "Clean White", "consumer", {
            paint: "#f4f4f5",
            paintDark: "#a1a1aa",
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
        item(id, "paint", "british", "British Racing", "restricted", {
            paint: "#0c4a2c",
            paintDark: "#062418",
        }),
        item(id, "paint", "gulf", "Gulf Heritage", "classified", {
            paint: "#74c4e8",
            paintDark: "#f0a010",
        }),
        item(id, "paint", "sakura", "Sakura Mist", "milspec", {
            paint: "#f0b8c8",
            paintDark: "#884058",
        }),
    ];
}
/** Per-class aero — F1 already has wings; SUV gets racks/guards, not swan GT. */
function aeroCatalog(id) {
    if (id === "f1") {
        return [
            item(id, "bumper", "stock", "Spec Front Wing", "consumer", { bumper: "stock" }),
            item(id, "bumper", "lip", "Low Cascade", "milspec", { bumper: "lip" }),
            item(id, "bumper", "aggressive", "High Downforce Nose", "restricted", {
                bumper: "aggressive",
            }),
            item(id, "bumper", "track", "Endplate Splitter", "classified", { bumper: "track" }),
            // "none" = keep factory rear wing; other styles REPLACE it (not stack)
            item(id, "wing", "none", "Factory Rear Wing", "consumer", { wing: "none" }),
            item(id, "wing", "lip", "Low Beam Wing", "industrial", { wing: "lip" }),
            item(id, "wing", "gt", "High-Drag Beam", "restricted", { wing: "gt" }),
            item(id, "wing", "swan", "Swan-Neck Beam", "classified", { wing: "swan" }),
            item(id, "kit", "none", "Bare Sidepods", "consumer", { kit: "none" }),
            item(id, "kit", "skirts", "Floor Edge", "industrial", { kit: "skirts" }),
            item(id, "kit", "canards", "Turning Vanes", "milspec", { kit: "canards" }),
            item(id, "kit", "roof", "Halo Camera Fairing", "restricted", { kit: "roof" }),
            item(id, "kit", "lights", "Rain Light Pack", "classified", { kit: "lights" }),
        ];
    }
    if (id === "gwagon") {
        return [
            item(id, "bumper", "stock", "Stock Guard", "consumer", { bumper: "stock" }),
            item(id, "bumper", "lip", "Steel Bash Plate", "milspec", { bumper: "lip" }),
            item(id, "bumper", "aggressive", "Winch Bumper", "restricted", {
                bumper: "aggressive",
            }),
            item(id, "bumper", "track", "Expedition Guard", "classified", { bumper: "track" }),
            item(id, "wing", "none", "Clean Roof", "consumer", { wing: "none" }),
            item(id, "wing", "lip", "Roof Spoiler", "industrial", { wing: "lip" }),
            item(id, "wing", "gt", "Roof Rack Crossbars", "restricted", { wing: "gt" }),
            item(id, "wing", "swan", "Safari Snorkel Pack", "classified", { wing: "swan" }),
            item(id, "kit", "none", "Factory Body", "consumer", { kit: "none" }),
            item(id, "kit", "skirts", "Rock Sliders", "industrial", { kit: "skirts" }),
            item(id, "kit", "canards", "Ditch Lights Mount", "milspec", { kit: "canards" }),
            item(id, "kit", "roof", "Roof Tent Rails", "restricted", { kit: "roof" }),
            item(id, "kit", "lights", "Light Bar", "classified", { kit: "lights" }),
        ];
    }
    if (id === "corsa") {
        return [
            item(id, "bumper", "stock", "Stock Bumper", "consumer", { bumper: "stock" }),
            item(id, "bumper", "lip", "Front Lip", "milspec", { bumper: "lip" }),
            item(id, "bumper", "aggressive", "Rally Chin", "restricted", {
                bumper: "aggressive",
            }),
            item(id, "bumper", "track", "Track Splitter", "classified", { bumper: "track" }),
            item(id, "wing", "none", "Clean Hatch", "consumer", { wing: "none" }),
            item(id, "wing", "lip", "Hatch Ducktail", "industrial", { wing: "lip" }),
            item(id, "wing", "gt", "Compact GT", "restricted", { wing: "gt" }),
            item(id, "wing", "swan", "Tall Hatch Wing", "classified", { wing: "swan" }),
            item(id, "kit", "none", "Factory Body", "consumer", { kit: "none" }),
            item(id, "kit", "skirts", "Side Skirts", "industrial", { kit: "skirts" }),
            item(id, "kit", "canards", "Canards", "milspec", { kit: "canards" }),
            item(id, "kit", "roof", "Roof Antenna Pack", "restricted", { kit: "roof" }),
            item(id, "kit", "lights", "Fog Signature", "classified", { kit: "lights" }),
        ];
    }
    // sports GT
    return [
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
function catalogFor(id) {
    return [...paintCatalog(id), ...aeroCatalog(id)];
}
export const COSMETICS = ["sports", "f1", "corsa", "gwagon"].flatMap(catalogFor);
const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));
export function getCosmetic(id) {
    if (!id)
        return null;
    return BY_ID.get(id) ?? null;
}
export function cosmeticsForVehicle(vehicleId) {
    return COSMETICS.filter((c) => c.vehicleId === vehicleId);
}
export function cosmeticsForSlot(vehicleId, slot) {
    return cosmeticsForVehicle(vehicleId).filter((c) => c.slot === slot);
}
export function defaultLoadout(vehicleId) {
    const items = cosmeticsForVehicle(vehicleId);
    const pick = (slot) => items.find((c) => c.slot === slot && c.rarity === "consumer")?.id ??
        items.find((c) => c.slot === slot).id;
    return {
        paintId: pick("paint"),
        bumperId: pick("bumper"),
        wingId: pick("wing"),
        kitId: pick("kit"),
    };
}
export function resolveLoadoutVisual(vehicleId, loadout) {
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
export function stockIdsFor(vehicleId) {
    // Base paints + stock aero are always unlocked; shop crates add rarer paints/kits.
    return cosmeticsForVehicle(vehicleId)
        .filter((c) => c.rarity === "consumer" ||
        (c.slot === "paint" && c.rarity === "industrial"))
        .map((c) => c.id);
}
/** Paints shown in lobby: base (consumer/industrial) + any shop unlocks. */
export function availablePaints(vehicleId, unlockedIds) {
    const unlocked = new Set(unlockedIds);
    return cosmeticsForSlot(vehicleId, "paint").filter((c) => c.rarity === "consumer" ||
        c.rarity === "industrial" ||
        unlocked.has(c.id));
}
export function paintHexesForVehicle(vehicleId, unlockedIds) {
    return availablePaints(vehicleId, unlockedIds)
        .map((c) => c.paint)
        .filter((p) => Boolean(p));
}
