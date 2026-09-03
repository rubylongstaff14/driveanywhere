"use client";

import { VEHICLE_LIST, type VehicleId } from "@/lib/game/vehicles";
import { useGameStore } from "@/stores/game-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";

function StatBar({ label, value, color = "bg-accent" }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="text-fog">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-950">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function VehiclePreview({ id, paint, selected }: { id: VehicleId; paint: string; selected: boolean }) {
  const opacity = selected ? "opacity-100" : "opacity-70";

  if (id === "f1") {
    return (
      <div className={`relative mx-auto h-24 w-44 ${opacity} transition-opacity`}>
        {/* Nose */}
        <div className="absolute left-1/2 top-11 h-2.5 w-8 -translate-x-1/2 -translate-x-14 rounded-sm" style={{ background: paint }} />
        {/* Body */}
        <div className="absolute left-1/2 top-10 h-3.5 w-24 -translate-x-1/2 rounded-sm" style={{ background: paint }} />
        {/* Cockpit */}
        <div className="absolute left-1/2 top-6 h-5 w-8 -translate-x-1/2 rounded-sm bg-slate-950/90" />
        {/* Front wing */}
        <div className="absolute left-2 top-10 h-2 w-16 rounded-sm" style={{ background: paint }} />
        {/* Rear wing */}
        <div className="absolute right-1 top-9 h-1.5 w-16 rounded-sm" style={{ background: paint }} />
        {/* Wheels */}
        {[["left-4", "bottom-2"], ["right-4", "bottom-2"], ["left-14", "bottom-2"], ["right-14", "bottom-2"]].map(([l, b], i) => (
          <div key={i} className={`absolute ${l} ${b} h-4 w-4 rounded-full bg-zinc-700 ring-2 ring-zinc-600`} />
        ))}
      </div>
    );
  }
  if (id === "gwagon") {
    return (
      <div className={`relative mx-auto h-24 w-40 ${opacity} transition-opacity`}>
        <div className="absolute left-1/2 top-4 h-16 w-28 -translate-x-1/2 rounded-md border border-white/10 shadow-lg" style={{ background: paint }} />
        <div className="absolute left-1/2 top-5 h-7 w-20 -translate-x-1/2 rounded-sm bg-sky-900/70" />
        {/* Grille */}
        <div className="absolute left-1/2 top-14 h-2 w-10 -translate-x-1/2 rounded-sm bg-zinc-900" />
        {["left-7", "right-7"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} bottom-1 h-5 w-5 rounded-sm bg-zinc-800 ring-2 ring-zinc-700`} />
        ))}
      </div>
    );
  }
  if (id === "corsa") {
    return (
      <div className={`relative mx-auto h-24 w-40 ${opacity} transition-opacity`}>
        <div className="absolute left-1/2 top-8 h-9 w-28 -translate-x-1/2 rounded-2xl shadow-lg" style={{ background: paint }} />
        <div className="absolute left-1/2 top-6 h-6 w-18 -translate-x-1/2 rounded-t-xl bg-sky-900/70" />
        {["left-8", "right-8"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} bottom-2 h-4 w-4 rounded-full bg-zinc-800 ring-2 ring-zinc-700`} />
        ))}
      </div>
    );
  }
  return (
    <div className={`relative mx-auto h-24 w-40 ${opacity} transition-opacity`}>
      <div className="absolute left-1/2 top-8 h-7 w-32 -translate-x-1/2 rounded-xl shadow-lg" style={{ background: paint }} />
      <div className="absolute left-1/2 top-4 h-7 w-16 -translate-x-1/2 rounded-t-lg bg-sky-900/70" />
      {["left-6", "right-6"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} bottom-2 h-4 w-4 rounded-full bg-zinc-800 ring-2 ring-zinc-700`} />
      ))}
    </div>
  );
}

interface VehicleSelectProps {
  routeName: string;
}

const statColors = ["bg-sky-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400"];

export function VehicleSelect({ routeName }: VehicleSelectProps) {
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicle = useGameStore((s) => s.setSelectedVehicle);
  const confirmGarage = useGameStore((s) => s.confirmGarage);
  const engineVolume = useSettingsStore((s) => s.engineVolume);
  const setEngineVolume = useSettingsStore((s) => s.setEngineVolume);

  const selected = VEHICLE_LIST.find((v) => v.id === selectedVehicleId) ?? VEHICLE_LIST[0];
  const statEntries = [
    { label: "Top speed", value: selected.stats.speed, color: statColors[0] },
    { label: "Acceleration", value: selected.stats.accel, color: statColors[1] },
    { label: "Grip", value: selected.stats.grip, color: statColors[2] },
    { label: "Weight", value: selected.stats.weight, color: statColors[3] },
  ];

  return (
    <div className="mobile-scroll-overlay absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink-975/85 p-4 backdrop-blur-md da-fade-in">
      <div className="mobile-scroll-panel w-full max-w-3xl rounded-2xl border border-white/10 bg-panel shadow-2xl da-fade-up">
        {/* Header */}
        <div className="border-b border-white/8 px-6 py-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
            Choose vehicle
          </p>
          <h2 className="mt-1 font-display text-2xl text-white">{routeName}</h2>
          <p className="mt-1 text-xs text-fog">
            All classes race together — cosmetics are visual only.
          </p>
        </div>

        <div className="p-6">
          {/* Vehicle grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VEHICLE_LIST.map((vehicle) => {
              const active = vehicle.id === selected.id;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-accent/60 bg-accent/8 ring-1 ring-accent/30 shadow-[0_0_16px_rgba(245,166,35,0.12)]"
                      : "border-white/8 bg-ink-950/40 hover:border-white/20 hover:bg-ink-950/70"
                  }`}
                >
                  <VehiclePreview id={vehicle.id} paint={vehicle.paint} selected={active} />
                  <p className="mt-2 font-display text-base font-semibold text-white">
                    {vehicle.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fog leading-relaxed">{vehicle.tagline}</p>
                </button>
              );
            })}
          </div>

          {/* Stats + controls */}
          <div className="mt-5 grid gap-5 rounded-xl border border-white/8 bg-ink-950/50 p-5 sm:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
                {selected.name} — performance
              </p>
              <div className="space-y-3">
                {statEntries.map((s) => (
                  <StatBar key={s.label} label={s.label} value={s.value} color={s.color} />
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <label
                  htmlFor="engine-volume"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-fog"
                >
                  Engine volume — {Math.round(engineVolume * 100)}%
                </label>
                <input
                  id="engine-volume"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(engineVolume * 100)}
                  onChange={(event) => setEngineVolume(Number(event.target.value) / 100)}
                  className="w-full accent-[var(--accent,#f5a623)]"
                />
                <p className="mt-1 text-[11px] text-fog">
                  Pitch rises with speed. Pure engine audio — no music.
                </p>
              </div>

              <Button type="button" className="mt-5 w-full" onClick={confirmGarage}>
                Next: race setup →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
