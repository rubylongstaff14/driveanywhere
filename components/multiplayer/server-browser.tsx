"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useAuthStore } from "@/stores/auth-store";

export function ServerBrowser() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    connected,
    connect,
    rooms,
    listRooms,
    createRoom,
    currentRoom,
    error,
    clearError,
  } = useMultiplayerStore();

  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [map, setMap] = useState("westminster-sprint");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiCount, setAiCount] = useState(2);

  const playerName = user?.username ?? `Player${Math.floor(Math.random() * 999)}`;

  useEffect(() => {
    if (!connected) connect();
  }, [connect, connected]);

  useEffect(() => {
    if (connected) listRooms();
    const interval = setInterval(() => {
      if (connected) listRooms();
    }, 3000);
    return () => clearInterval(interval);
  }, [connected, listRooms]);

  useEffect(() => {
    if (currentRoom) {
      router.push(`/play/online/${currentRoom.id}`);
    }
  }, [currentRoom, router]);

  const maps = [
    { slug: "westminster-sprint", name: "Westminster Sprint" },
    { slug: "embankment-run", name: "Embankment Run" },
    { slug: "canary-wharf-loop", name: "Canary Wharf Loop" },
    { slug: "dubai-marina-circuit", name: "Dubai Marina Circuit" },
    { slug: "egypt-pyramids", name: "Egypt Pyramids" },
    { slug: "new-york-harbor-circuit", name: "New York Harbor Circuit" },
  ];

  function handleCreate() {
    if (!roomName.trim()) return;
    createRoom(roomName.trim(), map, difficulty, aiCount, playerName, "sports");
  }

  function handleJoin(roomId: string) {
    useMultiplayerStore.getState().joinRoom(roomId, playerName, "sports");
  }

  return (
    <div className="min-h-[100dvh] bg-ink-975 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/routes" className="text-xs text-mist hover:text-white">
              &larr; Back to routes
            </Link>
            <h1 className="mt-2 font-display text-3xl">Online Racing</h1>
            <p className="mt-1 text-sm text-mist">
              {connected ? "Connected" : "Connecting..."}
              {" · "}
              {rooms.length} server{rooms.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80"
          >
            {showCreate ? "Cancel" : "Create Server"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-signal/30 bg-signal/10 px-4 py-2 text-sm text-signal">
            {error}
            <button onClick={clearError} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {showCreate && (
          <div className="mb-8 rounded-xl border border-white/10 bg-ink-950 p-6">
            <h2 className="mb-4 font-display text-xl">Create Server</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-mist">Server Name</label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-3 py-2 text-sm text-white outline-none focus:border-accent"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="My Race Server"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-mist">Map</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-3 py-2 text-sm text-white outline-none focus:border-accent"
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                >
                  {maps.map((m) => (
                    <option key={m.slug} value={m.slug}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-mist">Difficulty</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-ink-975 px-3 py-2 text-sm text-white outline-none focus:border-accent"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-mist">AI Fill ({aiCount})</label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!roomName.trim()}
              className="mt-4 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-40"
            >
              Create & Join
            </button>
          </div>
        )}

        <div className="space-y-3">
          {rooms.length === 0 && (
            <p className="py-12 text-center text-sm text-mist">
              No servers available. Create one to get started.
            </p>
          )}
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-950 px-5 py-4"
            >
              <div>
                <p className="font-medium">{room.name}</p>
                <p className="mt-0.5 text-xs text-mist">
                  {maps.find((m) => m.slug === room.map)?.name ?? room.map}
                  {" · "}
                  {room.difficulty}
                  {" · "}
                  {room.players.length}/{room.maxPlayers} players
                  {room.aiCount > 0 && ` + ${room.aiCount} AI`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  room.status === "waiting" ? "bg-green-500/20 text-green-400" :
                  room.status === "racing" ? "bg-signal/20 text-signal" :
                  "bg-white/10 text-mist"
                }`}>
                  {room.status}
                </span>
                {room.status === "waiting" && (
                  <button
                    onClick={() => handleJoin(room.id)}
                    className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium hover:bg-white/20"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
