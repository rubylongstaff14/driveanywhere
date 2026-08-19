"use client";

import { create } from "zustand";
import type {
  CarState,
  PlayerSlot,
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
  raceVehicleId: string | null;
  loadingProgress: { loaded: number; total: number } | null;

  connect: () => void;
  disconnect: () => void;
  listRooms: () => void;
  createRoom: (name: string, map: string, difficulty: "easy" | "medium" | "hard", aiCount: number, playerName: string, vehicleId: string) => void;
  joinRoom: (roomId: string, playerName: string, vehicleId: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  hostSetMap: (map: string) => void;
  hostSetDifficulty: (d: "easy" | "medium" | "hard") => void;
  hostSetAi: (count: number) => void;
  hostSetVehicle: (vehicleId: string) => void;
  hostKick: (playerId: string) => void;
  hostStart: () => void;
  reportFinish: (timeMs: number, splits?: number[]) => void;
  clearError: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  function handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "rooms_list":
        set({ rooms: msg.rooms });
        break;
      case "room_joined":
        set({ currentRoom: msg.room, myId: msg.yourId, error: null, results: null, racing: false, countdownValue: null });
        break;
      case "room_updated":
        set({ currentRoom: msg.room });
        break;
      case "room_error":
        set({ error: msg.message });
        break;
      case "waiting_for_players":
        set({ loadingProgress: { loaded: msg.loaded, total: msg.total } });
        break;
      case "countdown":
        set({ countdownValue: msg.value, loadingProgress: null });
        break;
      case "race_go":
        set({ racing: true, countdownValue: null, raceStartTimestamp: msg.startTimestamp, raceVehicleId: msg.vehicleId, remoteCarStates: {} });
        break;
      case "car_update":
        set((s) => ({
          remoteCarStates: { ...s.remoteCarStates, [msg.playerId]: msg.state },
        }));
        break;
      case "race_results":
        set({ racing: false, results: msg.results });
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
    raceVehicleId: null,
    loadingProgress: null,

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
      set({ connected: false, currentRoom: null, myId: null, rooms: [] });
    },
    listRooms: () => sendMsg({ type: "list_rooms" }),
    createRoom: (name, map, difficulty, aiCount, playerName, vehicleId) =>
      sendMsg({ type: "create_room", name, map, difficulty, aiCount, playerName, vehicleId }),
    joinRoom: (roomId, playerName, vehicleId) =>
      sendMsg({ type: "join_room", roomId, playerName, vehicleId }),
    leaveRoom: () => {
      sendMsg({ type: "leave_room" });
      set({ currentRoom: null, myId: null, results: null, racing: false });
    },
    setReady: (ready) => sendMsg({ type: ready ? "ready" : "unready" }),
    hostSetMap: (map) => sendMsg({ type: "host_set_map", map }),
    hostSetDifficulty: (d) => sendMsg({ type: "host_set_difficulty", difficulty: d }),
    hostSetAi: (count) => sendMsg({ type: "host_set_ai", aiCount: count }),
    hostSetVehicle: (vehicleId) => sendMsg({ type: "host_set_vehicle", vehicleId }),
    hostKick: (playerId) => sendMsg({ type: "host_kick", playerId }),
    hostStart: () => sendMsg({ type: "host_start" }),
    reportFinish: (timeMs, splits?: number[]) => sendMsg({ type: "race_finish", timeMs, splits: splits ?? [] }),
    clearError: () => set({ error: null }),
  };
});
