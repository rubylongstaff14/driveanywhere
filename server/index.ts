import { WebSocketServer, WebSocket } from "ws";
import { Room } from "./room";
import type { ClientMessage, ServerMessage } from "../lib/multiplayer/protocol";
import { parseVehicleId } from "../lib/game/vehicles";
import {
  paintHexesForVehicle,
  stockIdsFor,
} from "../lib/game/cosmetics";
import {
  claimPaintHex,
  isPaintHexTaken,
  normalizePaintHex,
} from "../lib/multiplayer/race-colors";
import { isTauntId } from "../lib/multiplayer/taunts";

const PORT = Number(process.env.WS_PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map<string, Room>();
const playerRooms = new Map<WebSocket, { roomId: string; playerId: string }>();

let nextPlayerId = 1;
function genPlayerId(): string {
  return `player_${nextPlayerId++}`;
}

function sendTo(ws: WebSocket, msg: ServerMessage): void {
  try { ws.send(JSON.stringify(msg)); } catch { /* disconnected */ }
}

function parseAero(msg: {
  bumper?: string;
  wing?: string;
  kit?: string;
}): { bumper: string; wing: string; kit: string } {
  const bumpers = new Set(["stock", "lip", "aggressive", "track"]);
  const wings = new Set(["none", "lip", "gt", "swan"]);
  const kits = new Set(["none", "skirts", "canards", "roof", "lights"]);
  return {
    bumper: msg.bumper && bumpers.has(msg.bumper) ? msg.bumper : "stock",
    wing: msg.wing && wings.has(msg.wing) ? msg.wing : "none",
    kit: msg.kit && kits.has(msg.kit) ? msg.kit : "none",
  };
}

function claimPaint(
  room: Room,
  requested: string | undefined,
  vehicleId: string,
  exceptPlayerId?: string,
): string {
  const vid = parseVehicleId(vehicleId);
  const candidates = paintHexesForVehicle(vid, stockIdsFor(vid));
  return claimPaintHex(room.players, requested, candidates, exceptPlayerId);
}

function cleanupEmptyRooms(): void {
  for (const [id, room] of rooms) {
    if (room.humanCount === 0) {
      room.destroy();
      rooms.delete(id);
    }
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "list_rooms": {
        const list = [...rooms.values()]
          .filter((r) => r.persistent || r.status === "waiting" || r.status === "results")
          .map((r) => r.toInfo());
        sendTo(ws, { type: "rooms_list", rooms: list });
        break;
      }

      case "create_room": {
        const room = new Room(msg.name, msg.map, msg.difficulty, msg.aiCount);
        const playerId = genPlayerId();
        const vehicleId = parseVehicleId(msg.vehicleId);
        room.vehicleId = vehicleId;
        const paint = claimPaint(room, msg.paint, vehicleId);
        const aero = parseAero(msg);
        room.addPlayer(ws, playerId, msg.playerName, vehicleId, true, paint, "racer", aero);
        rooms.set(room.id, room);
        playerRooms.set(ws, { roomId: room.id, playerId });
        sendTo(ws, { type: "room_joined", room: room.toInfo(), yourId: playerId });
        break;
      }

      case "join_room": {
        const room = rooms.get(msg.roomId);
        if (!room || room.humanCount >= room.maxPlayers) {
          sendTo(ws, { type: "room_error", message: "Cannot join this room" });
          break;
        }
        const live =
          room.status === "racing" ||
          room.status === "countdown" ||
          room.status === "results";
        const wantSpec = Boolean(msg.asSpectator) || live;
        if (!live && room.status !== "waiting") {
          sendTo(ws, { type: "room_error", message: "Cannot join this room" });
          break;
        }
        const playerId = genPlayerId();
        const becomeHost = room.humanCount === 0 && !wantSpec;
        const vehicleId = parseVehicleId(msg.vehicleId);
        const paint = claimPaint(room, msg.paint, vehicleId);
        const role = wantSpec ? "spectator" : "racer";
        const aero = parseAero(msg);
        room.addPlayer(
          ws,
          playerId,
          msg.playerName,
          vehicleId,
          becomeHost,
          paint,
          role,
          aero,
        );
        playerRooms.set(ws, { roomId: room.id, playerId });
        sendTo(ws, { type: "room_joined", room: room.toInfo(), yourId: playerId });
        room.broadcast({ type: "room_updated", room: room.toInfo() }, playerId);
        // Late join mid-race — drop them into the live session as a ghost
        if (room.status === "racing" && room.raceStartTimestamp) {
          sendTo(ws, {
            type: "race_loading",
            map: room.map,
            vehicleId: room.vehicleId,
          });
          sendTo(ws, {
            type: "race_go",
            startTimestamp: room.raceStartTimestamp,
            vehicleId: room.vehicleId,
          });
        } else if (room.status === "countdown") {
          sendTo(ws, {
            type: "race_loading",
            map: room.map,
            vehicleId: room.vehicleId,
          });
        }
        break;
      }

      case "leave_room": {
        handleLeave(ws);
        break;
      }

      case "ready":
      case "unready": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (player) {
          player.ready = msg.type === "ready";
          // Never let ready wipe a missing paint — re-claim if needed
          if (!normalizePaintHex(player.paint)) {
            player.paint = claimPaint(room, undefined, player.vehicleId, player.id);
          }
          room.broadcast({ type: "room_updated", room: room.toInfo() });
        }
        break;
      }

      case "host_set_map":
      case "host_set_difficulty":
      case "host_set_ai":
      case "host_set_vehicle": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player?.isHost || room.status !== "waiting") break;
        if (msg.type === "host_set_map") room.map = msg.map;
        if (msg.type === "host_set_difficulty") room.difficulty = msg.difficulty;
        if (msg.type === "host_set_ai") room.aiCount = Math.min(4, Math.max(0, msg.aiCount));
        if (msg.type === "host_set_vehicle") {
          // Default class for AI / room listing — do not overwrite player picks
          room.vehicleId = parseVehicleId(msg.vehicleId);
        }
        room.broadcast({ type: "room_updated", room: room.toInfo() });
        break;
      }

      case "set_loadout": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room || room.status !== "waiting") break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player) break;
        player.vehicleId = parseVehicleId(msg.vehicleId);
        const aero = parseAero(msg);
        player.bumper = aero.bumper;
        player.wing = aero.wing;
        player.kit = aero.kit;
        if (typeof msg.paint === "string" && msg.paint.length >= 4) {
          const normalized = normalizePaintHex(msg.paint);
          if (!normalized) {
            sendTo(ws, {
              type: "room_error",
              message: "Pick a valid paint colour from your unlocked garage paints",
            });
            // Re-sync so optimistic client UI rolls back
            sendTo(ws, { type: "room_updated", room: room.toInfo() });
            break;
          }
          if (isPaintHexTaken(room.players, normalized, player.id)) {
            sendTo(ws, {
              type: "room_error",
              message: "Can't pick — that colour is already taken",
            });
            sendTo(ws, { type: "room_updated", room: room.toInfo() });
            break;
          }
          player.paint = normalized;
        } else if (!normalizePaintHex(player.paint)) {
          player.paint = claimPaint(room, undefined, player.vehicleId, player.id);
        }
        room.broadcast({ type: "room_updated", room: room.toInfo() });
        break;
      }

      case "host_kick": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player?.isHost) break;
        const target = room.players.find((p) => p.id === msg.playerId);
        if (target && !target.isHost) {
          sendTo(target.ws, { type: "kicked" });
          playerRooms.delete(target.ws);
          room.removePlayer(target.id);
          room.broadcast({ type: "room_updated", room: room.toInfo() });
        }
        break;
      }

      case "host_start": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player?.isHost || room.status !== "waiting") break;
        if (!room.allReady()) {
          sendTo(ws, { type: "room_error", message: "Not all players are ready (min 2 players, or 1 + AI)" });
          break;
        }
        room.startCountdown();
        break;
      }

      case "loaded": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room || room.status !== "countdown") break;
        room.playerLoaded(info.playerId);
        break;
      }

      case "chat": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player) break;
        const text = (msg.text || "").slice(0, 150).trim();
        if (!text) break;
        room.broadcast({ type: "chat", playerId: info.playerId, playerName: player.name, text });
        break;
      }

      case "taunt": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player) break;
        const now = Date.now();
        if (now - player.lastTauntAt < 2800) break;
        if (!isTauntId(msg.tauntId)) break;
        player.lastTauntAt = now;
        room.broadcast({
          type: "taunt",
          playerId: info.playerId,
          playerName: player.name,
          tauntId: msg.tauntId,
        });
        break;
      }

      case "join_next_race": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room || (room.status !== "waiting" && room.status !== "results")) break;
        const player = room.players.find((p) => p.id === info.playerId);
        if (!player || player.role !== "spectator") break;
        player.role = "racer";
        player.ready = room.status === "results" ? false : false;
        player.loaded = false;
        room.broadcast({ type: "room_updated", room: room.toInfo() });
        break;
      }

      case "car_state": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room || room.status !== "racing") break;
        room.updateCarState(info.playerId, msg.state);
        break;
      }

      case "race_finish": {
        const info = playerRooms.get(ws);
        if (!info) break;
        const room = rooms.get(info.roomId);
        if (!room || room.status !== "racing") break;
        room.playerFinished(
          info.playerId,
          msg.timeMs,
          msg.splits,
          msg.path,
          msg.paint,
        );
        break;
      }
    }
  });

  ws.on("close", () => {
    handleLeave(ws);
  });
});

function handleLeave(ws: WebSocket): void {
  const info = playerRooms.get(ws);
  if (!info) return;
  playerRooms.delete(ws);
  const room = rooms.get(info.roomId);
  if (!room) return;
  room.removePlayer(info.playerId);
  if (room.humanCount === 0 && !room.persistent) {
    room.destroy();
    rooms.delete(room.id);
  } else if (room.humanCount === 0 && room.persistent) {
    if (room.status !== "waiting") {
      room.reset();
    }
  } else {
    room.broadcast({ type: "room_updated", room: room.toInfo() });
  }
}

// Create 3 persistent default servers
const defaultServers = [
  { name: "Westminster Sprint — Open Lobby", map: "westminster-sprint", difficulty: "medium" as const },
  { name: "Dubai Marina — All Welcome", map: "dubai-marina-circuit", difficulty: "medium" as const },
  { name: "New York Harbor — Competitive", map: "new-york-harbor-circuit", difficulty: "hard" as const },
];

for (const cfg of defaultServers) {
  const room = new Room(cfg.name, cfg.map, cfg.difficulty, 2);
  room.maxPlayers = 8;
  room.persistent = true;
  rooms.set(room.id, room);
}

console.log(`[WS Server] Listening on port ${PORT} with ${defaultServers.length} default servers`);
