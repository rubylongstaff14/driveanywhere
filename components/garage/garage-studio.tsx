"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import {
  RARITY_COLOR,
  RARITY_LABEL,
  cosmeticsForVehicle,
  resolveLoadoutVisual,
  type CosmeticSlot,
} from "@/lib/game/cosmetics";
import { VEHICLE_LIST, type VehicleId } from "@/lib/game/vehicles";
import { useProgressionStore } from "@/stores/progression-store";
import { Button } from "@/components/ui/button";

const SLOTS: { slot: CosmeticSlot; key: "paintId" | "bumperId" | "wingId" | "kitId"; label: string }[] = [
  { slot: "paint", key: "paintId", label: "Paint" },
  { slot: "bumper", key: "bumperId", label: "Bumper" },
  { slot: "wing", key: "wingId", label: "Wing" },
  { slot: "kit", key: "kitId", label: "Body kit" },
];

export function GarageStudio() {
  const [vehicleId, setVehicleId] = useState<VehicleId>("sports");
  const loadouts = useProgressionStore((s) => s.loadouts);
  const unlocked = useProgressionStore((s) => s.unlocked);
  const equip = useProgressionStore((s) => s.equip);
  const hydrate = useProgressionStore((s) => s.hydrate);
  const hydrated = useProgressionStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
  const vehicle = VEHICLE_LIST.find((v) => v.id === vehicleId)!;
  const loadout = loadouts[vehicleId];
  const visual = useMemo(
    () => resolveLoadoutVisual(vehicleId, loadout),
    [loadout, vehicleId],
  );
  const items = cosmeticsForVehicle(vehicleId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 da-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Garage</p>
      <h1 className="mt-2 font-display text-4xl text-white">Edit cars</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Unlock paints, bumpers, wings and kits from crates. They never change
        speed or grip — each class keeps its own stats, and a race uses one
        class for the whole grid.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VEHICLE_LIST.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVehicleId(v.id)}
            className={
              v.id === vehicleId
                ? "rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink-950"
                : "rounded-md border border-line px-3 py-2 text-sm text-mist hover:text-white"
            }
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[360px] overflow-hidden rounded-xl border border-line bg-ink-975">
          <Canvas camera={{ position: [4.2, 2.2, 5.2], fov: 42 }}>
            <Stage intensity={0.6} environment="city" adjustCamera={1.1}>
              <VehicleBody
                id={vehicleId}
                paint={visual.paint}
                paintDark={visual.paintDark}
                bumper={visual.bumper}
                wing={visual.wing}
                kit={visual.kit}
              />
            </Stage>
            <OrbitControls enablePan={false} />
          </Canvas>
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl text-white">{vehicle.name}</h2>
          <p className="mt-1 text-sm text-mist">{vehicle.tagline}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] uppercase tracking-wider text-fog">
            <p>Speed {vehicle.stats.speed}</p>
            <p>Accel {vehicle.stats.accel}</p>
            <p>Grip {vehicle.stats.grip}</p>
            <p>Weight {vehicle.stats.weight}</p>
          </div>
          <p className="mt-3 text-xs text-fog">
            Class stats are locked. Cosmetics below are visual only.
          </p>
          <Link href="/shop" className="mt-4 inline-block">
            <Button size="sm">Open crates</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {SLOTS.map((group) => (
          <div key={group.slot}>
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-fog">
              {group.label}
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items
                .filter((item) => item.slot === group.slot)
                .map((item) => {
                  const owned = unlocked.includes(item.id);
                  const equipped = loadout[group.key] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!owned}
                      onClick={() => equip(vehicleId, group.key, item.id)}
                      className={
                        equipped
                          ? "rounded-lg border-2 border-accent bg-ink-950/80 p-3 text-left"
                          : owned
                            ? "rounded-lg border border-line bg-ink-950/40 p-3 text-left hover:border-fog"
                            : "rounded-lg border border-line/60 bg-ink-975/40 p-3 text-left opacity-50"
                      }
                    >
                      <p className="text-sm text-white">{item.name}</p>
                      <p
                        className="mt-1 font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: RARITY_COLOR[item.rarity] }}
                      >
                        {RARITY_LABEL[item.rarity]}
                        {owned ? "" : " · locked"}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
