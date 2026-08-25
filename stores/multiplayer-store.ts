"use client";

import { create } from "zustand";
import type {
  CarState,
  PlayerSlot,
  RacePosition,
  RaceResult,
  RoomInfo,
  ServerMessage,
} from "@/lib/multiplayer/protocol";
import {
  connectWs,
  disconnectWs,
  sendMsg,
  setConnectionCallbacks,
} from "@/lib/multiplayer/ws-client";

interface MultiplayerState {
  connected: boolean;
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  myId: string | null;
  error: string | null;
  countdownValue: number | null;
  racing: boolean;
  raceStartTimestamp: number | null;
  results: RaceResult[] | null;
  remoteCarStates: Record<string, CarState>;
  /**
   * Timestamped car-state history used for client-side interpolation to hide
   * network jitter/latency.
   */
  remoteCarStateHistory: Record<string, { state: CarState; timestamp: number }[]>;
  raceVehicleId: string | null;
  raceLoading: boolean;
  loadingProgress: { loaded: number; total: number } | null;
  chatMessages: { playerId: string; playerName: string; text: string; timestamp: number }[];
  racePositions: RacePosition[];

  connect: () => void;
  disconnect: () => void;
  listRooms: () => void;
  createRoom: (name: string, map: string, difficulty: "easy" | "medium" | "hard", aiCount: number, playerName: string, vehicleId: string, paint?: string) => void;
  joinRoom: (roomId: string, playerName: string, vehicleId: string, paint?: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  hostSetMap: (map: string) => void;
  hostSetDifficulty: (d: "easy" | "medium" | "hard") => void;
  hostSetAi: (count: number) => void;
  hostSetVehicle: (vehicleId: string) => void;
  setLoadout: (vehicleId: string, paint?: string) => void;
  hostKick: (playerId: string) => void;
  hostStart: () => void;
  reportFinish: (
    timeMs: number,
    splits?: number[],
    path?: Array<{ p: number; t: number }>,
    paint?: string,
  ) => void;
  sendChat: (text: string) => void;
  clearError: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  function handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "rooms_list":
        set({ rooms: msg.rooms });
        break;
      case "room_joined":
        set({
          currentRoom: msg.room,
          myId: msg.yourId,
          error: null,
          results: null,
          racing: false,
          countdownValue: null,
          remoteCarStates: {},
          remoteCarStateHistory: {},
        });
        break;
      case "room_updated":
        set({ currentRoom: msg.room });
        break;
      case "room_error":
        set({ error: msg.message });
        break;
      case "race_loading":
        set({ raceLoading: true, raceVehicleId: msg.vehicleId });
        break;
      case "waiting_for_players":
        set({ loadingProgress: { loaded: msg.loaded, total: msg.total } });
        break;
      case "countdown":
        set({ countdownValue: msg.value, loadingProgress: null });
        break;
      case "race_go":
        set({
          racing: true,
          raceLoading: false,
          countdownValue: null,
          raceStartTimestamp: msg.startTimestamp,
          raceVehicleId: msg.vehicleId,
          remoteCarStates: {},
          remoteCarStateHistory: {},
        });
        break;
      case "car_update":
      case "cars_batch": {
        const myId = get().myId;
        const states = { ...get().remoteCarStates };
        const history = { ...get().remoteCarStateHistory };
        const now = Date.now();
        const updates =
          msg.type === "cars_batch"
            ? msg.updates
            : [{ playerId: msg.playerId, state: msg.state }];
        for (const u of updates) {
          if (u.playerId === myId) continue;
          states[u.playerId] = u.state;
          const prev = history[u.playerId] ?? [];
          const next = [...prev, { state: u.state, timestamp: now }];
          while (next.length > 6) next.shift();
          history[u.playerId] = next;
        }
        set({ remoteCarStates: states, remoteCarStateHistory: history });
        break;
      }
      case "chat":
        set((s) => ({
          chatMessages: [...s.chatMessages.slice(-49), { playerId: msg.playerId, playerName: msg.playerName, text: msg.text, timestamp: Date.now() }],
        }));
        break;
      case "race_positions":
        set({ racePositions: msg.positions });
        break;
      case "race_results":
        set({
          racing: false,
          results: msg.results,
          racePositions: [],
          remoteCarStates: {},
          remoteCarStateHistory: {},
        });
        break;
      case "kicked":
        set({ currentRoom: null, myId: null, error: "You were kicked from the room" });
        break;
      case "room_closed":
        set({ currentRoom: null, myId: null, error: "Room was closed" });
        break;
    }
  }

  return {
    connected: false,
    rooms: [],
    currentRoom: null,
    myId: null,
    error: null,
    countdownValue: null,
    racing: false,
    raceStartTimestamp: null,
    results: null,
    remoteCarStates: {},
    remoteCarStateHistory: {},
    raceVehicleId: null,
    raceLoading: false,
    loadingProgress: null,
    chatMessages: [],
    racePositions: [],

    connect: () => {
      setConnectionCallbacks(
        () => {
          set({ connected: true });
          sendMsg({ type: "list_rooms" });
        },
        () => set({ connected: false }),
      );
      connectWs(handleMessage);
    },
    disconnect: () => {
      disconnectWs();
      set({
        connected: false,
        currentRoom: null,
        myId: null,
        rooms: [],
        racing: false,
        remoteCarStates: {},
        remoteCarStateHistory: {},
        results: null,
        error: null,
      });
    },
    listRooms: () => sendMsg({ type: "list_rooms" }),
    createRoom: (name, map, difficulty, aiCount, playerName, vehicleId, paint) =>
      sendMsg({ type: "create_room", name, map, difficulty, aiCount, playerName, vehicleId, paint }),
    joinRoom: (roomId, playerName, vehicleId, paint) =>
      sendMsg({ type: "join_room", roomId, playerName, vehicleId, paint }),
    setLoadout: (vehicleId, paint) => {
      const { currentRoom, myId, connected } = get();
      if (!connected) {
        set({ error: "Not connected to multiplayer server — can't change paint" });
        return;
      }
      // Optimistic UI so swatches respond even if the room broadcast is slow.
      if (currentRoom && myId) {
        const players = currentRoom.players.map((p) =>
          p.id === myId
            ? {
                ...p,
                vehicleId,
                paint: paint ?? p.paint,
              }
            : p,
        );
        set({
          currentRoom: { ...currentRoom, players },
          error: null,
        });
      }
      sendMsg({ type: "set_loadout", vehicleId, paint });
    },
    leaveRoom: () => {
      sendMsg({ type: "leave_room" });
      set({
        currentRoom: null,
        myId: null,
        results: null,
        racing: false,
        remoteCarStates: {},
        remoteCarStateHistory: {},
      });
    },
    setReady: (ready) => sendMsg({ type: ready ? "ready" : "unready" }),
    hostSetMap: (map) => sendMsg({ type: "host_set_map", map }),
    hostSetDifficulty: (d) => sendMsg({ type: "host_set_difficulty", difficulty: d }),
    hostSetAi: (count) => sendMsg({ type: "host_set_ai", aiCount: count }),
    hostSetVehicle: (vehicleId) => sendMsg({ type: "host_set_vehicle", vehicleId }),
    hostKick: (playerId) => sendMsg({ type: "host_kick", playerId }),
    hostStart: () => sendMsg({ type: "host_start" }),
    reportFinish: (timeMs, splits, path, paint) =>
      sendMsg({
        type: "race_finish",
        timeMs,
        splits: splits ?? [],
        path,
        paint,
      }),
    sendChat: (text) => sendMsg({ type: "chat", text }),
    clearError: () => set({ error: null }),
  };
});
