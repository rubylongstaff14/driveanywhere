"use client";

import { create } from "zustand";
import type {
  CarState,
  RacePosition,
  RaceResult,
  RoomInfo,
  ServerMessage,
} from "@/lib/multiplayer/protocol";
import type { TauntId } from "@/lib/multiplayer/taunts";
import {
  clearRemoteCarBuffer,
  ingestCarBatch,
  remoteCarBuffer,
} from "@/lib/multiplayer/remote-car-buffer";
import {
  connectWs,
  disconnectWs,
  sendMsg,
  setConnectionCallbacks,
} from "@/lib/multiplayer/ws-client";

export interface TauntEvent {
  id: number;
  playerId: string;
  playerName: string;
  tauntId: TauntId;
  at: number;
}

interface MultiplayerState {
  connected: boolean;
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  myId: string | null;
  error: string | null;
  countdownValue: number | null;
  racing: boolean;
  spectating: boolean;
  raceStartTimestamp: number | null;
  results: RaceResult[] | null;
  resultsProvisional: boolean;
  /** @deprecated prefer remoteCarBuffer — kept for id membership only */
  remoteCarStates: Record<string, CarState>;
  remoteCarStateHistory: Record<string, { state: CarState; timestamp: number }[]>;
  remotePlayerIdKey: string;
  raceVehicleId: string | null;
  raceLoading: boolean;
  loadingProgress: {
    loaded: number;
    total: number;
    waitingFor: string[];
  } | null;
  chatMessages: { playerId: string; playerName: string; text: string; timestamp: number }[];
  racePositions: RacePosition[];
  tauntFeed: TauntEvent[];

  connect: () => void;
  disconnect: () => void;
  listRooms: () => void;
  createRoom: (
    name: string,
    map: string,
    difficulty: "easy" | "medium" | "hard",
    aiCount: number,
    playerName: string,
    vehicleId: string,
    paint?: string,
    aero?: { bumper?: string; wing?: string; kit?: string },
  ) => void;
  joinRoom: (
    roomId: string,
    playerName: string,
    vehicleId: string,
    paint?: string,
    asSpectator?: boolean,
    aero?: { bumper?: string; wing?: string; kit?: string },
  ) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  hostSetMap: (map: string) => void;
  hostSetDifficulty: (d: "easy" | "medium" | "hard") => void;
  hostSetAi: (count: number) => void;
  hostSetLaps: (count: 1 | 2) => void;
  hostSetVehicle: (vehicleId: string) => void;
  setLoadout: (
    vehicleId: string,
    paint?: string,
    aero?: { bumper?: string; wing?: string; kit?: string },
  ) => void;
  hostKick: (playerId: string) => void;
  hostStart: () => void;
  reportFinish: (
    timeMs: number,
    splits?: number[],
    path?: Array<{ p: number; t: number }>,
    paint?: string,
  ) => void;
  sendChat: (text: string) => void;
  sendTaunt: (tauntId: TauntId) => void;
  joinNextRace: () => void;
  clearError: () => void;
}

let tauntSeq = 0;

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  function handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "rooms_list":
        set({ rooms: msg.rooms });
        break;
      case "room_joined": {
        const me = msg.room.players.find((p) => p.id === msg.yourId);
        const spectating = me?.role === "spectator";
        clearRemoteCarBuffer();
        set({
          currentRoom: msg.room,
          myId: msg.yourId,
          error: null,
          results: null,
          racing: false,
          spectating,
          countdownValue: null,
          remoteCarStates: {},
          remoteCarStateHistory: {},
          remotePlayerIdKey: "",
          tauntFeed: [],
        });
        break;
      }
      case "room_updated": {
        const prev = get().currentRoom;
        const players = msg.room.players.map((p) => {
          if (p.paint) return p;
          const old = prev?.players.find((o) => o.id === p.id);
          return old?.paint ? { ...p, paint: old.paint } : p;
        });
        const me = players.find((p) => p.id === get().myId);
        set({
          currentRoom: { ...msg.room, players },
          spectating: me?.role === "spectator",
        });
        break;
      }
      case "room_error":
        set({ error: msg.message });
        break;
      case "race_loading":
        set({ raceLoading: true, raceVehicleId: msg.vehicleId });
        break;
      case "waiting_for_players":
        set({
          loadingProgress: {
            loaded: msg.loaded,
            total: msg.total,
            waitingFor: msg.waitingFor ?? [],
          },
        });
        break;
      case "countdown":
        set({ countdownValue: msg.value, loadingProgress: null });
        break;
      case "race_go":
        clearRemoteCarBuffer();
        set({
          racing: true,
          raceLoading: false,
          countdownValue: null,
          raceStartTimestamp: msg.startTimestamp,
          raceVehicleId: msg.vehicleId,
          remoteCarStates: {},
          remoteCarStateHistory: {},
          remotePlayerIdKey: "",
        });
        break;
      case "car_update":
      case "cars_batch": {
        const myId = get().myId;
        const room = get().currentRoom;
        const now = Date.now();
        const serverTime =
          msg.type === "cars_batch" ? (msg.serverTime ?? now) : now;
        const updates =
          msg.type === "cars_batch"
            ? msg.updates
            : [{ playerId: msg.playerId, state: msg.state }];
        const { idsChanged } = ingestCarBatch(
          updates,
          myId,
          serverTime,
          (pid) => room?.players.find((p) => p.id === pid)?.paint,
        );
        if (idsChanged) {
          set({
            remotePlayerIdKey: remoteCarBuffer.playerIds.join(","),
            remoteCarStates: { ...remoteCarBuffer.states },
          });
        }
        break;
      }
      case "chat":
        set((s) => ({
          chatMessages: [
            ...s.chatMessages.slice(-49),
            {
              playerId: msg.playerId,
              playerName: msg.playerName,
              text: msg.text,
              timestamp: Date.now(),
            },
          ],
        }));
        break;
      case "taunt":
        set((s) => ({
          tauntFeed: [
            ...s.tauntFeed.slice(-11),
            {
              id: ++tauntSeq,
              playerId: msg.playerId,
              playerName: msg.playerName,
              tauntId: msg.tauntId,
              at: Date.now(),
            },
          ],
        }));
        break;
      case "race_positions":
        set({ racePositions: msg.positions });
        break;
      case "race_results":
        if (!msg.provisional) clearRemoteCarBuffer();
        set({
          // Keep racing true while waiting for late finishers so remotes still update
          racing: Boolean(msg.provisional),
          results: msg.results,
          resultsProvisional: Boolean(msg.provisional),
          racePositions: msg.provisional ? get().racePositions : [],
          remoteCarStates: msg.provisional
            ? get().remoteCarStates
            : {},
          remoteCarStateHistory: msg.provisional
            ? get().remoteCarStateHistory
            : {},
          remotePlayerIdKey: msg.provisional ? get().remotePlayerIdKey : "",
        });
        break;
      case "kicked":
        clearRemoteCarBuffer();
        set({
          currentRoom: null,
          myId: null,
          error: "You were kicked from the room",
          spectating: false,
        });
        break;
      case "room_closed":
        clearRemoteCarBuffer();
        set({
          currentRoom: null,
          myId: null,
          error: "Room was closed",
          spectating: false,
        });
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
    spectating: false,
    raceStartTimestamp: null,
    results: null,
    resultsProvisional: false,
    remoteCarStates: {},
    remoteCarStateHistory: {},
    remotePlayerIdKey: "",
    raceVehicleId: null,
    raceLoading: false,
    loadingProgress: null,
    chatMessages: [],
    racePositions: [],
    tauntFeed: [],

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
      clearRemoteCarBuffer();
      set({
        connected: false,
        currentRoom: null,
        myId: null,
        rooms: [],
        racing: false,
        spectating: false,
        remoteCarStates: {},
        remoteCarStateHistory: {},
        remotePlayerIdKey: "",
        results: null,
        error: null,
      });
    },
    listRooms: () => sendMsg({ type: "list_rooms" }),
    createRoom: (name, map, difficulty, aiCount, playerName, vehicleId, paint, aero) =>
      sendMsg({
        type: "create_room",
        name,
        map,
        difficulty,
        aiCount,
        playerName,
        vehicleId,
        paint,
        bumper: aero?.bumper,
        wing: aero?.wing,
        kit: aero?.kit,
      }),
    joinRoom: (roomId, playerName, vehicleId, paint, asSpectator, aero) =>
      sendMsg({
        type: "join_room",
        roomId,
        playerName,
        vehicleId,
        paint,
        asSpectator,
        bumper: aero?.bumper,
        wing: aero?.wing,
        kit: aero?.kit,
      }),
    setLoadout: (vehicleId, paint, aero) => {
      const { currentRoom, myId, connected } = get();
      if (!connected) {
        set({ error: "Not connected to multiplayer server — can't change paint" });
        return;
      }
      if (currentRoom && myId) {
        const players = currentRoom.players.map((p) =>
          p.id === myId
            ? {
                ...p,
                vehicleId,
                paint: paint ?? p.paint,
                bumper: aero?.bumper ?? p.bumper,
                wing: aero?.wing ?? p.wing,
                kit: aero?.kit ?? p.kit,
              }
            : p,
        );
        set({
          currentRoom: { ...currentRoom, players },
          error: null,
        });
      }
      sendMsg({
        type: "set_loadout",
        vehicleId,
        paint,
        bumper: aero?.bumper,
        wing: aero?.wing,
        kit: aero?.kit,
      });
    },
    leaveRoom: () => {
      sendMsg({ type: "leave_room" });
      clearRemoteCarBuffer();
      set({
        currentRoom: null,
        myId: null,
        results: null,
        racing: false,
        spectating: false,
        remoteCarStates: {},
        remoteCarStateHistory: {},
        remotePlayerIdKey: "",
      });
    },
    setReady: (ready) => {
      const { currentRoom, myId } = get();
      const me = currentRoom?.players.find((p) => p.id === myId);
      if (me) {
        sendMsg({
          type: "set_loadout",
          vehicleId: me.vehicleId,
          paint: me.paint,
          bumper: me.bumper,
          wing: me.wing,
          kit: me.kit,
        });
      }
      if (currentRoom && myId) {
        set({
          currentRoom: {
            ...currentRoom,
            players: currentRoom.players.map((p) =>
              p.id === myId ? { ...p, ready } : p,
            ),
          },
        });
      }
      sendMsg({ type: ready ? "ready" : "unready" });
    },
    hostSetMap: (map) => sendMsg({ type: "host_set_map", map }),
    hostSetDifficulty: (d) =>
      sendMsg({ type: "host_set_difficulty", difficulty: d }),
    hostSetAi: (count) => sendMsg({ type: "host_set_ai", aiCount: count }),
    hostSetLaps: (count) => sendMsg({ type: "host_set_laps", lapCount: count }),
    hostSetVehicle: (vehicleId) =>
      sendMsg({ type: "host_set_vehicle", vehicleId }),
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
    sendTaunt: (tauntId) => sendMsg({ type: "taunt", tauntId }),
    joinNextRace: () => sendMsg({ type: "join_next_race" }),
    clearError: () => set({ error: null }),
  };
});
