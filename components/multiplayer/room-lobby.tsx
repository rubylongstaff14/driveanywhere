"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

interface RoomLobbyProps {
  roomId: string;
}

export function RoomLobby({ roomId }: RoomLobbyProps) {
  const router = useRouter();
  const {
    connected,
    connect,
    currentRoom,
    myId,
    countdownValue,
    racing,
    results,
    error,
    clearError,
    setReady,
    leaveRoom,
    hostSetMap,
    hostSetDifficulty,
    hostSetAi,
    hostKick,
    hostStart,
  } = useMultiplayerStore();

  const isHost = currentRoom?.players.find((p) => p.id === myId)?.isHost ?? false;
  const me = currentRoom?.players.find((p) => p.id === myId);
  const allReady = currentRoom?.players.every((p) => p.ready) && (currentRoom?.players.length ?? 0) >= 2;

  useEffect(() => {
    if (!connected) connect();
  }, [connect, connected]);

  useEffect(() => {
    if (!currentRoom && connected) {
      router.push("/play/online");
    }
  }, [currentRoom, connected, router]);

  useEffect(() => {
    if (racing && currentRoom) {
      router.push(`/play/${currentRoom.map}?mode=online&roomId=${currentRoom.id}`);
    }
  }, [racing, currentRoom, router]);

  if (!currentRoom) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink-975 text-mist">
        <p>Connecting to room...</p>
      </div>
    );
  }

  const maps = [
    { slug: "westminster-sprint", name: "Westminster Sprint" },
    { slug: "embankment-run", name: "Embankment Run" },
    { slug: "canary-wharf-loop", name: "Canary Wharf Loop" },
    { slug: "dubai-marina-circuit", name: "Dubai Marina Circuit" },
    { slug: "egypt-pyramids", name: "Egypt Pyramids" },
    { slug: "new-york-harbor-circuit", name: "New York Harbor Circuit" },
  ];

  return (
    <div className="min-h-[100dvh] bg-ink-975 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl">{currentRoom.name}</h1>
            <p className="mt-1 text-xs text-mist">
              {maps.find((m) => m.slug === currentRoom.map)?.name ?? currentRoom.map}
              {" · "}
              {currentRoom.difficulty}
              {currentRoom.aiCount > 0 && ` · ${currentRoom.aiCount} AI`}
            </p>
          </div>
          <button
            onClick={() => { leaveRoom(); router.push("/play/online"); }}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs hover:bg-white/5"
          >
            Leave
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-signal/30 bg-signal/10 px-4 py-2 text-sm text-signal">
            {error}
            <button onClick={clearError} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {countdownValue !== null && (
          <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 py-6 text-center">
            <p className="text-xs uppercase tracking-widest text-mist">Race starting in</p>
            <p className="mt-2 font-display text-6xl text-accent">{countdownValue}</p>
          </div>
        )}

        {results && (
          <div className="mb-6 rounded-xl border border-white/10 bg-ink-950 p-5">
            <h2 className="mb-3 font-display text-lg">Results</h2>
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.playerId} className="flex justify-between text-sm">
                  <span>
                    <span className="mr-2 font-mono text-accent">P{r.position}</span>
                    {r.playerName}
                    {r.playerId === myId && " (you)"}
                  </span>
                  <span className="text-mist">
                    {r.finished && r.timeMs ? `${(r.timeMs / 1000).toFixed(2)}s` : "DNF"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Host controls */}
        {isHost && currentRoom.status === "waiting" && (
          <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-accent">Host Controls</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] text-mist">Map</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-2 py-1.5 text-xs text-white"
                  value={currentRoom.map}
                  onChange={(e) => hostSetMap(e.target.value)}
                >
                  {maps.map((m) => (
                    <option key={m.slug} value={m.slug}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-mist">Difficulty</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-2 py-1.5 text-xs text-white"
                  value={currentRoom.difficulty}
                  onChange={(e) => hostSetDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-mist">AI Fill ({currentRoom.aiCount})</label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={currentRoom.aiCount}
                  onChange={(e) => hostSetAi(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <button
              onClick={hostStart}
              disabled={!allReady}
              className="mt-4 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-40"
            >
              {allReady ? "Start Race" : "Waiting for players to ready up..."}
            </button>
          </div>
        )}

        {/* Player list */}
        <div className="rounded-xl border border-white/10 bg-ink-950 p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-mist">
            Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
          </h2>
          <div className="space-y-2">
            {currentRoom.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-ink-975 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.ready ? "bg-green-400" : "bg-white/20"}`} />
                  <span className="text-sm">
                    {p.name}
                    {p.isHost && <span className="ml-1.5 text-[10px] text-accent">(Host)</span>}
                    {p.id === myId && <span className="ml-1.5 text-[10px] text-mist">(You)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-mist">{p.ready ? "Ready" : "Not ready"}</span>
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => hostKick(p.id)}
                      className="text-[10px] text-signal/70 hover:text-signal"
                    >
                      Kick
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Ready button for non-hosts */}
          {currentRoom.status === "waiting" && (
            <div className="mt-4 text-center">
              {me && !me.isHost && (
                <button
                  onClick={() => setReady(!me.ready)}
                  className={`rounded-lg px-6 py-2 text-sm font-medium ${
                    me.ready
                      ? "border border-white/10 bg-white/5 text-mist hover:bg-white/10"
                      : "bg-green-500 text-white hover:bg-green-400"
                  }`}
                >
                  {me.ready ? "Unready" : "Ready Up"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
