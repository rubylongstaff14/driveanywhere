"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { GameHud } from "@/components/game/game-hud";
import { Minimap } from "@/components/game/minimap";
import { MobileDriveWarning } from "@/components/game/mobile-drive-warning";
import { MobileControls } from "@/components/game/mobile-controls";
import { PauseMenu } from "@/components/game/pause-menu";
import { RaceCountdown } from "@/components/game/race-countdown";
import { RaceSetupOverlay } from "@/components/game/race-setup-overlay";
import { RouteIntroOverlay } from "@/components/game/route-intro-overlay";
import { OnlineRaceSync } from "@/components/multiplayer/online-race-sync";
import { OnlineResultsOverlay } from "@/components/multiplayer/online-results-overlay";
import { RaceChat } from "@/components/multiplayer/race-chat";
import { RacePositionsHud } from "@/components/multiplayer/race-positions-hud";
import { SpectatorHud } from "@/components/multiplayer/spectator-hud";
import { TauntWheel } from "@/components/multiplayer/taunt-wheel";
import { CircuitBoot } from "@/components/game/circuit-boot";
import { CinematicLoader } from "@/components/game/cinematic-loader";
import { VehicleSelect } from "@/components/game/vehicle-select";
import { AchievementToast } from "@/components/game/achievement-toast";
import { ChallengesHud } from "@/components/game/challenges-hud";
import { LagHud } from "@/components/game/lag-hud";
import { PhotoMode } from "@/components/game/photo-mode";
import { getPersonalBest } from "@/lib/database/mock/attempts";
import { resetTelemetry } from "@/lib/game/telemetry";
import type { RaceSetup } from "@/lib/game/race-setup";
import type { RouteData } from "@/lib/validation/route-data";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { useProgressionStore } from "@/stores/progression-store";
import { useAchievementStore } from "@/stores/achievement-store";
import { useChallengesStore } from "@/stores/challenges-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTournamentStore } from "@/stores/tournament-store";

const GameCanvas = dynamic(
  () => import("@/components/game/game-canvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <CinematicLoader
        title="Loading 3D engine"
        subtitle="Warming the renderer and physics"
      />
    ),
  },
);

interface GameExperienceProps {
  /** Geometry resolved on the server, so there is nothing to fetch here. */
  route: RouteData;
  routeName: string;
  routeSlug: string;
  raceSetup: RaceSetup;
  isTournamentRace?: boolean;
}

export function GameExperience({
  route,
  routeName,
  routeSlug,
  raceSetup,
  isTournamentRace = false,
}: GameExperienceProps) {
  const paused = useGameStore((s) => s.paused);
  const finished = useGameStore((s) => s.finished);
  const garageConfirmed = useGameStore((s) => s.garageConfirmed);
  const sessionConfirmed = useGameStore((s) => s.sessionConfirmed);
  const introActive = useGameStore((s) => s.introActive);
  const countdown = useGameStore((s) => s.countdown);
  const resetRunState = useGameStore((s) => s.resetRunState);
  const hydrateRaceSetup = useGameStore((s) => s.hydrateRaceSetup);
  const setPersonalBest = useGameStore((s) => s.setPersonalBest);
  const user = useAuthStore((s) => s.user);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateProgression = useProgressionStore((s) => s.hydrate);
  const hydrateAchievements = useAchievementStore((s) => s.hydrate);
  const hydrateChallenges = useChallengesStore((s) => s.hydrate);
  const hydrateTournament = useTournamentStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    hydrateProgression();
    hydrateAchievements();
    hydrateChallenges();
    hydrateTournament();
  }, [
    hydrateSettings,
    hydrateProgression,
    hydrateAchievements,
    hydrateChallenges,
    hydrateTournament,
  ]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || event.repeat) return;
      const state = useGameStore.getState();
      if (
        state.countdown !== null ||
        state.introActive ||
        state.finished ||
        !state.garageConfirmed ||
        !state.sessionConfirmed
      ) {
        return;
      }
      event.preventDefault();
      if (state.photoMode) {
        state.setPhotoMode(false);
        return;
      }
      state.togglePause();
    };
    const onKeyP = (event: KeyboardEvent) => {
      if (event.code !== "KeyP" || event.repeat) return;
      const state = useGameStore.getState();
      if (!state.started || state.countdown !== null) return;
      state.setPhotoMode(!state.photoMode);
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("keydown", onKeyP);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("keydown", onKeyP);
    };
  }, []);

  useEffect(() => {
    resetTelemetry();
    useGameStore.setState({
      checkpointTotal: route.checkpoints.length,
      checkpointIndex: 0,
      paused: true,
      started: false,
      finished: false,
      countdown: null,
      introActive: false,
      garageConfirmed: raceSetup.mode === "online",
      sessionConfirmed: false,
    });
    hydrateRaceSetup(raceSetup);
    if (raceSetup.mode === "online") {
      useGameStore.getState().confirmSession(raceSetup);
    }

    return () => {
      resetRunState();
      resetTelemetry();
    };
  }, [
    hydrateRaceSetup,
    raceSetup.aiCount,
    raceSetup.difficulty,
    raceSetup.mode,
    raceSetup.ghost,
    raceSetup.weather,
    resetRunState,
    route.slug,
  ]);

  useEffect(() => {
    setPersonalBest(user ? getPersonalBest(user.id, route.id) : null);
  }, [route.id, setPersonalBest, user]);

  // Renderer settings are read once at mount, so wait for the stored preset.
  if (!settingsHydrated) {
    return (
      <CinematicLoader title={routeName} subtitle="Reading graphics preset" />
    );
  }

  return (
    <div className="bg-ink-975 relative h-[100dvh] w-full overflow-hidden">
      <GameCanvas paused={paused || finished} route={route} />
      <CircuitBoot routeName={routeName} city={route.city} />
      <GameHud
        routeName={routeName}
        cityVersion={route.metadata?.version}
        isTournamentRace={isTournamentRace}
      />
      <RouteIntroOverlay
        routeName={routeName}
        city={route.city}
        country={route.country}
      />
      <RaceCountdown />
      {raceSetup.mode === "online" && <OnlineRaceSync route={route} />}
      {raceSetup.mode === "online" && <OnlineResultsOverlay route={route} />}
      {raceSetup.mode === "online" && <RaceChat />}
      {raceSetup.mode === "online" && <RacePositionsHud />}
      {raceSetup.mode === "online" && <TauntWheel />}
      {raceSetup.mode === "online" && <SpectatorHud />}

      <div className="pointer-events-none absolute right-4 bottom-4 z-10 hidden md:block">
        <Minimap route={route} />
      </div>

      <PauseMenu
        routeSlug={routeSlug}
        routeName={routeName}
        routeId={route.id}
        requiredCheckpoints={route.checkpoints.length}
        isTournamentRace={isTournamentRace}
      />
      <AchievementToast />
      <ChallengesHud />
      {raceSetup.mode === "online" && <LagHud />}
      {!garageConfirmed &&
      !finished &&
      countdown === null &&
      raceSetup.mode !== "online" ? (
        <VehicleSelect routeName={routeName} />
      ) : null}
      {garageConfirmed &&
      !sessionConfirmed &&
      !finished &&
      countdown === null &&
      !introActive &&
      raceSetup.mode !== "online" ? (
        <RaceSetupOverlay routeName={routeName} routeId={route.id} />
      ) : null}
      <MobileDriveWarning routeSlug={routeSlug} />
      <MobileControls />
      <p className="pointer-events-none absolute bottom-3 left-4 z-10 font-mono text-[10px] text-white/40">
        {route.dataAttribution}
      </p>
    </div>
  );
}
