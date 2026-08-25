import { describe, expect, it } from "vitest";
import { cosmeticsForVehicle, defaultLoadout } from "@/lib/game/cosmetics";
import { raceReward, rankForXp, rollCrateDrop, CRATES } from "@/lib/progression/economy";
import { cityRegionFromSlug } from "@/components/game/scene/city-block-detail";
import { CIRCUIT_LANDMARKS, LANDMARK_KIND_IDS } from "@/lib/game/circuit-landmarks";
import { VEHICLES } from "@/lib/game/vehicles";

describe("class fairness", () => {
  it("keeps distinct class stats", () => {
    expect(VEHICLES.f1.tuning.maxSpeedMul).toBeGreaterThan(
      VEHICLES.corsa.tuning.maxSpeedMul,
    );
    expect(VEHICLES.sports.tuning.accelMul).not.toBe(
      VEHICLES.gwagon.tuning.accelMul,
    );
  });
});

describe("cosmetics", () => {
  it("ships 28 items per class", () => {
    expect(cosmeticsForVehicle("sports")).toHaveLength(28);
    expect(cosmeticsForVehicle("f1")).toHaveLength(28);
  });

  it("defaults to factory parts", () => {
    const loadout = defaultLoadout("sports");
    expect(loadout.paintId).toContain("paint-stock");
  });
});

describe("economy", () => {
  it("ranks by XP", () => {
    expect(rankForXp(0).id).toBe("rookie");
    expect(rankForXp(9000).id).toBe("legend");
  });

  it("rewards a valid finish more than a DNF", () => {
    const win = raceReward({ finished: true, valid: true, personalBest: true });
    const dnf = raceReward({ finished: false, valid: false, personalBest: false });
    expect(win.xp).toBeGreaterThan(dnf.xp);
    expect(win.coins).toBeGreaterThan(dnf.coins);
  });

  it("rolls a crate item", () => {
    const drop = rollCrateDrop(CRATES[1], "sports");
    expect(drop.vehicleId).toBe("sports");
  });
});

describe("city regions", () => {
  it("maps every circuit slug to a skyline language", () => {
    expect(cityRegionFromSlug("dubai-marina-circuit")).toBe("dubai");
    expect(cityRegionFromSlug("tokyo-drift-circuit")).toBe("tokyo");
    expect(cityRegionFromSlug("egypt-pyramids")).toBe("egypt");
    expect(cityRegionFromSlug("rio-coast-circuit")).toBe("rio");
    expect(cityRegionFromSlug("alps-mountain-pass")).toBe("alps");
    expect(cityRegionFromSlug("new-york-harbor-circuit")).toBe("nyc");
    expect(cityRegionFromSlug("westminster-sprint")).toBe("london");
  });
});

describe("circuit landmarks", () => {
  it("places 60 uniquely named landmarks on every map", () => {
    for (const [slug, list] of Object.entries(CIRCUIT_LANDMARKS)) {
      expect(list, slug).toHaveLength(60);
      expect(new Set(list.map((l) => l.name)).size).toBe(60);
      expect(new Set(list.map((l) => l.kind)).size).toBeGreaterThanOrEqual(12);
      expect(LANDMARK_KIND_IDS.length).toBeGreaterThanOrEqual(30);
    }
  });
});
