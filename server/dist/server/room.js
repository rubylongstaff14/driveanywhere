let nextRoomId = 1;
const LOAD_TIMEOUT_MS = 45_000;
const RACE_TIMEOUT_MS = 12 * 60_000;
function broadcastIntervalMs(playerCount) {
    if (playerCount >= 6)
        return 66;
    if (playerCount >= 4)
        return 50;
    return 40;
}
export class Room {
    id;
    name;
    map;
    difficulty;
    aiCount;
    vehicleId = "sports";
    maxPlayers = 8;
    persistent = false;
    players = [];
    status = "waiting";
    raceStartTimestamp = null;
    countdownTimer = null;
    broadcastTimer = null;
    positionsTimer = null;
    loadTimeout = null;
    raceTimeout = null;
    countdownStarted = false;
    constructor(name, map, difficulty, aiCount) {
        this.id = `room_${nextRoomId++}`;
        this.name = name;
        this.map = map;
        this.difficulty = difficulty;
        this.aiCount = Math.min(4, Math.max(0, aiCount));
    }
    get host() {
        return this.players.find((p) => p.isHost);
    }
    get humanCount() {
        return this.players.length;
    }
    toInfo() {
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
                paint: p.paint,
            })),
            status: this.status,
        };
    }
    addPlayer(ws, id, name, vehicleId, isHost, paint) {
        const player = {
            ws,
            id,
            name,
            ready: isHost,
            isHost,
            vehicleId,
            paint,
            carState: null,
            finishTimeMs: null,
            splits: [],
            path: [],
            loaded: false,
        };
        this.players.push(player);
        return player;
    }
    removePlayer(id) {
        const idx = this.players.findIndex((p) => p.id === id);
        if (idx === -1)
            return false;
        const wasRacing = this.status === "racing";
        const wasCountdown = this.status === "countdown";
        this.players.splice(idx, 1);
        if (this.players.length > 0 && !this.players.some((p) => p.isHost)) {
            this.players[0].isHost = true;
            this.players[0].ready = true;
        }
        if (wasCountdown && this.players.length > 0) {
            this.syncLoadProgress();
            const loadedCount = this.players.filter((p) => p.loaded).length;
            if (loadedCount === this.players.length) {
                this.beginCountdown();
            }
        }
        if (wasRacing) {
            if (this.players.length === 0) {
                this.endRace();
            }
            else if (this.players.every((p) => p.finishTimeMs !== null)) {
                this.endRace();
            }
        }
        return true;
    }
    broadcast(msg, exclude) {
        const data = JSON.stringify(msg);
        for (const p of this.players) {
            if (p.id === exclude)
                continue;
            if (p.ws.readyState !== 1)
                continue;
            try {
                if (p.ws.bufferedAmount > 512_000)
                    continue;
                p.ws.send(data);
            }
            catch {
                /* disconnected */
            }
        }
    }
    send(playerId, msg) {
        const p = this.players.find((pl) => pl.id === playerId);
        if (!p || p.ws.readyState !== 1)
            return;
        try {
            p.ws.send(JSON.stringify(msg));
        }
        catch {
            /* */
        }
    }
    allReady() {
        if (this.players.length === 0)
            return false;
        if (this.players.length === 1 && this.aiCount === 0)
            return false;
        return this.players.every((p) => p.ready);
    }
    startCountdown() {
        this.status = "countdown";
        this.countdownStarted = false;
        for (const p of this.players)
            p.loaded = false;
        this.broadcast({ type: "race_loading", map: this.map, vehicleId: this.vehicleId });
        this.syncLoadProgress();
        if (this.loadTimeout)
            clearTimeout(this.loadTimeout);
        this.loadTimeout = setTimeout(() => {
            if (this.status === "countdown" && !this.countdownStarted && this.players.length > 0) {
                this.beginCountdown();
            }
        }, LOAD_TIMEOUT_MS);
    }
    syncLoadProgress() {
        const loadedCount = this.players.filter((p) => p.loaded).length;
        this.broadcast({
            type: "waiting_for_players",
            loaded: loadedCount,
            total: this.players.length,
        });
    }
    playerLoaded(playerId) {
        const p = this.players.find((pl) => pl.id === playerId);
        if (!p || this.status !== "countdown")
            return;
        p.loaded = true;
        this.syncLoadProgress();
        if (this.players.every((pl) => pl.loaded)) {
            this.beginCountdown();
        }
    }
    beginCountdown() {
        if (this.countdownStarted || this.status !== "countdown")
            return;
        this.countdownStarted = true;
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
        }
        let count = 5;
        this.broadcast({ type: "countdown", value: count });
        this.countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                this.broadcast({ type: "countdown", value: count });
            }
            else {
                if (this.countdownTimer)
                    clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.startRace();
            }
        }, 1000);
    }
    startRace() {
        this.status = "racing";
        this.raceStartTimestamp = Date.now();
        for (const p of this.players) {
            p.carState = null;
            p.finishTimeMs = null;
            p.splits = [];
        }
        this.broadcast({ type: "race_go", startTimestamp: this.raceStartTimestamp, vehicleId: this.vehicleId });
        this.startBroadcastLoop();
        this.startPositionsLoop();
        if (this.raceTimeout)
            clearTimeout(this.raceTimeout);
        this.raceTimeout = setTimeout(() => {
            if (this.status === "racing")
                this.endRace();
        }, RACE_TIMEOUT_MS);
    }
    startBroadcastLoop() {
        if (this.broadcastTimer)
            clearInterval(this.broadcastTimer);
        const interval = broadcastIntervalMs(this.players.length);
        this.broadcastTimer = setInterval(() => {
            const updates = [];
            for (const p of this.players) {
                if (p.carState)
                    updates.push({ playerId: p.id, state: p.carState });
            }
            if (updates.length === 0)
                return;
            this.broadcast({ type: "cars_batch", updates });
        }, interval);
    }
    updateCarState(playerId, state) {
        const player = this.players.find((p) => p.id === playerId);
        if (!player || this.status !== "racing")
            return;
        player.carState = state;
    }
    playerFinished(playerId, timeMs, splits, path, paint) {
        const p = this.players.find((pl) => pl.id === playerId);
        if (!p || p.finishTimeMs !== null)
            return;
        p.finishTimeMs = timeMs;
        p.splits = splits;
        if (path && path.length > 0) {
            p.path = path
                .filter((s) => Number.isFinite(s.p) && Number.isFinite(s.t))
                .slice(0, 80)
                .map((s) => ({
                p: Math.max(0, Math.min(1, s.p)),
                t: Math.max(0, Math.round(s.t)),
            }));
        }
        if (typeof paint === "string" && paint.length >= 4) {
            p.paint = paint.slice(0, 16);
        }
        if (this.players.every((pl) => pl.finishTimeMs !== null)) {
            this.endRace();
        }
    }
    startPositionsLoop() {
        if (this.positionsTimer)
            clearInterval(this.positionsTimer);
        this.positionsTimer = setInterval(() => {
            if (this.status !== "racing")
                return;
            const sorted = [...this.players].sort((a, b) => {
                const aCp = a.carState?.checkpointIndex ?? 0;
                const bCp = b.carState?.checkpointIndex ?? 0;
                if (aCp !== bCp)
                    return bCp - aCp;
                return (a.carState?.raceTimeMs ?? Infinity) - (b.carState?.raceTimeMs ?? Infinity);
            });
            const leaderTime = sorted[0]?.carState?.raceTimeMs ?? 0;
            const positions = sorted.map((p, i) => ({
                playerId: p.id,
                playerName: p.name,
                position: i + 1,
                checkpointIndex: p.carState?.checkpointIndex ?? 0,
                raceTimeMs: p.carState?.raceTimeMs ?? 0,
                delta: i === 0 ? null : (p.carState?.raceTimeMs ?? 0) - leaderTime,
            }));
            this.broadcast({ type: "race_positions", positions });
        }, 750);
    }
    endRace() {
        if (this.status === "results")
            return;
        if (this.broadcastTimer)
            clearInterval(this.broadcastTimer);
        if (this.positionsTimer)
            clearInterval(this.positionsTimer);
        if (this.raceTimeout)
            clearTimeout(this.raceTimeout);
        this.broadcastTimer = null;
        this.positionsTimer = null;
        this.raceTimeout = null;
        this.status = "results";
        const results = this.players
            .map((p) => ({
            playerId: p.id,
            playerName: p.name,
            timeMs: p.finishTimeMs,
            position: 0,
            finished: p.finishTimeMs !== null,
            splits: p.splits,
            paint: p.paint,
            path: p.path.length > 0 ? p.path : undefined,
        }))
            .sort((a, b) => {
            if (a.finished && !b.finished)
                return -1;
            if (!a.finished && b.finished)
                return 1;
            return (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity);
        })
            .map((r, i) => ({ ...r, position: i + 1 }));
        this.broadcast({ type: "race_results", results });
        setTimeout(() => {
            if (this.status !== "results")
                return;
            this.status = "waiting";
            this.countdownStarted = false;
            for (const p of this.players) {
                p.ready = p.isHost;
                p.carState = null;
                p.finishTimeMs = null;
                p.splits = [];
                p.loaded = false;
            }
            this.broadcast({ type: "room_updated", room: this.toInfo() });
        }, 8000);
    }
    reset() {
        if (this.countdownTimer)
            clearInterval(this.countdownTimer);
        if (this.broadcastTimer)
            clearInterval(this.broadcastTimer);
        if (this.positionsTimer)
            clearInterval(this.positionsTimer);
        if (this.loadTimeout)
            clearTimeout(this.loadTimeout);
        if (this.raceTimeout)
            clearTimeout(this.raceTimeout);
        this.countdownTimer = null;
        this.broadcastTimer = null;
        this.positionsTimer = null;
        this.loadTimeout = null;
        this.raceTimeout = null;
        this.countdownStarted = false;
        this.status = "waiting";
    }
    destroy() {
        this.reset();
        this.broadcast({ type: "room_closed" });
    }
}
