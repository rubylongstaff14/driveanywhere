"use client";

import { useEffect, useRef } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useGameStore } from "@/stores/game-store";
import { useAchievementStore } from "@/stores/achievement-store";
import { useProgressionStore } from "@/stores/progression-store";
import { useChallengesStore } from "@/stores/challenges-store";
import { raceReward } from "@/lib/progression/economy";
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
  const raceLoading = useMultiplayerStore((s) => s.raceLoading);
  const loadingProgress = useMultiplayerStore((s) => s.loadingProgress);
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
          const roadP = progressAlongRoad(
            route.roadPoints,
            carTelemetry.x,
            carTelemetry.z,
          );
          const cpTotal = Math.max(1, route.checkpoints.length);
          const cpP = (gs.checkpointIndex ?? 0) / cpTotal;
          const p = Math.max(roadP, cpP * 0.98);
          const t = gs.elapsedMs;
          const prev = pathSamples.current[pathSamples.current.length - 1];
          if (!prev || p > prev.p + 0.002 || t > prev.t + 250) {
            pathSamples.current.push({ p, t });
            if (pathSamples.current.length > 500) {
              pathSamples.current.splice(0, pathSamples.current.length - 400);
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
      const path = compactPathSamples(
        [...pathSamples.current, { p: 1, t: elapsedMs }],
        96,
      );
      reportFinish(elapsedMs, sectorSplits.current, path, me?.paint);

      // Award XP/coins and record achievement progress for online finish
      const personalBest = useGameStore.getState().personalBestMs === null ||
        elapsedMs < (useGameStore.getState().personalBestMs ?? Infinity);
      const reward = raceReward({ finished: true, valid: true, personalBest });
      useProgressionStore.getState().awardRace(reward.xp, reward.coins);
      const newAchievements = useAchievementStore.getState().recordRace({
        finished: true,
        valid: true,
        position: null,
        mapSlug: route.slug,
        online: true,
        personalBest,
        driftSeconds: 0,
        topSpeed: 0,
        cleanLap: !useGameStore.getState().invalid,
      });
      for (const a of newAchievements) {
        useProgressionStore.getState().awardAchievement(a.coinReward, a.xpReward);
      }
      useChallengesStore.getState().progressChallenge("onlineRaces", 1);
      useChallengesStore.getState().progressChallenge("races_today", 1);
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
    if (!results) return;
    const provisional = useMultiplayerStore.getState().resultsProvisional;
    const localFinished = useGameStore.getState().finished;
    if (!provisional) {
      useGameStore.setState({ paused: true, finished: true });
    } else if (localFinished || spectating) {
      // First finishers / spectators see the live board; others keep racing
      useGameStore.setState({ paused: true });
    }
  }, [results, spectating]);

  if (!raceLoading || racing || countdownValue !== null) return null;

  const waitingNames = loadingProgress?.waitingFor ?? [];
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="mx-5 max-w-md rounded-2xl border border-white/15 bg-black/80 px-8 py-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
        <p className="font-display text-2xl text-white">Waiting for players</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-wider text-mist">
          {loadingProgress
            ? `${loadingProgress.loaded} of ${loadingProgress.total} loaded`
            : "Preparing race"}
        </p>
        {waitingNames.length > 0 ? (
          <p className="mt-3 text-sm text-white/75">
            Waiting for {waitingNames.join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
