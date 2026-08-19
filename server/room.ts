import type { WebSocket } from "ws";
import type {
  CarState,
  PlayerSlot,
  RaceResult,
  RoomInfo,
  ServerMessage,
} from "../lib/multiplayer/protocol";

let nextRoomId = 1;

export interface ConnectedPlayer {
  ws: WebSocket;
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
  vehicleId: string;
  carState: CarState | null;
  finishTimeMs: number | null;
  splits: number[];
  loaded: boolean;
}

export class Room {
  id: string;
  name: string;
  map: string;
  difficulty: "easy" | "medium" | "hard";
  aiCount: number;
  vehicleId = "sports";
  maxPlayers = 6;
  persistent = false;
  players: ConnectedPlayer[] = [];
  status: "waiting" | "countdown" | "racing" | "results" = "waiting";
  raceStartTimestamp: number | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private broadcastTimer: ReturnType<typeof setInterval> | null = null;

  constructor(name: string, map: string, difficulty: "easy" | "medium" | "hard", aiCount: number) {
    this.id = `room_${nextRoomId++}`;
    this.name = name;
    this.map = map;
    this.difficulty = difficulty;
    this.aiCount = Math.min(4, Math.max(0, aiCount));
  }

  get host(): ConnectedPlayer | undefined {
    return this.players.find((p) => p.isHost);
  }

  get humanCount(): number {
    return this.players.length;
  }

  toInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      hostName: this.host?.name ?? "???",
      map: this.map,
      difficulty: this.difficulty,
      aiCount: this.aiCount,
      vehicleId: this.vehicleId,
      maxPlayers: this.maxPlayers,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        isHost: p.isHost,
        vehicleId: p.vehicleId,
      })),
      status: this.status,
    };
  }

  addPlayer(ws: WebSocket, id: string, name: string, vehicleId: string, isHost: boolean): ConnectedPlayer {
    const player: ConnectedPlayer = {
      ws,
      id,
      name,
      ready: isHost,
      isHost,
      vehicleId,
      carState: null,
      finishTimeMs: null,
      splits: [],
      loaded: false,
    };
    this.players.push(player);
    return player;
  }

  removePlayer(id: string): boolean {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.players.splice(idx, 1);
    if (this.players.length > 0 && !this.players.some((p) => p.isHost)) {
      this.players[0].isHost = true;
      this.players[0].ready = true;
    }
    return true;
  }

  broadcast(msg: ServerMessage, exclude?: string): void {
    const data = JSON.stringify(msg);
    for (const p of this.players) {
      if (p.id === exclude) continue;
      try { p.ws.send(data); } catch { /* disconnected */ }
    }
  }

  send(playerId: string, msg: ServerMessage): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (p) try { p.ws.send(JSON.stringify(msg)); } catch { /* */ }
  }

  allReady(): boolean {
    if (this.players.length === 0) return false;
    if (this.players.length === 1 && this.aiCount === 0) return false;
    return this.players.every((p) => p.ready);
  }

  startCountdown(): void {
    this.status = "countdown";
    for (const p of this.players) p.loaded = false;
    this.broadcast({ type: "waiting_for_players", loaded: 0, total: this.players.length });
  }

  playerLoaded(playerId: string): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.loaded = true;
    const loadedCount = this.players.filter((pl) => pl.loaded).length;
    this.broadcast({ type: "waiting_for_players", loaded: loadedCount, total: this.players.length });
    if (loadedCount === this.players.length) {
      this.beginCountdown();
    }
  }

  private beginCountdown(): void {
    let count = 3;
    this.broadcast({ type: "countdown", value: count });
    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.broadcast({ type: "countdown", value: count });
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.startRace();
      }
    }, 1000);
  }

  private startRace(): void {
    this.status = "racing";
    this.raceStartTimestamp = Date.now();
    for (const p of this.players) {
      p.carState = null;
      p.finishTimeMs = null;
    }
    this.broadcast({ type: "race_go", startTimestamp: this.raceStartTimestamp, vehicleId: this.vehicleId });
    this.startBroadcastLoop();
  }

  private startBroadcastLoop(): void {
    this.broadcastTimer = setInterval(() => {
      for (const p of this.players) {
        if (!p.carState) continue;
        this.broadcast({ type: "car_update", playerId: p.id, state: p.carState }, p.id);
      }
    }, 33); // 30Hz
  }

  playerFinished(playerId: string, timeMs: number, splits: number[]): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.finishTimeMs = timeMs;
    p.splits = splits;
    if (this.players.every((pl) => pl.finishTimeMs !== null)) {
      this.endRace();
    }
  }

  endRace(): void {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    this.broadcastTimer = null;
    this.status = "results";

    const results: RaceResult[] = this.players
      .map((p, i) => ({
        playerId: p.id,
        playerName: p.name,
        timeMs: p.finishTimeMs,
        position: i + 1,
        finished: p.finishTimeMs !== null,
        splits: p.splits,
      }))
      .sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        return (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity);
      })
      .map((r, i) => ({ ...r, position: i + 1 }));

    this.broadcast({ type: "race_results", results });

    setTimeout(() => {
      this.status = "waiting";
      for (const p of this.players) {
        p.ready = p.isHost;
        p.carState = null;
        p.finishTimeMs = null;
        p.splits = [];
      }
      this.broadcast({ type: "room_updated", room: this.toInfo() });
    }, 8000);
  }

  destroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    this.broadcast({ type: "room_closed" });
  }
}
