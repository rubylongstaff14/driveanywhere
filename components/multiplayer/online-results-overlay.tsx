"use client";

import { useRouter } from "next/navigation";
import { TrackDeltaOverview } from "@/components/multiplayer/track-delta-overview";
import { formatLapTime } from "@/lib/utils/format";
import type { RouteData } from "@/lib/validation/route-data";
import { useGameStore } from "@/stores/game-store";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

export function OnlineResultsOverlay({ route }: { route: RouteData }) {
  const router = useRouter();
  const results = useMultiplayerStore((s) => s.results);
  const resultsProvisional = useMultiplayerStore((s) => s.resultsProvisional);
  const myId = useMultiplayerStore((s) => s.myId);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const spectating = useMultiplayerStore((s) => s.spectating);
  const joinNextRace = useMultiplayerStore((s) => s.joinNextRace);
  const localFinished = useGameStore((s) => s.finished);

  // Still-racing players must not be blocked by the live standings board
  if (!results) return null;
  if (resultsProvisional && !localFinished && !spectating) return null;

  const winner = results.find((r) => r.finished) ?? results[0];
  const me = results.find((r) => r.playerId === myId);
  const waitingCount = results.filter((r) => !r.finished).length;

  function handlePlayAgain() {
    useMultiplayerStore.setState({
      results: null,
      racing: false,
      resultsProvisional: false,
    });
    if (spectating) joinNextRace();
    if (currentRoom) {
      router.push(`/play/online/${currentRoom.id}`);
    } else {
      router.push("/play/online");
    }
  }

  return (
    <div className="mobile-scroll-overlay absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-ink-975/85 py-6 backdrop-blur-sm">
      <div className="mobile-scroll-panel mx-4 w-full max-w-xl rounded-2xl border border-white/10 bg-ink-950 p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            {resultsProvisional ? "Live standings" : "Race Complete"}
          </p>
          <h2 className="mt-2 font-display text-3xl text-white">
            {spectating
              ? "Spectating"
              : resultsProvisional
                ? `P${me?.position ?? "—"} · waiting`
                : me?.position === 1
                  ? "Victory!"
                  : `P${me?.position ?? "?"}`}
          </h2>
          {resultsProvisional && waitingCount > 0 && (
            <p className="mt-1 text-sm text-amber-200/80">
              Waiting for {waitingCount} rival
              {waitingCount === 1 ? "" : "s"} to finish…
            </p>
          )}
          {me?.timeMs && (
            <p className="mt-1 font-mono text-lg text-white/80">
              {formatLapTime(me.timeMs)}
            </p>
          )}
        </div>

        <div className="mb-5">
          <TrackDeltaOverview route={route} results={results} myId={myId} />
        </div>

        <div className="mb-5 rounded-xl border border-white/5 bg-ink-975 p-4">
          <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-mist">
            <span>Pos</span>
            <span>Player</span>
            <span>Time</span>
            <span>Delta</span>
          </div>
          {results.map((r) => {
            const delta =
              winner?.timeMs && r.timeMs ? r.timeMs - winner.timeMs : null;
            const isMe = r.playerId === myId;
            const swatch = r.paint ?? "#94a3b8";
            return (
              <div
                key={r.playerId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isMe ? "border border-accent/20 bg-accent/10" : ""
                }`}
              >
                <span className="flex w-10 items-center gap-1.5 font-mono font-bold text-accent">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: swatch }}
                  />
                  P{r.position}
                </span>
                <span className="flex-1 text-white">
                  {r.playerName}
                  {isMe && (
                    <span className="ml-1 text-[10px] text-mist">(you)</span>
                  )}
                </span>
                <span className="w-20 text-right font-mono text-xs text-white/70">
                  {r.finished && r.timeMs
                    ? formatLapTime(r.timeMs)
                    : resultsProvisional
                      ? "…"
                      : "DNF"}
                </span>
                <span className="w-20 text-right font-mono text-xs text-signal/80">
                  {delta && delta > 0 ? `+${(delta / 1000).toFixed(3)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {!resultsProvisional && winner?.splits && winner.splits.length > 0 && (
          <div className="mb-5 rounded-xl border border-white/5 bg-ink-975 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-mist">
              Winner splits ({winner.playerName})
            </p>
            <div className="flex gap-2">
              {winner.splits.map((split, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-lg bg-ink-950 p-2 text-center"
                >
                  <p className="text-[9px] text-mist">S{i + 1}</p>
                  <p className="font-mono text-xs text-white">
                    {formatLapTime(split)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {!resultsProvisional && (
            <button
              onClick={handlePlayAgain}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/80"
            >
              {spectating ? "Join next race" : "Play Again"}
            </button>
          )}
          <button
            onClick={() => router.push("/play/online")}
            className="rounded-lg border border-white/10 px-6 py-2.5 text-sm text-mist hover:bg-white/5"
          >
            Server Browser
          </button>
        </div>
      </div>
    </div>
  );
}
