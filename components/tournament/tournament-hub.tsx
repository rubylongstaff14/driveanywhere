"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TOURNAMENT_DEFS,
  getTournamentDef,
  formatMs,
  type ActiveTournament,
  type TournamentDef,
} from "@/lib/progression/tournament";
import { useTournamentStore } from "@/stores/tournament-store";
import { useProgressionStore } from "@/stores/progression-store";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Tournament Card (no active tournament) ────────────────────────────────────

function TournamentCard({
  def,
  playerCoins,
  onEnter,
  entering,
}: {
  def: TournamentDef;
  playerCoins: number;
  onEnter: (defId: string) => void;
  entering: boolean;
}) {
  const canAfford = playerCoins >= def.entryFee;
  const potSize = def.entryFee * def.maxPlayers;

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
            {def.entryFee.toLocaleString()} coins entry
          </p>
          <h3 className="mt-1 font-display text-xl text-white">{def.name}</h3>
          <p className="mt-1 text-sm text-white/60">{def.description}</p>
        </div>
        <div className="flex-shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center">
          <p className="font-mono text-[10px] text-amber-400/70 uppercase tracking-wide">Pot</p>
          <p className="font-mono text-lg font-semibold text-amber-400">
            {potSize.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {def.mapNames.map((name, i) => (
          <div key={name} className="flex items-center gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[9px] text-white/50">
              {i + 1}
            </span>
            <span className="text-sm text-white/70">{name}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/8 bg-white/5 px-3 py-2">
        <p className="text-xs text-white/50">{def.prizeDescription}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className={cn("font-mono text-xs", canAfford ? "text-white/50" : "text-rose-400")}>
          You have {playerCoins.toLocaleString()} coins
          {!canAfford && ` · need ${(def.entryFee - playerCoins).toLocaleString()} more`}
        </p>
        <button
          type="button"
          disabled={!canAfford || entering}
          onClick={() => onEnter(def.id)}
          className={cn(
            "rounded-lg px-5 py-2 text-sm font-medium transition",
            canAfford && !entering
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "cursor-not-allowed bg-white/10 text-white/30",
          )}
        >
          {entering ? "Entering…" : "Enter Tournament"}
        </button>
      </div>
    </div>
  );
}

// ── Round Card (active tournament) ───────────────────────────────────────────

function RoundCard({
  round,
  isCurrent,
  isLocked,
}: {
  round: {
    roundNumber: number;
    mapSlug: string;
    mapName: string;
    playerTimeMs: number | null;
    playerPoints: number;
    completed: boolean;
    ghostTimes: { name: string; timeMs: number; position: number }[];
  };
  isCurrent: boolean;
  isLocked: boolean;
}) {
  if (round.completed) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            Round {round.roundNumber} · Complete
          </p>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-xs text-emerald-300">
            +{round.playerPoints}pts
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-white">{round.mapName}</p>
        {round.playerTimeMs !== null && (
          <p className="mt-1 font-mono text-xs text-white/60">{formatMs(round.playerTimeMs)}</p>
        )}
        <div className="mt-2 space-y-0.5">
          {round.ghostTimes
            .sort((a, b) => a.position - b.position)
            .map((g) => (
              <p key={g.name} className="font-mono text-[10px] text-white/40">
                P{g.position} {g.name} · {formatMs(g.timeMs)}
              </p>
            ))}
        </div>
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
          Round {round.roundNumber} · Up Next
        </p>
        <p className="mt-1 text-sm font-medium text-white">{round.mapName}</p>
        <p className="mt-1 text-xs text-white/50">
          5 AI ghost opponents · Lowest time wins
        </p>
        <Link
          href={`/play/${round.mapSlug}?tournament=1`}
          className="mt-3 flex items-center justify-center rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
        >
          🏁 Race This Map Now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 opacity-50">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        Round {round.roundNumber} · Locked
      </p>
      <p className="mt-1 text-sm text-white/40">{round.mapName}</p>
    </div>
  );
}

// ── Active tournament view ────────────────────────────────────────────────────

function ActiveTournamentView({ tournament }: { tournament: ActiveTournament }) {
  const def = getTournamentDef(tournament.defId);
  const abandonTournament = useTournamentStore((s) => s.abandonTournament);
  const [confirming, setConfirming] = useState(false);

  const currentRoundIndex = tournament.rounds.findIndex((r) => !r.completed);
  const potSize = (def?.entryFee ?? tournament.coinsPaid) * 6;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-400">
          Active Tournament
        </p>
        <h1 className="mt-2 font-display text-4xl text-white">
          {def?.name ?? "Tournament"}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Round {Math.min(currentRoundIndex + 1, 3)} of 3 · Complete all 3 maps to finish
        </p>
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400/70">
          Total Coin Pot
        </p>
        <p className="mt-1 font-mono text-5xl font-bold text-amber-400">
          {potSize.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-amber-400/60">
          {def?.prizeDescription}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            Points so far
          </p>
          <p className="font-mono text-2xl font-semibold text-white">
            {tournament.totalPlayerPoints}pts
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            Completed rounds
          </p>
          <p className="font-mono text-2xl font-semibold text-white">
            {tournament.rounds.filter((r) => r.completed).length} / 3
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {tournament.rounds.map((round, i) => (
          <RoundCard
            key={round.roundNumber}
            round={round}
            isCurrent={i === currentRoundIndex}
            isLocked={i > currentRoundIndex}
          />
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        {confirming ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="text-sm text-white/80">
              Abandon this tournament? You will forfeit your {tournament.coinsPaid.toLocaleString()} coin entry fee with no refund.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => { abandonTournament(); setConfirming(false); }}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400"
              >
                Yes, Abandon
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm text-rose-400/60 hover:text-rose-400"
          >
            Abandon Tournament (no refund)
          </button>
        )}
      </div>
    </div>
  );
}

// ── Finished tournament view ──────────────────────────────────────────────────

function FinishedTournamentView({ tournament }: { tournament: ActiveTournament }) {
  const def = getTournamentDef(tournament.defId);
  const positionEmoji = ["🥇", "🥈", "🥉", "4th", "5th", "6th"];
  const pos = tournament.finalPosition ?? 6;
  const emoji = pos <= 3 ? positionEmoji[pos - 1] : positionEmoji[pos - 1];
  const potSize = (def?.entryFee ?? tournament.coinsPaid) * 6;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-5xl">{pos <= 3 ? emoji : "🏁"}</p>
        <h2 className="mt-3 font-display text-4xl text-white">
          {pos === 1 ? "Tournament Champion!" : pos <= 3 ? "Podium Finish!" : "Race Complete"}
        </h2>
        <p className="mt-2 text-lg text-white/60">
          Final Position: <span className="text-white font-semibold">{emoji}</span>
        </p>
        <p className="mt-1 text-white/60">
          Total Points: <span className="text-white font-semibold">{tournament.totalPlayerPoints}pts</span>
        </p>
        {tournament.coinsWon > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3">
            <p className="text-xs text-amber-400/70 uppercase tracking-widest font-mono">Coins Won</p>
            <p className="font-mono text-4xl font-bold text-amber-400">
              +{tournament.coinsWon.toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-6 py-3">
            <p className="text-sm text-white/40">No prize this time. Enter again to try!</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-3">
          Round Breakdown
        </p>
        <div className="space-y-2">
          {tournament.rounds.map((r) => (
            <div key={r.roundNumber} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <div>
                <span className="text-white/50 font-mono text-xs">R{r.roundNumber} </span>
                <span className="text-white/80">{r.mapName}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                {r.playerTimeMs !== null && (
                  <span className="text-white/50">{formatMs(r.playerTimeMs)}</span>
                )}
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-400">
                  +{r.playerPoints}pts
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-white/10 pt-3 flex justify-between text-sm">
          <span className="text-white/50">Pot size</span>
          <span className="font-mono text-white">{potSize.toLocaleString()} coins</span>
        </div>
      </div>

      <Link
        href="/tournament"
        className="flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-semibold text-black hover:bg-amber-300"
      >
        Enter New Tournament
      </Link>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistorySection({ history }: { history: ActiveTournament[] }) {
  if (history.length === 0) return null;

  const recent = [...history].reverse().slice(0, 3);

  return (
    <div className="mt-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        Recent results
      </p>
      <div className="mt-3 space-y-2">
        {recent.map((t, i) => {
          const def = getTournamentDef(t.defId);
          const pos = t.finalPosition ?? 6;
          const posLabel = pos === 1 ? "🥇 1st" : pos === 2 ? "🥈 2nd" : pos === 3 ? "🥉 3rd" : `${pos}th`;
          return (
            <div
              key={`${t.defId}-${t.enteredAt}-${i}`}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm"
            >
              <div>
                <span className="text-white/70">{def?.name ?? t.defId}</span>
                <span className="ml-2 font-mono text-xs text-white/40">
                  {new Date(t.enteredAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-white/50">{t.totalPlayerPoints}pts</span>
                <span className="text-white/70">{posLabel}</span>
                {t.coinsWon > 0 && (
                  <span className="text-amber-400">+{t.coinsWon.toLocaleString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hub root ──────────────────────────────────────────────────────────────────

export function TournamentHub() {
  const hydrated = useTournamentStore((s) => s.hydrated);
  const hydrate = useTournamentStore((s) => s.hydrate);
  const active = useTournamentStore((s) => s.active);
  const history = useTournamentStore((s) => s.history);
  const enterTournament = useTournamentStore((s) => s.enterTournament);

  const progressionHydrated = useProgressionStore((s) => s.hydrated);
  const progressionHydrate = useProgressionStore((s) => s.hydrate);
  const coins = useProgressionStore((s) => s.coins);

  const [entering, setEntering] = useState<string | null>(null);
  const [enterError, setEnterError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
    if (!progressionHydrated) progressionHydrate();
  }, [hydrated, hydrate, progressionHydrated, progressionHydrate]);

  function handleEnter(defId: string) {
    setEntering(defId);
    setEnterError(null);
    const result = enterTournament(defId);
    setEntering(null);
    if (!result.ok) {
      setEnterError(result.reason);
    }
  }

  if (!hydrated || !progressionHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  // Show finished tournament
  if (active && active.status === "finished") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <FinishedTournamentView tournament={active} />
      </div>
    );
  }

  // Show active tournament
  if (active && active.status === "active") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <ActiveTournamentView tournament={active} />
      </div>
    );
  }

  // Show hub
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-400">
          Tournament Hub
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-white">
          🏆 Tournament
        </h1>
        <p className="mt-3 text-white/60">
          Enter a coin buy-in tournament. Race 3 maps against AI ghost times. Winner takes the pot.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-xs text-white/40">Your balance:</span>
          <span className="font-mono text-sm font-semibold text-amber-400">
            {coins.toLocaleString()} coins
          </span>
        </div>
      </div>

      {enterError && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {enterError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {TOURNAMENT_DEFS.map((def) => (
          <TournamentCard
            key={def.id}
            def={def}
            playerCoins={coins}
            onEnter={handleEnter}
            entering={entering === def.id}
          />
        ))}
      </div>

      <HistorySection history={history} />
    </div>
  );
}
