"use client";

import { useEffect, useRef } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useGameStore } from "@/stores/game-store";
import { sendMsg } from "@/lib/multiplayer/ws-client";
import { carTelemetry } from "@/lib/game/telemetry";
import {
  compactPathSamples,
  progressAlongRoad,
  type RacePathSample,
} from "@/lib/game/route-progress";
import type { RouteData } from "@/lib/validation/route-data";

/**
 * Bridges multiplayer store events into the game store.
 * Also records track-progress samples for the post-race delta heatmap.
 */
export function OnlineRaceSync({ route }: { route: RouteData }) {
  const countdownValue = useMultiplayerStore((s) => s.countdownValue);
  const racing = useMultiplayerStore((s) => s.racing);
  const results = useMultiplayerStore((s) => s.results);
  const myId = useMultiplayerStore((s) => s.myId);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const reportFinish = useMultiplayerStore((s) => s.reportFinish);
  const spectating = useMultiplayerStore((s) => s.spectating);
  const finished = useGameStore((s) => s.finished);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const splitMs = useGameStore((s) => s.splitMs);
  const reportedFinish = useRef(false);
  const sectorSplits = useRef<number[]>([]);
  const pathSamples = useRef<RacePathSample[]>([]);
  const lastSampleAt = useRef(0);

  const sentLoaded = useRef(false);
  const garageConfirmed = useGameStore((s) => s.garageConfirmed);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);

  useEffect(() => {
    if (garageConfirmed && sessionConfirmed && !sentLoaded.current) {
      sentLoaded.current = true;
      sendMsg({ type: "loaded" });
    }
  }, [garageConfirmed, sessionConfirmed]);

  useEffect(() => {
    if (countdownValue !== null) {
      useGameStore.setState({
        countdown: countdownValue,
        paused: true,
        introActive: false,
      });
    }
  }, [countdownValue]);

  useEffect(() => {
    if (racing) {
      useGameStore.setState({
        countdown: null,
        paused: false,
        introActive: false,
      });
      reportedFinish.current = false;
      sentLoaded.current = false;
      sectorSplits.current = [];
      pathSamples.current = [{ p: 0, t: 0 }];
      lastSampleAt.current = 0;
    }
  }, [racing]);

  // Sample progress ~8 Hz while racing (independent of React renders).
  useEffect(() => {
    if (!racing) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (now - lastSampleAt.current >= 120) {
        lastSampleAt.current = now;
        const gs = useGameStore.getState();
        if (!gs.paused && !gs.finished) {
          const p = progressAlongRoad(
            route.roadPoints,
            carTelemetry.x,
            carTelemetry.z,
          );
          const t = gs.elapsedMs;
          const prev = pathSamples.current[pathSamples.current.length - 1];
          if (!prev || p > prev.p + 0.004 || t > prev.t + 400) {
            pathSamples.current.push({ p, t });
            if (pathSamples.current.length > 400) {
              pathSamples.current.splice(0, pathSamples.current.length - 300);
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [racing, route.roadPoints]);

  useEffect(() => {
    if (splitMs !== null && racing) {
      sectorSplits.current.push(splitMs);
    }
  }, [splitMs, racing]);

  useEffect(() => {
    if (finished && !reportedFinish.current && racing && !spectating) {
      reportedFinish.current = true;
      const me = currentRoom?.players.find((p) => p.id === myId);
      const path = compactPathSamples([
        ...pathSamples.current,
        { p: 1, t: elapsedMs },
      ]);
      reportFinish(elapsedMs, sectorSplits.current, path, me?.paint);
    }
  }, [
    finished,
    racing,
    spectating,
    elapsedMs,
    reportFinish,
    currentRoom,
    myId,
  ]);

  useEffect(() => {
    if (results) {
      useGameStore.setState({ paused: true, finished: true });
    }
  }, [results]);

  return null;
}
