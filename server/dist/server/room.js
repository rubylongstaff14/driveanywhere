let nextRoomId = 1;
const RACE_TIMEOUT_MS = 12 * 60_000;
function broadcastIntervalMs(playerCount) {
    // Physics stays client-side at 60 Hz. Sending whole-grid snapshots faster
    // than ~30 Hz wastes bandwidth and creates queue jitter on ordinary Wi-Fi.
    if (playerCount >= 6)
        return 40;
    if (playerCount >= 4)
        return 36;
    return 33;
}
export class Room {
    id;
    name;
    map;
    difficulty;
    aiCount;
    lapCount = 1;
    vehicleId = "sports";
    maxPlayers = 8;
    persistent = false;
    players = [];
    status = "waiting";
    raceStartTimestamp = null;
    countdownTimer = null;
    broadcastTimer = null;
    positionsTimer = null;
    raceTimeout = null;
    finishGraceTimer = null;
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
            lapCount: this.lapCount,
            vehicleId: this.vehicleId,
            maxPlayers: this.maxPlayers,
            players: this.players.map((p) => ({
                id: p.id,
                name: p.name,
                ready: p.ready,
                isHost: p.isHost,
                vehicleId: p.vehicleId,
                paint: p.paint,
                bumper: p.bumper,
                wing: p.wing,
                kit: p.kit,
                role: p.role,
            })),
            status: this.status,
        };
    }
    addPlayer(ws, id, name, vehicleId, isHost, paint, role = "racer", aero) {
        const player = {
            ws,
            id,
            name,
            ready: isHost || role === "spectator",
            isHost,
            vehicleId,
            paint,
            bumper: aero?.bumper ?? "stock",
            wing: aero?.wing ?? "none",
            kit: aero?.kit ?? "none",
            role,
            carState: null,
            finishTimeMs: null,
            splits: [],
            path: [],
            progressHistory: [],
            loaded: role === "spectator",
            lastTauntAt: 0,
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
            const racers = this.players.filter((p) => p.role !== "spectator");
            if (racers.length > 0 && racers.every((p) => p.loaded)) {
                this.beginCountdown();
            }
        }
        if (wasRacing) {
            const racers = this.players.filter((p) => p.role !== "spectator");
            if (racers.length === 0) {
                this.endRace();
            }
            else if (racers.every((p) => p.finishTimeMs !== null)) {
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
                if (p.ws.bufferedAmount > 400_000)
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
        const racers = this.players.filter((p) => p.role !== "spectator");
        if (racers.length === 0)
            return false;
        if (racers.length === 1 && this.aiCount === 0)
            return false;
        return racers.every((p) => p.ready);
    }
    startCountdown() {
        this.status = "countdown";
        this.countdownStarted = false;
        for (const p of this.players)
            p.loaded = false;
        this.broadcast({
            type: "race_loading",
            map: this.map,
            vehicleId: this.vehicleId,
        });
        this.syncLoadProgress();
    }
    syncLoadProgress() {
        const racers = this.players.filter((p) => p.role !== "spectator");
        const loadedCount = racers.filter((p) => p.loaded).length;
        this.broadcast({
            type: "waiting_for_players",
            loaded: loadedCount,
            total: Math.max(1, racers.length),
            waitingFor: racers.filter((p) => !p.loaded).map((p) => p.name),
        });
    }
    playerLoaded(playerId) {
        const p = this.players.find((pl) => pl.id === playerId);
        if (!p || this.status !== "countdown")
            return;
        p.loaded = true;
        this.syncLoadProgress();
        const racers = this.players.filter((pl) => pl.role !== "spectator");
        if (racers.length > 0 && racers.every((pl) => pl.loaded)) {
            this.beginCountdown();
        }
    }
    beginCountdown() {
        if (this.countdownStarted || this.status !== "countdown")
            return;
        this.countdownStarted = true;
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
        if (this.finishGraceTimer) {
            clearTimeout(this.finishGraceTimer);
            this.finishGraceTimer = null;
        }
        for (const p of this.players) {
            p.carState = null;
            p.finishTimeMs = null;
            p.splits = [];
            p.path = [];
            p.progressHistory = [];
        }
        this.broadcast({
            type: "race_go",
            startTimestamp: this.raceStartTimestamp,
            vehicleId: this.vehicleId,
        });
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
            const serverTime = Date.now();
            for (const p of this.players) {
                if (!p.carState)
                    continue;
                updates.push({
                    playerId: p.id,
                    state: {
                        ...p.carState,
                        paint: p.paint ?? p.carState.paint,
                        t: p.carState.t ?? serverTime,
                    },
                });
            }
            if (updates.length === 0)
                return;
            this.broadcast({ type: "cars_batch", serverTime, updates });
        }, interval);
    }
    updateCarState(playerId, state) {
        const player = this.players.find((p) => p.id === playerId);
        if (!player || this.status !== "racing")
            return;
        if (player.role === "spectator")
            return;
        player.carState = {
            ...state,
            paint: player.paint ?? state.paint,
            t: Date.now(),
        };
        const p = Math.max(0, Math.min(1, state.trackProgress ?? 0));
        const t = Math.max(0, state.raceTimeMs ?? 0);
        const hist = player.progressHistory;
        const last = hist[hist.length - 1];
        if (!last || p > last.p + 0.002 || t > last.t + 200) {
            hist.push({ p, t });
            if (hist.length > 140)
                hist.splice(0, hist.length - 120);
        }
    }
    timeAtProgress(hist, progress) {
        if (hist.length === 0)
            return null;
        if (progress <= hist[0].p)
            return hist[0].t;
        for (let i = 0; i < hist.length - 1; i += 1) {
            const a = hist[i];
            const b = hist[i + 1];
            if (progress >= a.p && progress <= b.p) {
                const u = (progress - a.p) / Math.max(1e-6, b.p - a.p);
                return a.t + (b.t - a.t) * u;
            }
        }
        return hist[hist.length - 1].t;
    }
    buildResults() {
        return this.players
            .filter((p) => p.role !== "spectator")
            .map((p) => {
            let path = p.path.length > 0 ? p.path : undefined;
            if (!path && p.progressHistory.length >= 2) {
                path = p.progressHistory
                    .filter((s) => Number.isFinite(s.p) && Number.isFinite(s.t))
                    .slice(0, 96)
                    .map((s) => ({
                    p: Math.max(0, Math.min(1, s.p)),
                    t: Math.max(0, Math.round(s.t)),
                }));
            }
            return {
                playerId: p.id,
                playerName: p.name,
                timeMs: p.finishTimeMs,
                position: 0,
                finished: p.finishTimeMs !== null,
                splits: p.splits,
                paint: p.paint,
                path,
            };
        })
            .sort((a, b) => {
            if (a.finished && !b.finished)
                return -1;
            if (!a.finished && b.finished)
                return 1;
            return (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity);
        })
            .map((r, i) => ({ ...r, position: i + 1 }));
    }
    broadcastStandings(provisional) {
        this.broadcast({
            type: "race_results",
            results: this.buildResults(),
            provisional,
        });
    }
    playerFinished(playerId, timeMs, splits, path, paint) {
        const p = this.players.find((pl) => pl.id === playerId);
        if (!p || p.role === "spectator" || p.finishTimeMs !== null)
            return;
        p.finishTimeMs = timeMs;
        p.splits = splits;
        if (path && path.length > 0) {
            p.path = path
                .filter((s) => Number.isFinite(s.p) && Number.isFinite(s.t))
                .slice(0, 96)
                .map((s) => ({
                p: Math.max(0, Math.min(1, s.p)),
                t: Math.max(0, Math.round(s.t)),
            }));
        }
        else if (p.progressHistory.length >= 2) {
            p.path = p.progressHistory.slice(0, 96);
        }
        if (typeof paint === "string" && paint.length >= 4) {
            p.paint = paint.slice(0, 16);
        }
        const racers = this.players.filter((pl) => pl.role !== "spectator");
        const finishedCount = racers.filter((pl) => pl.finishTimeMs !== null).length;
        // Live board so P1 can watch later finishers roll in
        this.broadcastStandings(true);
        if (racers.length > 0 && finishedCount === racers.length) {
            this.endRace();
            return;
        }
        // After first finisher, give others a grace window then close the board
        if (finishedCount === 1 && !this.finishGraceTimer) {
            this.finishGraceTimer = setTimeout(() => {
                this.finishGraceTimer = null;
                if (this.status === "racing")
                    this.endRace();
            }, 90_000);
        }
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
        if (this.finishGraceTimer)
            clearTimeout(this.finishGraceTimer);
        this.broadcastTimer = null;
        this.positionsTimer = null;
        this.raceTimeout = null;
        this.finishGraceTimer = null;
        this.status = "results";
        this.broadcastStandings(false);
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
                p.path = [];
                p.progressHistory = [];
            }
            this.broadcast({ type: "room_updated", room: this.toInfo() });
        }, 20_000);
    }
    startPositionsLoop() {
        if (this.positionsTimer)
            clearInterval(this.positionsTimer);
        this.positionsTimer = setInterval(() => {
            if (this.status !== "racing")
                return;
            const sorted = [...this.players]
                .filter((p) => p.role !== "spectator")
                .sort((a, b) => {
                const aFin = a.finishTimeMs !== null;
                const bFin = b.finishTimeMs !== null;
                if (aFin && !bFin)
                    return -1;
                if (!aFin && bFin)
                    return 1;
                if (aFin && bFin) {
                    return (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0);
                }
                const aP = a.carState?.trackProgress ??
                    (a.carState?.checkpointIndex ?? 0) / 100;
                const bP = b.carState?.trackProgress ??
                    (b.carState?.checkpointIndex ?? 0) / 100;
                if (Math.abs(aP - bP) > 0.0005)
                    return bP - aP;
                return ((a.carState?.raceTimeMs ?? Infinity) -
                    (b.carState?.raceTimeMs ?? Infinity));
            });
            const leader = sorted[0];
            const leaderHist = leader?.progressHistory ?? [];
            const positions = sorted.map((p, i) => {
                const progress = p.carState?.trackProgress ?? (p.carState?.checkpointIndex ?? 0) / 100;
                let delta = null;
                if (i > 0 && leader) {
                    const leaderT = this.timeAtProgress(leaderHist, progress);
                    const myT = p.carState?.raceTimeMs ?? 0;
                    if (leaderT != null) {
                        // Positive = behind leader at this same progress
                        delta = Math.max(0, Math.round(myT - leaderT));
                    }
                    else {
                        const leadP = leader.carState?.trackProgress ??
                            (leader.carState?.checkpointIndex ?? 0) / 100;
                        const gapP = Math.max(0, leadP - progress);
                        const spd = Math.max(8, (p.carState?.speed ?? 40) / 3.6);
                        delta = Math.round(((gapP * 2500) / spd) * 1000);
                    }
                }
                return {
                    playerId: p.id,
                    playerName: p.name,
                    position: i + 1,
                    checkpointIndex: p.carState?.checkpointIndex ?? 0,
                    raceTimeMs: p.carState?.raceTimeMs ?? 0,
                    delta,
                    trackProgress: progress,
                };
            });
            this.broadcast({ type: "race_positions", positions });
        }, 200);
    }
    reset() {
        if (this.countdownTimer)
            clearInterval(this.countdownTimer);
        if (this.broadcastTimer)
            clearInterval(this.broadcastTimer);
        if (this.positionsTimer)
            clearInterval(this.positionsTimer);
        if (this.raceTimeout)
            clearTimeout(this.raceTimeout);
        if (this.finishGraceTimer)
            clearTimeout(this.finishGraceTimer);
        this.countdownTimer = null;
        this.broadcastTimer = null;
        this.positionsTimer = null;
        this.raceTimeout = null;
        this.finishGraceTimer = null;
        this.countdownStarted = false;
        this.status = "waiting";
    }
    destroy() {
        this.reset();
        this.broadcast({ type: "room_closed" });
    }
}
