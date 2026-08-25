"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { useAchievementStore } from "@/stores/achievement-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

/** Card width (136) + horizontal margins (12) */
const CELL = 148;
const WIN_INDEX = 24;
const SPIN_MS = 2800;

function reelStrip(items: CosmeticItem[], winnerId: string | null): CosmeticItem[] {
  const base = items.filter((c) => c.rarity !== "consumer");
  const pool = base.length ? base : items;
  const strip: CosmeticItem[] = [];
  for (let i = 0; i < 40; i += 1) {
    // Shuffle feel — step through pool with a prime stride
    strip.push(pool[(i * 7) % pool.length]);
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
  /** When set, useLayoutEffect drives the CSS transform spin. */
  const [spinTicket, setSpinTicket] = useState(0);
  const [pendingDrop, setPendingDrop] = useState<{
    itemId: string;
    duplicate: boolean;
    coinsBack: number;
  } | null>(null);

  const reelRef = useRef<HTMLDivElement>(null);
  const rank = rankForXp(xp);
  const user = useAuthStore((s) => s.user);
  const guestTest = !user || user.mode === "guest";
  const coinLabel = guestTest
    ? "Unlimited (guest test)"
    : `${coins.toLocaleString()} coins`;
  const catalog = cosmeticsForVehicle(vehicleId);
  const drop = useMemo(() => (result ? getCosmetic(result) : null), [result]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    setStrip(reelStrip(catalog, null));
    setResult(null);
    const el = reelRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = "translateX(0px)";
      el.style.filter = "none";
    }
  }, [catalog]);

  // Kick the spin AFTER React commits the new strip into the DOM.
  useLayoutEffect(() => {
    if (!spinTicket || !pendingDrop) return;
    const el = reelRef.current;
    if (!el) return;

    const end = -(WIN_INDEX * CELL) + 220;

    // 1) Snap to start with no transition
    el.style.transition = "none";
    el.style.transform = "translateX(120px)";
    el.style.filter = "blur(1.5px)";
    // Force reflow so the browser registers the start pose
    void el.offsetWidth;

    // 2) Animate to the winner cell
    el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.82, 0.08, 1), filter 0.6s ease-out`;
    el.style.transform = `translateX(${end}px)`;
    el.style.filter = "blur(0px)";

    const done = window.setTimeout(() => {
      setSpinning(false);
      setResult(pendingDrop.itemId);
      if (pendingDrop.duplicate) {
        setError(`Duplicate — ${pendingDrop.coinsBack} coins returned.`);
      }
      setPendingDrop(null);
      useAchievementStore.getState().recordCrateOpen();
    }, SPIN_MS + 40);

    return () => window.clearTimeout(done);
  }, [spinTicket, pendingDrop]);

  function handleOpen(crateId: CrateId) {
    if (spinning) return;
    setError(null);
    setResult(null);

    const outcome = openCrate(crateId, vehicleId);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }

    // Build strip with winner planted, then ticket the layout effect to spin.
    setStrip(reelStrip(catalog, outcome.itemId));
    setPendingDrop({
      itemId: outcome.itemId,
      duplicate: outcome.duplicate,
      coinsBack: outcome.coinsBack,
    });
    setSpinning(true);
    setSpinTicket((n) => n + 1);
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
      <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-mist">
        Cosmetics are visual-only. Coin packs are{" "}
        <span className="text-white">test grants</span> until Stripe/IAP is wired
        for launch — no real charges yet.
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
        <div className="pointer-events-none absolute inset-y-6 left-1/2 z-10 h-[calc(100%-48px)] w-[148px] -translate-x-1/2 rounded-xl border-2 border-accent/80 shadow-[0_0_24px_rgba(245,166,35,0.25)]" />

        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 bg-gradient-to-r from-[#07090d] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 bg-gradient-to-l from-[#07090d] to-transparent" />

        <div className="overflow-hidden">
          <div
            ref={reelRef}
            className={`da-shop-reel ${spinning ? "is-spinning" : ""}`}
          >
            {strip.map((item, i) => {
              const isWinner = !spinning && result === item.id && i === WIN_INDEX;
              return (
                <div
                  key={`${item.id}-${i}`}
                  className={`mx-1.5 flex h-[88px] w-[136px] shrink-0 flex-col justify-center rounded-xl border px-3 transition-all duration-300 ${
                    isWinner
                      ? "scale-105 border-accent bg-accent/10 shadow-[0_0_20px_rgba(245,166,35,0.35)]"
                      : "border-white/8 bg-ink-950/80"
                  }`}
                  style={{
                    boxShadow: isWinner
                      ? undefined
                      : `inset 0 0 0 1px ${RARITY_COLOR[item.rarity]}33`,
                  }}
                >
                  <p className="truncate text-sm font-medium text-white">
                    {item.name}
                  </p>
                  <p
                    className="mt-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: RARITY_COLOR[item.rarity] }}
                  >
                    {RARITY_LABEL[item.rarity]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.22em] text-mist">
          {spinning ? "Rolling…" : drop ? drop.name : "Pull a crate"}
        </p>
        {drop && !spinning ? (
          <p
            className="mt-1 text-center font-display text-xl da-fade-up"
            style={{ color: RARITY_COLOR[drop.rarity] }}
          >
            {RARITY_LABEL[drop.rarity]} unlocked
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
              {spinning ? "Spinning…" : "Open"}
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
