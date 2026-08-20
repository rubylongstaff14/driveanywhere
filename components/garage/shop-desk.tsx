"use client";

import { useEffect, useMemo, useState } from "react";
import { getCosmetic, RARITY_COLOR, RARITY_LABEL } from "@/lib/game/cosmetics";
import { VEHICLE_LIST, type VehicleId } from "@/lib/game/vehicles";
import {
  COIN_PACKS,
  CRATES,
  rankForXp,
  type CrateId,
} from "@/lib/progression/economy";
import { useProgressionStore } from "@/stores/progression-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

export function ShopDesk() {
  const coins = useProgressionStore((s) => s.coins);
  const xp = useProgressionStore((s) => s.xp);
  const buyCoins = useProgressionStore((s) => s.buyCoins);
  const openCrate = useProgressionStore((s) => s.openCrate);
  const hydrate = useProgressionStore((s) => s.hydrate);
  const hydrated = useProgressionStore((s) => s.hydrated);
  const [vehicleId, setVehicleId] = useState<VehicleId>("sports");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rank = rankForXp(xp);
  const user = useAuthStore((s) => s.user);
  const guestTest = !user || user.mode === "guest";
  const coinLabel = guestTest ? "Unlimited (guest test)" : `${coins} coins`;

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const drop = useMemo(() => (result ? getCosmetic(result) : null), [result]);

  function handleOpen(crateId: CrateId) {
    if (spinning) return;
    setError(null);
    setSpinning(true);
    setResult(null);
    window.setTimeout(() => {
      const outcome = openCrate(crateId, vehicleId);
      setSpinning(false);
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      setResult(outcome.itemId);
      if (outcome.duplicate) {
        setError(`Duplicate — ${outcome.coinsBack} coins returned.`);
      }
    }, 1600);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 da-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Shop</p>
      <h1 className="mt-2 font-display text-4xl text-white">Coins & crates</h1>
      <p className="mt-2 text-sm text-mist">
        Rank {rank.name} · {xp} XP · {coinLabel}. Crates drop cosmetics for the
        selected class only — never stats.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
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
            {v.name} crate
          </button>
        ))}
      </div>

      <div className="relative mt-8 overflow-hidden rounded-xl border border-line bg-ink-975 py-10">
        <div
          className={`mx-auto h-16 w-[160%] border-y border-white/10 bg-[linear-gradient(90deg,#1a2744,#c8102e,#c8ff3a,#4aa3ff,#f5a623,#ff5c5c,#1a2744,#c8102e)] ${
            spinning ? "da-crate-reel" : ""
          }`}
        />
        <p className="mt-4 text-center font-mono text-xs uppercase tracking-[0.2em] text-mist">
          {spinning ? "Opening..." : drop ? drop.name : "Pull a crate"}
        </p>
        {drop ? (
          <p
            className="mt-1 text-center font-mono text-[11px] uppercase tracking-widest"
            style={{ color: RARITY_COLOR[drop.rarity] }}
          >
            {RARITY_LABEL[drop.rarity]}
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-signal">{error}</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {CRATES.map((crate) => (
          <div key={crate.id} className="rounded-xl border border-line bg-panel p-5">
            <h2 className="font-display text-xl text-white">{crate.name}</h2>
            <p className="mt-1 text-sm text-mist">{crate.tagline}</p>
            <p className="mt-3 font-mono text-sm text-accent">{crate.cost} coins</p>
            <Button
              className="mt-4 w-full"
              disabled={spinning || (!guestTest && coins < crate.cost)}
              onClick={() => handleOpen(crate.id)}
            >
              Open
            </Button>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl text-white">Buy coins</h2>
      <p className="mt-1 text-sm text-mist">
        Checkout is mocked locally for now — coins credit instantly.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {COIN_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => buyCoins(pack.id)}
            className="rounded-xl border border-line bg-ink-950/50 p-4 text-left hover:border-accent"
          >
            <p className="font-medium text-white">{pack.name}</p>
            <p className="mt-1 text-sm text-mist">
              {pack.coins.toLocaleString()} coins · {pack.priceLabel}
              {pack.bonus ? ` · ${pack.bonus}` : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
