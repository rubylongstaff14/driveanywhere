/** Shared message protocol for WebSocket multiplayer. */

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  map: string;
  difficulty: "easy" | "medium" | "hard";
  aiCount: number;
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
}

export interface RaceResult {
  playerId: string;
  playerName: string;
  timeMs: number | null;
  position: number;
  finished: boolean;
}

// --- Client -> Server messages ---

export type ClientMessage =
  | { type: "list_rooms" }
  | { type: "create_room"; name: string; map: string; difficulty: "easy" | "medium" | "hard"; aiCount: number; playerName: string; vehicleId: string }
  | { type: "join_room"; roomId: string; playerName: string; vehicleId: string }
  | { type: "leave_room" }
  | { type: "ready" }
  | { type: "unready" }
  | { type: "host_set_map"; map: string }
  | { type: "host_set_difficulty"; difficulty: "easy" | "medium" | "hard" }
  | { type: "host_set_ai"; aiCount: number }
  | { type: "host_kick"; playerId: string }
  | { type: "host_start" }
  | { type: "car_state"; state: CarState }
  | { type: "race_finish"; timeMs: number };

// --- Server -> Client messages ---

export type ServerMessage =
  | { type: "rooms_list"; rooms: RoomInfo[] }
  | { type: "room_joined"; room: RoomInfo; yourId: string }
  | { type: "room_updated"; room: RoomInfo }
  | { type: "room_error"; message: string }
  | { type: "countdown"; value: number }
  | { type: "race_go"; startTimestamp: number }
  | { type: "car_update"; playerId: string; state: CarState }
  | { type: "race_results"; results: RaceResult[] }
  | { type: "kicked" }
  | { type: "room_closed" };
