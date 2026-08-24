/** Shared message protocol for WebSocket multiplayer. */

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
}

export interface RacePosition {
  playerId: string;
  playerName: string;
  position: number;
  checkpointIndex: number;
  raceTimeMs: number;
  delta: number | null;
}

export interface RaceResult {
  playerId: string;
  playerName: string;
  timeMs: number | null;
  position: number;
  finished: boolean;
  splits?: number[];
}

// --- Client -> Server messages ---

export type ClientMessage =
  | { type: "list_rooms" }
  | { type: "create_room"; name: string; map: string; difficulty: "easy" | "medium" | "hard"; aiCount: number; playerName: string; vehicleId: string; paint?: string }
  | { type: "join_room"; roomId: string; playerName: string; vehicleId: string; paint?: string }
  | { type: "leave_room" }
  | { type: "ready" }
  | { type: "unready" }
  | { type: "host_set_map"; map: string }
  | { type: "host_set_difficulty"; difficulty: "easy" | "medium" | "hard" }
  | { type: "host_set_ai"; aiCount: number }
  | { type: "host_set_vehicle"; vehicleId: string }
  | { type: "set_loadout"; vehicleId: string; paint?: string }
  | { type: "host_kick"; playerId: string }
  | { type: "host_start" }
  | { type: "loaded" }
  | { type: "chat"; text: string }
  | { type: "car_state"; state: CarState }
  | { type: "race_finish"; timeMs: number; splits: number[] };

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
  | { type: "race_results"; results: RaceResult[] }
  | { type: "chat"; playerId: string; playerName: string; text: string }
  | { type: "race_positions"; positions: RacePosition[] }
  | { type: "kicked" }
  | { type: "room_closed" };
