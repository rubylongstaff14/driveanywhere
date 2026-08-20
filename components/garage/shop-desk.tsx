"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cosmeticsForVehicle,
  getCosmetic,
  RARITY_COLOR,
  RARITY_LABEL,
  type CosmeticItem,
} from "@/lib/game/cosmetics";
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

const CELL = 148;
const WIN_INDEX = 24;

function reelStrip(items: CosmeticItem[], winnerId: string | null): CosmeticItem[] {
  const base = items.filter((c) => c.rarity !== "consumer");
  const pool = base.length ? base : items;
  const strip: CosmeticItem[] = [];
  for (let i = 0; i < 36; i += 1) {
    strip.push(pool[i % pool.length]);
  }
  if (winnerId) {
    const win = items.find((c) => c.id === winnerId) ?? pool[0];
    strip[WIN_INDEX] = win;
  }
  return strip;
}

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
  const [strip, setStrip] = useState<CosmeticItem[]>([]);
  const reelRef = useRef<HTMLDivElement>(null);
  const rank = rankForXp(xp);
  const user = useAuthStore((s) => s.user);
  const guestTest = !user || user.mode === "guest";
  const coinLabel = guestTest ? "Unlimited (guest test)" : `${coins.toLocaleString()} coins`;
  const catalog = cosmeticsForVehicle(vehicleId);
  const drop = useMemo(() => (result ? getCosmetic(result) : null), [result]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    setStrip(reelStrip(catalog, null));
    if (reelRef.current) {
      reelRef.current.style.transition = "none";
      reelRef.current.style.transform = "translateX(0px)";
    }
  }, [catalog]);

  function handleOpen(crateId: CrateId) {
    if (spinning) return;
    setError(null);
    const outcome = openCrate(crateId, vehicleId);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setStrip(reelStrip(catalog, outcome.itemId));
    setResult(null);
    setSpinning(true);
    const el = reelRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = "translateX(90px)";
    }
    const end = -(WIN_INDEX * CELL) + 220;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const node = reelRef.current;
        if (!node) return;
        node.style.transition = "transform 2.35s cubic-bezier(0.12, 0.82, 0.08, 1)";
        node.style.transform = `translateX(${end}px)`;
      });
    });
    window.setTimeout(() => {
      setSpinning(false);
      setResult(outcome.itemId);
      if (outcome.duplicate) {
        setError(`Duplicate — ${outcome.coinsBack} coins returned.`);
      }
    }, 2450);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 da-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
        Exchange
      </p>
      <h1 className="mt-2 font-display text-4xl text-white">Shop</h1>
      <p className="mt-2 text-sm text-mist">
        Rank {rank.name} · {xp.toLocaleString()} XP · {coinLabel}. Drops stay on
        this class — never stats.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VEHICLE_LIST.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              if (spinning) return;
              setVehicleId(v.id);
              setResult(null);
            }}
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

      <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,#162033,#07090d_70%)] py-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-accent shadow-[0_0_18px_#f5a623]" />
        <div className="pointer-events-none absolute inset-y-6 left-1/2 z-10 h-[calc(100%-48px)] w-[148px] -translate-x-1/2 rounded-xl border border-accent/70" />
        <div className="overflow-hidden">
          <div ref={reelRef} className="da-shop-reel">
            {strip.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="mx-1.5 flex h-[88px] w-[136px] shrink-0 flex-col justify-center rounded-xl border border-white/8 bg-ink-950/80 px-3"
                style={{
                  boxShadow: `inset 0 0 0 1px ${RARITY_COLOR[item.rarity]}33`,
                }}
              >
                <p className="truncate text-sm text-white">{item.name}</p>
                <p
                  className="mt-1 font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: RARITY_COLOR[item.rarity] }}
                >
                  {RARITY_LABEL[item.rarity]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.22em] text-mist">
          {spinning ? "Rolling..." : drop ? drop.name : "Pull a crate"}
        </p>
        {drop && !spinning ? (
          <p
            className="mt-1 text-center font-display text-xl"
            style={{ color: RARITY_COLOR[drop.rarity] }}
          >
            {RARITY_LABEL[drop.rarity]}
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-signal">{error}</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {CRATES.map((crate) => (
          <div
            key={crate.id}
            className="rounded-2xl border border-white/8 bg-panel p-5 transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/40"
          >
            <h2 className="font-display text-xl text-white">{crate.name}</h2>
            <p className="mt-1 text-sm text-mist">{crate.tagline}</p>
            <p className="mt-3 font-mono text-sm text-accent">
              {crate.cost.toLocaleString()} coins
            </p>
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
        Checkout is mocked locally — coins credit instantly and persist here.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {COIN_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => buyCoins(pack.id)}
            className="rounded-2xl border border-line bg-ink-950/50 p-4 text-left transition-all duration-300 hover:border-accent"
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
