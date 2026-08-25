/** Shared message protocol for WebSocket multiplayer. */

import type { TauntId } from "./taunts";

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  map: string;
  difficulty: "easy" | "medium" | "hard";
  aiCount: number;
  vehicleId: string;
  maxPlayers: number;
  players: PlayerSlot[];
  status: "waiting" | "countdown" | "racing" | "results";
}

export interface PlayerSlot {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
  vehicleId: string;
  /** Visual-only paint hex — never affects pace */
  paint?: string;
  bumper?: string;
  wing?: string;
  kit?: string;
  /** Late joiners watch as ghost until next race */
  role?: "racer" | "spectator";
}

export interface CarState {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  speed: number;
  gear: number;
  steer: number;
  checkpointIndex: number;
  raceTimeMs: number;
  /** 0–1 along circuit centreline — used for accurate gaps / turbo */
  trackProgress?: number;
  /** World-space velocity for remote extrapolation */
  vx?: number;
  vz?: number;
  /** Authoritative paint hex mirrored onto car packets so remotes never lose colour */
  paint?: string;
  /** Server receive time (ms) for interpolation */
  t?: number;
}

export interface RacePosition {
  playerId: string;
  playerName: string;
  position: number;
  checkpointIndex: number;
  raceTimeMs: number;
  /** ms behind leader at the same track progress (null = leader) */
  delta: number | null;
  trackProgress?: number;
}

/** Compact progress sample for post-race track delta heatmap. */
export interface RacePathSample {
  /** 0–1 along circuit centreline */
  p: number;
  /** Race elapsed ms at that progress */
  t: number;
}

export interface RaceResult {
  playerId: string;
  playerName: string;
  timeMs: number | null;
  position: number;
  finished: boolean;
  splits?: number[];
  /** Universal race colour hex — same on every client */
  paint?: string;
  /** Spatial timing for track overview heatmap */
  path?: RacePathSample[];
}

// --- Client -> Server messages ---

export type ClientMessage =
  | { type: "list_rooms" }
  | { type: "create_room"; name: string; map: string; difficulty: "easy" | "medium" | "hard"; aiCount: number; playerName: string; vehicleId: string; paint?: string; bumper?: string; wing?: string; kit?: string }
  | { type: "join_room"; roomId: string; playerName: string; vehicleId: string; paint?: string; asSpectator?: boolean; bumper?: string; wing?: string; kit?: string }
  | { type: "leave_room" }
  | { type: "ready" }
  | { type: "unready" }
  | { type: "host_set_map"; map: string }
  | { type: "host_set_difficulty"; difficulty: "easy" | "medium" | "hard" }
  | { type: "host_set_ai"; aiCount: number }
  | { type: "host_set_vehicle"; vehicleId: string }
  | { type: "set_loadout"; vehicleId: string; paint?: string; bumper?: string; wing?: string; kit?: string }
  | { type: "host_kick"; playerId: string }
  | { type: "host_start" }
  | { type: "loaded" }
  | { type: "chat"; text: string }
  | { type: "car_state"; state: CarState }
  | { type: "taunt"; tauntId: TauntId }
  | { type: "join_next_race" }
  | {
      type: "race_finish";
      timeMs: number;
      splits: number[];
      paint?: string;
      path?: RacePathSample[];
    };

// --- Server -> Client messages ---

export type ServerMessage =
  | { type: "rooms_list"; rooms: RoomInfo[] }
  | { type: "room_joined"; room: RoomInfo; yourId: string }
  | { type: "room_updated"; room: RoomInfo }
  | { type: "room_error"; message: string }
  | { type: "race_loading"; map: string; vehicleId: string }
  | { type: "waiting_for_players"; loaded: number; total: number }
  | { type: "countdown"; value: number }
  | { type: "race_go"; startTimestamp: number; vehicleId: string }
  | { type: "car_update"; playerId: string; state: CarState }
  | { type: "cars_batch"; serverTime?: number; updates: Array<{ playerId: string; state: CarState }> }
  | { type: "race_results"; results: RaceResult[]; provisional?: boolean }
  | { type: "chat"; playerId: string; playerName: string; text: string }
  | { type: "taunt"; playerId: string; playerName: string; tauntId: TauntId }
  | { type: "race_positions"; positions: RacePosition[] }
  | { type: "kicked" }
  | { type: "room_closed" };
