"use client";

import { useEffect, useRef } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { useGameStore } from "@/stores/game-store";
import { sendMsg } from "@/lib/multiplayer/ws-client";

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
  const splitMs = useGameStore((s) => s.splitMs);
  const reportedFinish = useRef(false);
  const sectorSplits = useRef<number[]>([]);

  const sentLoaded = useRef(false);
  const garageConfirmed = useGameStore((s) => s.garageConfirmed);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);

  // Once game scene has loaded, notify server
  useEffect(() => {
    if (garageConfirmed && sessionConfirmed && !sentLoaded.current) {
      sentLoaded.current = true;
      sendMsg({ type: "loaded" });
    }
  }, [garageConfirmed, sessionConfirmed]);

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
      sentLoaded.current = false;
      sectorSplits.current = [];
    }
  }, [racing]);

  // Track sector splits
  useEffect(() => {
    if (splitMs !== null && racing) {
      sectorSplits.current.push(splitMs);
    }
  }, [splitMs, racing]);

  // Player finishes -> report to server with splits
  useEffect(() => {
    if (finished && !reportedFinish.current && racing) {
      reportedFinish.current = true;
      reportFinish(elapsedMs, sectorSplits.current);
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
