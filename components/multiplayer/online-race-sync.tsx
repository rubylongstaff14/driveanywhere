"use client";

import { useEffect, useRef } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useGameStore } from "@/stores/game-store";

/**
 * Bridges multiplayer store events into the game store.
 * Mount this inside GameExperience when mode=online.
 */
export function OnlineRaceSync() {
  const countdownValue = useMultiplayerStore((s) => s.countdownValue);
  const racing = useMultiplayerStore((s) => s.racing);
  const results = useMultiplayerStore((s) => s.results);
  const myId = useMultiplayerStore((s) => s.myId);
  const reportFinish = useMultiplayerStore((s) => s.reportFinish);
  const finished = useGameStore((s) => s.finished);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const reportedFinish = useRef(false);

  // Server countdown -> game store countdown
  useEffect(() => {
    if (countdownValue !== null) {
      useGameStore.setState({ countdown: countdownValue, paused: true, introActive: false });
    }
  }, [countdownValue]);

  // Server race_go -> game unpauses
  useEffect(() => {
    if (racing) {
      useGameStore.setState({ countdown: null, paused: false, introActive: false });
      reportedFinish.current = false;
    }
  }, [racing]);

  // Player finishes -> report to server
  useEffect(() => {
    if (finished && !reportedFinish.current && racing) {
      reportedFinish.current = true;
      reportFinish(elapsedMs);
    }
  }, [finished, racing, elapsedMs, reportFinish]);

  // Server results -> pause game
  useEffect(() => {
    if (results) {
      useGameStore.setState({ paused: true, finished: true });
    }
  }, [results]);

  return null;
}
