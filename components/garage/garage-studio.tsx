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

const SLOTS: {
  slot: CosmeticSlot;
  key: "paintId" | "bumperId" | "wingId" | "kitId";
  label: string;
}[] = [
  { slot: "paint", key: "paintId", label: "Paint" },
  { slot: "bumper", key: "bumperId", label: "Bumper" },
  { slot: "wing", key: "wingId", label: "Wing" },
  { slot: "kit", key: "kitId", label: "Body kit" },
];

export function GarageStudio() {
  const [vehicleId, setVehicleId] = useState<VehicleId>("sports");
  const [saved, setSaved] = useState(false);
  const loadouts = useProgressionStore((s) => s.loadouts);
  const unlocked = useProgressionStore((s) => s.unlocked);
  const equip = useProgressionStore((s) => s.equip);
  const saveLoadouts = useProgressionStore((s) => s.saveLoadouts);
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

  function handleSave() {
    saveLoadouts();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 da-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
        Atelier
      </p>
      <h1 className="mt-2 font-display text-4xl text-white">Garage</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Paint, aero and kits are visual only. Class stats never change. Loadouts
        save to this browser.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VEHICLE_LIST.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVehicleId(v.id)}
            className={
              v.id === vehicleId
                ? "rounded-full bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition-all duration-300"
                : "rounded-full border border-line px-4 py-2 text-sm text-mist transition-all duration-300 hover:border-accent/50 hover:text-white"
            }
          >
            {v.name}
          </button>
        ))}
      </div>

      <div key={vehicleId} className="mt-6 grid gap-6 da-slide-swap lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative h-[420px] overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(ellipse_at_top,#1a2434,transparent_60%),#07090d] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-975 to-transparent" />
          <Canvas camera={{ position: [4.2, 2.2, 5.2], fov: 38 }}>
            <Stage intensity={0.72} environment="city" adjustCamera={1.05}>
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
        <div className="rounded-2xl border border-white/8 bg-panel/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="font-display text-2xl text-white">{vehicle.name}</h2>
          <p className="mt-1 text-sm text-mist">{vehicle.tagline}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[11px] uppercase tracking-wider text-fog">
            <p>Speed {vehicle.stats.speed}</p>
            <p>Accel {vehicle.stats.accel}</p>
            <p>Grip {vehicle.stats.grip}</p>
            <p>Weight {vehicle.stats.weight}</p>
          </div>
          <p className="mt-4 text-xs text-fog">
            {items.length} cosmetics in this class · crates never alter pace.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSave}>
              {saved ? "Saved" : "Save loadout"}
            </Button>
            <Link href="/shop">
              <Button size="sm" variant="secondary">
                Open crates
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {SLOTS.map((group) => (
          <div key={group.slot}>
            <h3 className="font-mono text-xs uppercase tracking-[0.22em] text-fog">
              {group.label}
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                      onClick={() => {
                        equip(vehicleId, group.key, item.id);
                        setSaved(false);
                      }}
                      className={
                        equipped
                          ? "rounded-xl border-2 border-accent bg-ink-950/85 p-3 text-left shadow-[0_0_24px_rgba(245,166,35,0.12)] transition-all duration-200"
                          : owned
                            ? "rounded-xl border border-line bg-ink-950/50 p-3 text-left transition-all duration-200 hover:border-fog"
                            : "rounded-xl border border-line/50 bg-ink-975/40 p-3 text-left opacity-45"
                      }
                    >
                      {item.paint ? (
                        <span
                          className="mb-2 block h-1.5 w-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${item.paint}, ${item.paintDark ?? item.paint})`,
                          }}
                        />
                      ) : null}
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
