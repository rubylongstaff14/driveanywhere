/**
 * Hot-path remote car buffer — updated without React so interpolation
 * never waits on Zustand subscribers.
 *
 * Timestamps are local receive times (monotonic) so clock-skew to the
 * EC2 server cannot make remotes jump.
 */
import type { CarState } from "@/lib/multiplayer/protocol";

export type RemoteSample = { state: CarState; timestamp: number };

const MAX_HISTORY = 48;

export const remoteCarBuffer = {
  states: {} as Record<string, CarState>,
  history: {} as Record<string, RemoteSample[]>,
  /** EMA of inter-packet interval (ms) on the local clock */
  packetGapEma: 20,
  lastBatchLocal: 0,
  playerIds: [] as string[],
};

export function clearRemoteCarBuffer(): void {
  remoteCarBuffer.states = {};
  remoteCarBuffer.history = {};
  remoteCarBuffer.packetGapEma = 20;
  remoteCarBuffer.lastBatchLocal = 0;
  remoteCarBuffer.playerIds = [];
}

export function ingestCarBatch(
  updates: Array<{ playerId: string; state: CarState }>,
  myId: string | null,
  _serverTime: number,
  paintFallback: (playerId: string) => string | undefined,
): { idsChanged: boolean } {
  const now = performance.now();

  if (remoteCarBuffer.lastBatchLocal > 0) {
    const gap = now - remoteCarBuffer.lastBatchLocal;
    if (gap > 4 && gap < 250) {
      remoteCarBuffer.packetGapEma =
        remoteCarBuffer.packetGapEma * 0.8 + gap * 0.2;
    }
  }
  remoteCarBuffer.lastBatchLocal = now;

  const prevIds = remoteCarBuffer.playerIds;
  for (const u of updates) {
    if (u.playerId === myId) continue;
    const paint = u.state.paint ?? paintFallback(u.playerId);
    const state = paint ? { ...u.state, paint } : u.state;
    remoteCarBuffer.states[u.playerId] = state;

    const prev = remoteCarBuffer.history[u.playerId] ?? [];
    const last = prev[prev.length - 1];
    // Keep at most one sample per ~8ms; replace if denser
    if (last && now - last.timestamp < 8) {
      prev[prev.length - 1] = { state, timestamp: now };
    } else {
      prev.push({ state, timestamp: now });
      while (prev.length > MAX_HISTORY) prev.shift();
    }
    remoteCarBuffer.history[u.playerId] = prev;
  }

  const ids = Object.keys(remoteCarBuffer.states).sort();
  remoteCarBuffer.playerIds = ids;
  const idsChanged =
    ids.length !== prevIds.length || ids.some((id, i) => id !== prevIds[i]);
  return { idsChanged };
}

/**
 * Short render delay — enough to hide jitter, low enough to feel live.
 * Target ~1 packet behind the stream.
 */
export function remoteInterpDelayMs(): number {
  const gap = remoteCarBuffer.packetGapEma;
  // Render roughly two packets behind. The extra latency is small (~65 ms at
  // 30 Hz) but gives interpolation enough real samples to avoid oscillating
  // between prediction and correction when Wi-Fi packets arrive unevenly.
  return Math.min(180, Math.max(90, gap * 2.4 + 12));
}
