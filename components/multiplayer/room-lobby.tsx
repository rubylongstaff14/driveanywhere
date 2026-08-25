"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { VEHICLE_LIST } from "@/lib/game/vehicles";
import { ONLINE_MAPS } from "@/lib/game/online-maps";
import { lobbyDifficultyToSkill } from "@/lib/game/race-setup";
import {
  availablePaints,
} from "@/lib/game/cosmetics";
import { isPaintHexTaken } from "@/lib/multiplayer/race-colors";
import { useProgressionStore } from "@/stores/progression-store";
import type { VehicleId } from "@/lib/game/vehicles";

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
    hostSetVehicle,
    hostKick,
    hostStart,
    setLoadout,
  } = useMultiplayerStore();

  const unlocked = useProgressionStore((s) => s.unlocked);
  const hydrateProgression = useProgressionStore((s) => s.hydrate);
  const progressionHydrated = useProgressionStore((s) => s.hydrated);

  useEffect(() => {
    if (!progressionHydrated) hydrateProgression();
  }, [hydrateProgression, progressionHydrated]);

  useEffect(() => {
    if (!connected) connect();
  }, [connect, connected]);

  useEffect(() => {
    if (!currentRoom && connected) {
      router.push("/play/online");
    }
  }, [currentRoom, connected, router]);

  const raceVehicleId = useMultiplayerStore((s) => s.raceVehicleId);
  const raceLoading = useMultiplayerStore((s) => s.raceLoading);

  useEffect(() => {
    if (raceLoading && currentRoom && myId) {
      const me = currentRoom.players.find((p) => p.id === myId);
      const vehicle = me?.vehicleId ?? raceVehicleId ?? currentRoom.vehicleId ?? "sports";
      const difficulty = lobbyDifficultyToSkill(currentRoom.difficulty);
      router.push(
        `/play/${currentRoom.map}?mode=online&roomId=${currentRoom.id}&vehicle=${vehicle}&ai=${currentRoom.aiCount}&difficulty=${difficulty}`,
      );
    }
  }, [raceLoading, currentRoom, router, raceVehicleId, myId]);

  if (!currentRoom) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink-975 text-mist">
        <p>Connecting to room...</p>
      </div>
    );
  }

  const isHost = currentRoom.players.find((p) => p.id === myId)?.isHost ?? false;
  const me = currentRoom.players.find((p) => p.id === myId);
  const allReady =
    currentRoom.players.every((p) => p.ready) && currentRoom.players.length >= 2;
  const lobbyPaints = me
    ? availablePaints(me.vehicleId as VehicleId, unlocked)
    : [];

  const vehicles = VEHICLE_LIST.map((v) => ({ id: v.id, name: v.name }));
  const maps = ONLINE_MAPS;

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
              {" · "}
              {vehicles.find((v) => v.id === currentRoom.vehicleId)?.name ?? "Sports Car"}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <label className="mb-1 block text-[10px] text-mist">Vehicle</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-2 py-1.5 text-xs text-white"
                  value={currentRoom.vehicleId}
                  onChange={(e) => hostSetVehicle(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-mist">
                  AI fill — host only, same on every client
                </label>
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

        {/* Lobby Chat */}
        <LobbyChat />

        {/* Player list */}
        <div className="rounded-xl border border-white/10 bg-ink-950 p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-mist">
            Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
          </h2>
          <div className="space-y-2">
            {currentRoom.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-ink-975 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: p.paint ?? "#64748b" }}
                    title="Paint"
                  />
                  <span className={`h-2 w-2 rounded-full ${p.ready ? "bg-green-400" : "bg-white/20"}`} />
                  <span className="text-sm">
                    {p.name}
                    {p.isHost && <span className="ml-1.5 text-[10px] text-accent">(Host)</span>}
                    {p.id === myId && <span className="ml-1.5 text-[10px] text-mist">(You)</span>}
                  </span>
                  <span className="text-[10px] text-mist/80">
                    {VEHICLE_LIST.find((v) => v.id === p.vehicleId)?.name ?? p.vehicleId}
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
            <div className="mt-4 flex flex-col items-center gap-3">
              {me && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-mist">Your car</label>
                    <select
                      className="rounded-lg border border-white/10 bg-ink-975 px-2 py-1.5 text-xs text-white"
                      value={me.vehicleId}
                      onChange={(e) => {
                        const nextId = e.target.value as VehicleId;
                        const paints = availablePaints(nextId, unlocked);
                        const keep =
                          me.paint &&
                          paints.some(
                            (p) =>
                              (p.paint ?? "").toLowerCase() ===
                              me.paint!.toLowerCase(),
                          )
                            ? me.paint
                            : paints[0]?.paint;
                        setLoadout(nextId, keep);
                      }}
                    >
                      {VEHICLE_LIST.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full max-w-sm">
                    <p className="mb-1.5 text-center text-[10px] uppercase tracking-widest text-mist">
                      Paint — base + unlocked shop colours
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {lobbyPaints.map((c) => {
                        const hex = c.paint ?? "#888888";
                        const taken = isPaintHexTaken(
                          currentRoom.players,
                          hex,
                          me.id,
                        );
                        const selected =
                          (me.paint ?? "").toLowerCase() === hex.toLowerCase();
                        const isBase =
                          c.rarity === "consumer" || c.rarity === "industrial";
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={taken}
                            title={
                              taken
                                ? `Can't pick — ${c.name} is already taken`
                                : `${c.name}${isBase ? " (base)" : " (unlocked)"}`
                            }
                            onClick={() => {
                              if (taken) return;
                              setLoadout(me.vehicleId, hex);
                            }}
                            className={`relative h-8 w-8 rounded-full border-2 transition ${
                              selected
                                ? "scale-110 border-white"
                                : "border-white/20"
                            } ${taken ? "cursor-not-allowed opacity-35" : "hover:scale-105"}`}
                            style={{ backgroundColor: hex }}
                          >
                            {taken && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-ink-975">
                                ✕
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {error?.toLowerCase().includes("colour") ||
                    error?.toLowerCase().includes("color") ||
                    error?.toLowerCase().includes("can't pick") ||
                    error?.toLowerCase().includes("paint") ? (
                      <p className="mt-2 text-center text-[10px] text-signal">
                        {error}
                      </p>
                    ) : (
                      <p className="mt-2 text-center text-[9px] text-mist/70">
                        Unlock more in Shop/Garage. Taken paints show ✕.
                      </p>
                    )}
                  </div>
                </div>
              )}
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

function LobbyChat() {
  const chatMessages = useMultiplayerStore((s) => s.chatMessages);
  const sendChat = useMultiplayerStore((s) => s.sendChat);
  const myId = useMultiplayerStore((s) => s.myId);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) sendChat(trimmed);
    setText("");
  }

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-ink-950 p-5">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-mist">Chat</h2>
      <div ref={listRef} className="mb-3 h-32 overflow-y-auto space-y-0.5 rounded-lg bg-ink-975 p-2">
        {chatMessages.length === 0 && (
          <p className="text-xs text-white/30">No messages yet...</p>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} className="text-xs">
            <span className={`font-medium ${m.playerId === myId ? "text-accent" : "text-white/70"}`}>
              {m.playerName}:
            </span>{" "}
            <span className="text-white/90">{m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={150}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-white/10 bg-ink-975 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
        />
        <button type="submit" className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/80">
          Send
        </button>
      </form>
    </div>
  );
}
