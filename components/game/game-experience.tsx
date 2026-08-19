"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { GameHud } from "@/components/game/game-hud";
import { Minimap } from "@/components/game/minimap";
import { MobileDriveWarning } from "@/components/game/mobile-drive-warning";
import { PauseMenu } from "@/components/game/pause-menu";
import { RaceCountdown } from "@/components/game/race-countdown";
import { RaceSetupOverlay } from "@/components/game/race-setup-overlay";
import { RouteIntroOverlay } from "@/components/game/route-intro-overlay";
import { VehicleSelect } from "@/components/game/vehicle-select";
import { getPersonalBest } from "@/lib/database/mock/attempts";
import { resetTelemetry } from "@/lib/game/telemetry";
import type { RaceSetup } from "@/lib/game/race-setup";
import type { RouteData } from "@/lib/validation/route-data";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { useSettingsStore } from "@/stores/settings-store";

const GameCanvas = dynamic(
  () => import("@/components/game/game-canvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-ink-975">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-mist">
            Loading 3D engine
          </p>
        </div>
      </div>
    ),
  },
);

interface GameExperienceProps {
  /** Geometry resolved on the server, so there is nothing to fetch here. */
  route: RouteData;
  routeName: string;
  routeSlug: string;
  raceSetup: RaceSetup;
}

export function GameExperience({
  route,
  routeName,
  routeSlug,
  raceSetup,
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

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

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
      state.togglePause();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
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
      garageConfirmed: false,
      sessionConfirmed: false,
    });
    hydrateRaceSetup(raceSetup);

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
      <div className="flex h-[100dvh] items-center justify-center bg-ink-975 text-mist">
        <span className="font-mono text-xs uppercase tracking-[0.3em]">
          Preparing route
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink-975">
      <GameCanvas paused={paused || finished} route={route} />
      <GameHud routeName={routeName} />
      <RouteIntroOverlay
        routeName={routeName}
        city={route.city}
        country={route.country}
      />
      <RaceCountdown />

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden md:block">
        <Minimap route={route} />
      </div>

      <PauseMenu
        routeSlug={routeSlug}
        routeName={routeName}
        routeId={route.id}
        requiredCheckpoints={route.checkpoints.length}
      />
      {!garageConfirmed && !finished && countdown === null ? (
        <VehicleSelect routeName={routeName} />
      ) : null}
      {garageConfirmed &&
      !sessionConfirmed &&
      !finished &&
      countdown === null &&
      !introActive ? (
        <RaceSetupOverlay routeName={routeName} routeId={route.id} />
      ) : null}
      <MobileDriveWarning routeSlug={routeSlug} />
      <p className="pointer-events-none absolute bottom-3 left-4 z-10 font-mono text-[10px] text-white/40">
        {route.dataAttribution}
      </p>
    </div>
  );
}
