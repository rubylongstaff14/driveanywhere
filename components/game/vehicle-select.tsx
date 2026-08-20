"use client";

import { VEHICLE_LIST, type VehicleId } from "@/lib/game/vehicles";
import { useGameStore } from "@/stores/game-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-fog">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-950">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function VehiclePreview({
  id,
  paint,
  selected,
}: {
  id: VehicleId;
  paint: string;
  selected: boolean;
}) {
  // Simple orthographic CSS silhouette — readable without a second WebGL canvas.
  if (id === "f1") {
    return (
      <div
        className={`relative mx-auto h-24 w-40 ${selected ? "opacity-100" : "opacity-80"}`}
      >
        <div
          className="absolute left-1/2 top-10 h-3 w-28 -translate-x-1/2 rounded-sm"
          style={{ background: paint }}
        />
        <div
          className="absolute left-1/2 top-6 h-4 w-10 -translate-x-1/2 rounded-sm"
          style={{ background: "#111" }}
        />
        <div
          className="absolute left-2 top-9 h-2 w-14 rounded-sm"
          style={{ background: paint }}
        />
        <div
          className="absolute right-2 top-9 h-2 w-14 rounded-sm"
          style={{ background: paint }}
        />
        <div className="absolute bottom-3 left-6 h-3 w-3 rounded-full bg-zinc-800" />
        <div className="absolute bottom-3 right-6 h-3 w-3 rounded-full bg-zinc-800" />
        <div className="absolute bottom-3 left-16 h-3 w-3 rounded-full bg-zinc-800" />
        <div className="absolute bottom-3 right-16 h-3 w-3 rounded-full bg-zinc-800" />
      </div>
    );
  }
  if (id === "gwagon") {
    return (
      <div className="relative mx-auto h-24 w-40">
        <div
          className="absolute left-1/2 top-5 h-14 w-28 -translate-x-1/2 rounded-sm border border-white/10"
          style={{ background: paint }}
        />
        <div className="absolute left-1/2 top-6 h-5 w-20 -translate-x-1/2 rounded-sm bg-sky-950/80" />
        <div className="absolute bottom-2 left-8 h-4 w-4 rounded-sm bg-zinc-900" />
        <div className="absolute bottom-2 right-8 h-4 w-4 rounded-sm bg-zinc-900" />
      </div>
    );
  }
  if (id === "corsa") {
    return (
      <div className="relative mx-auto h-24 w-40">
        <div
          className="absolute left-1/2 top-8 h-8 w-28 -translate-x-1/2 rounded-2xl"
          style={{ background: paint }}
        />
        <div className="absolute left-1/2 top-6 h-5 w-16 -translate-x-1/2 rounded-t-xl bg-sky-900/70" />
        <div className="absolute bottom-3 left-9 h-3.5 w-3.5 rounded-full bg-zinc-800" />
        <div className="absolute bottom-3 right-9 h-3.5 w-3.5 rounded-full bg-zinc-800" />
      </div>
    );
  }
  return (
    <div className="relative mx-auto h-24 w-40">
      <div
        className="absolute left-1/2 top-9 h-6 w-32 -translate-x-1/2 rounded-xl"
        style={{ background: paint }}
      />
      <div className="absolute left-1/2 top-5 h-6 w-14 -translate-x-1/2 rounded-t-lg bg-sky-950/75" />
      <div className="absolute bottom-3 left-7 h-3.5 w-3.5 rounded-full bg-zinc-800" />
      <div className="absolute bottom-3 right-7 h-3.5 w-3.5 rounded-full bg-zinc-800" />
    </div>
  );
}

interface VehicleSelectProps {
  routeName: string;
}

export function VehicleSelect({ routeName }: VehicleSelectProps) {
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicle = useGameStore((s) => s.setSelectedVehicle);
  const confirmGarage = useGameStore((s) => s.confirmGarage);
  const engineVolume = useSettingsStore((s) => s.engineVolume);
  const setEngineVolume = useSettingsStore((s) => s.setEngineVolume);

  const selected =
    VEHICLE_LIST.find((v) => v.id === selectedVehicleId) ?? VEHICLE_LIST[0];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink-975/80 p-4 backdrop-blur-md da-fade-in">
      <div className="w-full max-w-3xl rounded-xl border border-line bg-panel p-6 shadow-2xl da-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Choose vehicle
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">{routeName}</h2>
        <p className="mt-2 text-sm text-mist">
          Classes have different pace. In a race everyone drives the same class —
          skins and aero are cosmetic only.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {VEHICLE_LIST.map((vehicle) => {
            const active = vehicle.id === selected.id;
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelectedVehicle(vehicle.id)}
                className={
                  active
                    ? "rounded-lg border-2 border-accent bg-ink-950/80 p-4 text-left"
                    : "rounded-lg border border-line bg-ink-950/40 p-4 text-left transition hover:border-fog"
                }
              >
                <VehiclePreview
                  id={vehicle.id}
                  paint={vehicle.paint}
                  selected={active}
                />
                <p className="mt-2 font-display text-xl text-white">
                  {vehicle.name}
                </p>
                <p className="mt-1 text-xs text-mist">{vehicle.tagline}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-line bg-ink-950/50 p-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
              {selected.name} stats
            </p>
            <div className="mt-3 space-y-2.5">
              <StatBar label="Top speed" value={selected.stats.speed} />
              <StatBar label="Acceleration" value={selected.stats.accel} />
              <StatBar label="Grip" value={selected.stats.grip} />
              <StatBar label="Weight" value={selected.stats.weight} />
            </div>
          </div>
          <div>
            <label
              htmlFor="engine-volume"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog"
            >
              Engine volume
            </label>
            <input
              id="engine-volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(engineVolume * 100)}
              onChange={(event) =>
                setEngineVolume(Number(event.target.value) / 100)
              }
              className="mt-4 w-full accent-[var(--accent,#e8b84a)]"
            />
            <p className="mt-2 text-xs text-fog">
              {Math.round(engineVolume * 100)}% — pitch rises with speed.
            </p>
            <Button type="button" className="mt-6 w-full" onClick={confirmGarage}>
              Next: race setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
