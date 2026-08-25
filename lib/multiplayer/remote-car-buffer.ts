/**
 * Hot-path remote car buffer — updated without React so interpolation
 * never waits on Zustand subscribers.
 */
import type { CarState } from "@/lib/multiplayer/protocol";

export type RemoteSample = { state: CarState; timestamp: number };

const MAX_HISTORY = 24;

export const remoteCarBuffer = {
  states: {} as Record<string, CarState>,
  history: {} as Record<string, RemoteSample[]>,
  /** EMA of (localNow - serverTime) */
  clockSkewEma: 0,
  /** EMA of inter-packet interval (ms) */
  packetGapEma: 40,
  lastBatchLocal: 0,
  playerIds: [] as string[],
};

export function clearRemoteCarBuffer(): void {
  remoteCarBuffer.states = {};
  remoteCarBuffer.history = {};
  remoteCarBuffer.clockSkewEma = 0;
  remoteCarBuffer.packetGapEma = 40;
  remoteCarBuffer.lastBatchLocal = 0;
  remoteCarBuffer.playerIds = [];
}

export function ingestCarBatch(
  updates: Array<{ playerId: string; state: CarState }>,
  myId: string | null,
  serverTime: number,
  paintFallback: (playerId: string) => string | undefined,
): { idsChanged: boolean } {
  const now = performance.now();
  const wallNow = Date.now();
  const rawSkew = wallNow - serverTime;
  if (remoteCarBuffer.clockSkewEma === 0) {
    remoteCarBuffer.clockSkewEma = rawSkew;
  } else {
    remoteCarBuffer.clockSkewEma =
      remoteCarBuffer.clockSkewEma * 0.92 + rawSkew * 0.08;
  }

  if (remoteCarBuffer.lastBatchLocal > 0) {
    const gap = now - remoteCarBuffer.lastBatchLocal;
    if (gap > 5 && gap < 400) {
      remoteCarBuffer.packetGapEma =
        remoteCarBuffer.packetGapEma * 0.85 + gap * 0.15;
    }
  }
  remoteCarBuffer.lastBatchLocal = now;

  const prevIds = remoteCarBuffer.playerIds;
  for (const u of updates) {
    if (u.playerId === myId) continue;
    const paint = u.state.paint ?? paintFallback(u.playerId);
    const state = paint ? { ...u.state, paint } : u.state;
    remoteCarBuffer.states[u.playerId] = state;

    const stamp = (u.state.t ?? serverTime) + remoteCarBuffer.clockSkewEma;
    const prev = remoteCarBuffer.history[u.playerId] ?? [];
    const last = prev[prev.length - 1];
    if (last && stamp <= last.timestamp + 1) {
      // Replace newest if same tick / tiny jitter
      if (stamp >= last.timestamp - 2) {
        prev[prev.length - 1] = { state, timestamp: Math.max(stamp, last.timestamp) };
        remoteCarBuffer.history[u.playerId] = prev;
      }
      continue;
    }
    prev.push({ state, timestamp: stamp });
    while (prev.length > MAX_HISTORY) prev.shift();
    remoteCarBuffer.history[u.playerId] = prev;
  }

  const ids = Object.keys(remoteCarBuffer.states).sort();
  remoteCarBuffer.playerIds = ids;
  const idsChanged =
    ids.length !== prevIds.length || ids.some((id, i) => id !== prevIds[i]);
  return { idsChanged };
}

/** Adaptive render delay — just behind the packet stream, not a fixed lag. */
export function remoteInterpDelayMs(): number {
  const gap = remoteCarBuffer.packetGapEma;
  return Math.min(95, Math.max(32, gap * 1.35 + 8));
}
