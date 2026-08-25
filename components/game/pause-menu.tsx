"use client";

import { useEffect, useState } from "react";
import { submitAttempt } from "@/lib/database/mock/attempts";
import { formatLapTime } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import {
  useSettingsStore,
  type QualityPreset,
} from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { raceReward } from "@/lib/progression/economy";
import { useProgressionStore } from "@/stores/progression-store";
import { useAchievementStore } from "@/stores/achievement-store";
import { useChallengesStore } from "@/stores/challenges-store";
import { submitHotLapTime, getHotLapState } from "@/lib/progression/hot-lap";
import { useTournamentStore } from "@/stores/tournament-store";

const QUALITY_OPTIONS: { value: QualityPreset; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface PauseMenuProps {
  routeSlug: string;
  routeName: string;
  routeId: string;
  requiredCheckpoints: number;
  isTournamentRace?: boolean;
}

export function PauseMenu({
  routeSlug,
  routeName,
  routeId,
  requiredCheckpoints,
  isTournamentRace = false,
}: PauseMenuProps) {
  const paused = useGameStore((s) => s.paused);
  const finished = useGameStore((s) => s.finished);
  const started = useGameStore((s) => s.started);
  const invalid = useGameStore((s) => s.invalid);
  const invalidReason = useGameStore((s) => s.invalidReason);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const checkpointIndex = useGameStore((s) => s.checkpointIndex);
  const personalBestMs = useGameStore((s) => s.personalBestMs);
  const restartToken = useGameStore((s) => s.restartToken);
  const introActive = useGameStore((s) => s.introActive);
  const countdown = useGameStore((s) => s.countdown);
  const garageConfirmed = useGameStore((s) => s.garageConfirmed);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const setPaused = useGameStore((s) => s.setPaused);
  const beginCountdown = useGameStore((s) => s.beginCountdown);
  const requestRestart = useGameStore((s) => s.requestRestart);
  const requestCheckpointReset = useGameStore((s) => s.requestCheckpointReset);
  const setPersonalBest = useGameStore((s) => s.setPersonalBest);
  const quality = useSettingsStore((s) => s.quality);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const engineVolume = useSettingsStore((s) => s.engineVolume);
  const setEngineVolume = useSettingsStore((s) => s.setEngineVolume);

  const user = useAuthStore((s) => s.user);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submittedFor, setSubmittedFor] = useState<number | null>(null);
  const submitted = finished && submittedFor === restartToken;

  const isHotLap =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("hotlap") === "1";

  const [hotLapResult, setHotLapResult] = useState<{
    rank: number;
    totalEntrants: number;
    coinsAwarded: number;
  } | null>(null);
  const [hotLapSubmitted, setHotLapSubmitted] = useState(false);

  const tournamentActive = useTournamentStore((s) => s.active);
  const submitRoundTime = useTournamentStore((s) => s.submitRoundTime);
  const [tournamentSubmitted, setTournamentSubmitted] = useState(false);
  const [tournamentMsg, setTournamentMsg] = useState<string | null>(null);

  const currentTournamentRound = tournamentActive?.rounds.find((r) => !r.completed);
  const isCurrentTournamentMap =
    isTournamentRace &&
    tournamentActive?.status === "active" &&
    currentTournamentRound?.mapSlug === routeSlug;

  // Auto-submit time on race finish for leaderboard
  useEffect(() => {
    if (!finished || submittedFor === restartToken || invalid) return;
    if (checkpointIndex < requiredCheckpoints) return;
    let activeUser = user;
    if (!activeUser) {
      const guestResult = useAuthStore.getState().continueAsGuest();
      if (!guestResult.ok) return;
      activeUser = useAuthStore.getState().user;
    }
    if (!activeUser) return;
    const result = submitAttempt({
      routeId,
      routeSlug,
      userId: activeUser.id,
      displayName: activeUser.displayName,
      isGuest: activeUser.mode === "guest",
      completionTimeMs: elapsedMs,
      checkpointCount: checkpointIndex,
      requiredCheckpointCount: requiredCheckpoints,
      isValidClient: true,
      invalidReason: null,
    });
    setSubmittedFor(restartToken);
    if (result.ok) {
      const pb = useGameStore.getState().personalBestMs;
      const isPb =
        pb === null || result.attempt.completionTimeMs < pb;
      if (isPb) {
        setPersonalBest(result.attempt.completionTimeMs);
      }
      const reward = raceReward({
        finished: true,
        valid: true,
        personalBest: isPb && pb !== null ? true : pb === null,
      });
      useProgressionStore.getState().awardRace(reward.xp, reward.coins);
      const newAchievements = useAchievementStore.getState().recordRace({
        finished: true,
        valid: true,
        position: 1,
        mapSlug: routeSlug,
        online: false,
        personalBest: isPb,
        driftSeconds: 0,
        topSpeed: 0,
        cleanLap: !useGameStore.getState().invalid,
      });
      for (const a of newAchievements) {
        useProgressionStore.getState().awardAchievement(a.coinReward, a.xpReward);
      }
      useChallengesStore.getState().progressChallenge("racesCompleted", 1);
      useChallengesStore.getState().progressChallenge("races_today", 1);
    }
  }, [finished, restartToken]);

  // Intro fly-through and start lights own the screen.
  if (countdown !== null || introActive) {
    return null;
  }

  // Garage and the post-car session lobby own the screen before lights.
  if ((!garageConfirmed || !sessionConfirmed) && !finished) {
    return null;
  }

  if (!paused && !finished) {
    return null;
  }

  function handleHotLapSubmit() {
    const state = getHotLapState();
    if (state.locked) {
      setHotLapSubmitted(true);
      return;
    }
    const result = submitHotLapTime(elapsedMs);
    setHotLapResult(result);
    setHotLapSubmitted(true);
    useProgressionStore.getState().awardRace(0, result.coinsAwarded);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("driveanywhere-hotlap-submitted", { detail: result }),
      );
    }
  }

  function ensureUser() {
    if (user) return user;
    const result = continueAsGuest();
    if (!result.ok) return null;
    return useAuthStore.getState().user;
  }

  function handleTournamentSubmit() {
    if (!isCurrentTournamentMap || tournamentSubmitted) return;
    const result = submitRoundTime(elapsedMs);
    if (result.ok) {
      setTournamentSubmitted(true);
      if (result.tournamentComplete) {
        setTournamentMsg(
          result.coinsWon > 0
            ? `Tournament complete! You won ${result.coinsWon.toLocaleString()} coins.`
            : "Tournament complete! Go to Tournament Hub to see your result.",
        );
      } else {
        setTournamentMsg(`Round ${currentTournamentRound?.roundNumber ?? "?"} submitted! Return to the Tournament Hub for next round.`);
      }
    } else {
      setTournamentMsg(`Error: ${result.reason}`);
    }
  }

  function handleSubmit() {
    const activeUser = ensureUser();
    if (!activeUser) {
      setSubmitMessage("Could not create a guest session.");
      return;
    }

    const result = submitAttempt({
      routeId,
      routeSlug,
      userId: activeUser.id,
      displayName: activeUser.displayName,
      isGuest: activeUser.mode === "guest",
      completionTimeMs: elapsedMs,
      checkpointCount: checkpointIndex,
      requiredCheckpointCount: requiredCheckpoints,
      isValidClient: !invalid,
      invalidReason,
    });

    setSubmittedFor(restartToken);
    if (!result.ok) {
      setSubmitMessage(`Rejected: ${result.message}`);
      return;
    }

    if (
      personalBestMs === null ||
      result.attempt.completionTimeMs < personalBestMs
    ) {
      setPersonalBest(result.attempt.completionTimeMs);
    }
    setSubmitMessage("Valid run saved to this browser.");
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink-975/75 p-4 backdrop-blur-sm da-fade-in">
      <div className="w-full max-w-md rounded-xl border border-line bg-panel p-6 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          {finished ? "Run complete" : started ? "Paused" : "Ready"}
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">
          {finished ? formatLapTime(elapsedMs) : routeName}
        </h2>
        <p className="mt-2 text-sm text-mist">
          {finished
            ? invalid
              ? `Invalid run: ${invalidReason ?? "rules broken"}`
              : "Submit your time to the local leaderboard, or restart."
            : started
              ? "Press Esc to resume. Reset to last checkpoint keeps your run; Restart begins a new race from the garage."
              : "The clock starts when you cross the first checkpoint gate. Hold W to accelerate."}
        </p>

        {finished && personalBestMs ? (
          <p className="mt-2 font-mono text-sm text-accent-bright">
            PB {formatLapTime(personalBestMs)}
          </p>
        ) : null}

        <div className="mt-6 space-y-3 rounded-lg border border-line bg-ink-950/50 p-4 text-sm text-mist">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            Controls
          </p>
          <ul className="space-y-1">
            <li>W / ↑ — accelerate</li>
            <li>S / ↓ — brake / reverse</li>
            <li>A D / ← → — steer</li>
            <li>Space — handbrake / drift (hold + steer)</li>
            <li>R — reset to last checkpoint · C — camera · Esc — pause</li>
            <li>Mouse drag — look around · Wheel — camera distance</li>
          </ul>
        </div>

        <fieldset className="mt-4 rounded-lg border border-line bg-ink-950/50 p-4">
          <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            Graphics
          </legend>
          <div className="mt-1 flex gap-2">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuality(option.value)}
                aria-pressed={quality === option.value}
                className={
                  quality === option.value
                    ? "flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink-975"
                    : "flex-1 rounded-md border border-line px-3 py-2 text-sm text-fog transition hover:text-white"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-fog">
            Changing preset reloads the 3D scene. Saved to this browser.
          </p>
          <label
            htmlFor="pause-engine-volume"
            className="mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-fog"
          >
            Engine volume
          </label>
          <input
            id="pause-engine-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(engineVolume * 100)}
            onChange={(event) =>
              setEngineVolume(Number(event.target.value) / 100)
            }
            className="mt-2 w-full"
          />
        </fieldset>

        {submitMessage && submitted ? (
          <p className="mt-4 text-sm text-emerald-300" role="status">
            {submitMessage}
          </p>
        ) : null}

        {isHotLap && finished && hotLapResult && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-ink-950/50 p-4" role="status">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              ⚡ Hot Lap Result
            </p>
            <p className="mt-1 font-display text-2xl text-white">
              Rank #{hotLapResult.rank}{" "}
              <span className="font-mono text-sm text-mist">of {hotLapResult.totalEntrants}</span>
            </p>
            <p className="mt-1 font-mono text-sm text-accent-bright">
              +{hotLapResult.coinsAwarded} coins awarded
            </p>
          </div>
        )}

        {isHotLap && finished && hotLapSubmitted && !hotLapResult && (
          <p className="mt-4 text-sm text-fog" role="status">
            Hot lap already submitted today — no retry allowed.
          </p>
        )}

        {isCurrentTournamentMap && finished && (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              🏆 Tournament · Round {currentTournamentRound?.roundNumber ?? "?"} of 3
            </p>
            {tournamentMsg ? (
              <p className="mt-1 text-sm text-emerald-300">{tournamentMsg}</p>
            ) : (
              <p className="mt-1 text-xs text-amber-400/70">
                Submit your time to the tournament
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {!finished ? (
            <Button
              type="button"
              onClick={() => (started ? setPaused(false) : beginCountdown())}
            >
              {started ? "Resume" : "Start driving"}
            </Button>
          ) : isHotLap ? (
            <Button
              type="button"
              onClick={handleHotLapSubmit}
              disabled={hotLapSubmitted}
            >
              {hotLapSubmitted ? "Submitted" : "⚡ Submit Hot Lap Time"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitted && !invalid}
            >
              {submitted ? "Submitted" : "Submit time"}
            </Button>
          )}
          {isCurrentTournamentMap && finished && !tournamentSubmitted && (
            <Button
              type="button"
              onClick={handleTournamentSubmit}
            >
              🏆 Submit to Tournament (Round {currentTournamentRound?.roundNumber ?? "?"})
            </Button>
          )}
          {started && !finished ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => requestCheckpointReset()}
            >
              Last checkpoint
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSubmitMessage(null);
              requestRestart();
            }}
          >
            {finished ? "Race again" : "Restart race"}
          </Button>
          <Link
            href={`/routes/${routeSlug}`}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line px-5 text-sm text-fog hover:text-white"
          >
            Exit
          </Link>
          {tournamentSubmitted && (
            <Link
              href="/tournament"
              className="inline-flex h-11 items-center justify-center rounded-md border border-amber-400/40 bg-amber-400/10 px-5 text-sm text-amber-400 hover:bg-amber-400/20"
            >
              🏆 Tournament Hub
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
