"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { LandmarkNameTag } from "@/components/game/scene/landmarks";
import type { FacadeMaps } from "@/lib/game/building-textures";
import type { LandmarkIdentity } from "@/lib/game/landmark-identity";
import {
  renderRegionalIconicBody,
  resolveRegionalIconicKind,
  type RegionalIconicKind,
} from "@/components/game/scene/iconic-towers-regional";

/**
 * Full-body iconic tower meshes — distinctive silhouettes instead of extruded
 * boxes. Heights are game-readable; proportions follow the real landmarks.
 */

export type IconicKind =
  | "burj-khalifa"
  | "burj-al-arab"
  | "cayan-twist"
  | "emirates-twin"
  | "address-downtown"
  | "marina-101"
  | "princess-tower"
  | "ailamas"
  | "difc-gate"
  | "museum-future"
  | "frame-dubai"
  | "glass-needle"
  | "setback-glass"
  | "empire-state"
  | "chrysler"
  | "one-wtc"
  | "flatiron"
  | "citigroup-slant"
  | "woolworth"
  | "rockefeller"
  | "seagram"
  | "lever-house"
  | "432-park"
  | "hearst"
  | "metlife"
  | "brooklyn-bridge-tower"
  | "statue-liberty"
  | "art-deco-crown"
  | "glass-slab-tall"
  | "mi6-ziggurat"
  | "millbank-cylinder"
  | "classical-palace"
  | "portland-stone"
  | "obelisk"
  | "oxo-tower"
  | "shell-mex"
  | "national-theatre"
  | "station-shed"
  | "canary-pyramid"
  | "canary-halo"
  | "canary-diagrid"
  | "egypt-pylon"
  | RegionalIconicKind;

const NAME_TO_KIND: Record<string, IconicKind> = {
  // Dubai
  "Burj Khalifa": "burj-khalifa",
  "Burj Al Arab": "burj-al-arab",
  "Cayan Tower": "cayan-twist",
  "Emirates Tower One": "emirates-twin",
  "Emirates Tower Two": "emirates-twin",
  "Address Downtown": "address-downtown",
  "Marina 101": "marina-101",
  "Princess Tower": "princess-tower",
  "Address Beach Resort": "ailamas",
  "The Twisted Tower": "cayan-twist",
  "Gate Village DIFC": "difc-gate",
  "Museum of the Future": "museum-future",
  "Dubai Frame": "frame-dubai",
  "JW Marriott Marquis": "glass-needle",
  "Elite Residence": "glass-needle",
  "Ocean Heights": "setback-glass",
  "HHHR Tower": "setback-glass",
  "Almas Tower": "glass-needle",
  "Torch Tower": "glass-needle",
  "Cielo Tower": "setback-glass",
  "Damac Heights": "setback-glass",
  "Emirates Crown": "setback-glass",
  "23 Marina": "marina-101",
  "The Palm Tower": "glass-needle",
  "Atlantis The Royal": "ailamas",
  "One Za'abeel": "frame-dubai",
  "ICD Brookfield Place": "setback-glass",
  "Boulevard Plaza 1": "setback-glass",
  "Boulevard Plaza 2": "setback-glass",
  "The Index": "glass-needle",
  "Rose Rayhaan": "glass-needle",
  "Burj Vista 1": "setback-glass",
  "Burj Vista 2": "setback-glass",

  // New York
  "Empire State Building": "empire-state",
  "Chrysler Building": "chrysler",
  "One World Trade Center": "one-wtc",
  Flatiron: "flatiron",
  "Citigroup Center": "citigroup-slant",
  "Woolworth Building": "woolworth",
  "30 Rockefeller Plaza": "rockefeller",
  "Seagram Building": "seagram",
  "Lever House": "lever-house",
  "432 Park Avenue": "432-park",
  "Hearst Tower": "hearst",
  "MetLife Building": "metlife",
  "Brooklyn Bridge": "brooklyn-bridge-tower",
  "Statue of Liberty": "statue-liberty",
  "One Vanderbilt": "art-deco-crown",
  "Central Park Tower": "432-park",
  "111 West 57th Street": "glass-needle",
  "Bank of America Tower": "art-deco-crown",
  "4 Times Square": "glass-slab-tall",
  "New York Times Building": "glass-slab-tall",
  "8 Spruce Street": "setback-glass",
  "56 Leonard": "setback-glass",
  "VIA 57 West": "flatiron",
  "The Edge": "glass-slab-tall",
  "One57": "glass-needle",
  "15 Hudson Yards": "setback-glass",
  "30 Hudson Yards": "glass-needle",
  "Goldman Sachs Tower": "glass-slab-tall",
  "40 Wall Street": "art-deco-crown",
  "70 Pine Street": "art-deco-crown",
  "120 Wall Street": "glass-slab-tall",
  "American Copper Buildings": "setback-glass",
  "The Spiral": "setback-glass",

  // London — Westminster / Embankment
  "MI6 Building": "mi6-ziggurat",
  "Millbank Tower": "millbank-cylinder",
  "Foreign Office": "classical-palace",
  "Treasury Building": "classical-palace",
  "Portcullis House": "portland-stone",
  "Tate Britain": "classical-palace",
  "Lambeth Palace": "classical-palace",
  "Methodist Central Hall": "portland-stone",
  "Scotland Yard": "setback-glass",
  "Churchill War Rooms": "portland-stone",
  "Somerset House": "classical-palace",
  "Savoy Hotel": "portland-stone",
  "Shell Mex House": "shell-mex",
  "Cleopatra's Needle": "obelisk",
  "National Theatre": "national-theatre",
  "Royal Festival Hall": "national-theatre",
  "Oxo Tower": "oxo-tower",
  "Unilever House": "classical-palace",
  "Temple Church": "portland-stone",
  "Waterloo Station": "station-shed",
  "BT Tower": "glass-needle",
  "Hungerford Bridge": "brooklyn-bridge-tower",
  "Banqueting House": "classical-palace",
  "Admiralty Arch": "classical-palace",
  "County Hall": "classical-palace",
  "St Paul's Cathedral": "portland-stone",
  "The Shard": "glass-needle",
  "Tower Bridge": "brooklyn-bridge-tower",
  "Globe Theatre": "portland-stone",
  "Tate Modern": "national-theatre",
  "City Hall": "setback-glass",
  "Southwark Cathedral": "portland-stone",
  "Battersea Power Station": "national-theatre",
  "Vauxhall Tower": "glass-needle",
  "St Thomas' Hospital": "portland-stone",
  "Imperial War Museum": "classical-palace",
  "Barbican Towers": "setback-glass",
  "Centre Point": "glass-slab-tall",
  "Senate House": "portland-stone",

  // Canary flagships → fuller bodies
  "One Canada Square": "canary-pyramid",
  "HSBC UK": "canary-halo",
  "Newfoundland Quay": "canary-diagrid",
  "Landmark Pinnacle": "glass-needle",
  Citi: "setback-glass",
  "JP Morgan": "glass-slab-tall",
  Barclays: "setback-glass",

  // Egypt named props
  "Valley Temple": "egypt-pylon",
  "Sphinx Temple": "egypt-pylon",
  "Mena House": "egypt-pylon",
  "Citadel of Saladin": "egypt-pylon",
  "Grand Egyptian Museum": "setback-glass",
  "Western Necropolis": "egypt-pylon",
  "Khafre Temple Annex": "egypt-pylon",
  "Osiris Pavilion": "egypt-pylon",
};

export function resolveIconicKind(name?: string): IconicKind | null {
  if (!name) return null;
  const regional = resolveRegionalIconicKind(name);
  if (regional) return regional;
  if (NAME_TO_KIND[name]) return NAME_TO_KIND[name];
  const lower = name.toLowerCase();
  if (lower.includes("burj khalifa")) return "burj-khalifa";
  if (lower.includes("burj al arab")) return "burj-al-arab";
  if (lower.includes("cayan") || lower.includes("twisted")) return "cayan-twist";
  if (lower.includes("empire state")) return "empire-state";
  if (lower.includes("chrysler")) return "chrysler";
  if (lower.includes("world trade") || lower.includes("one wtc")) return "one-wtc";
  if (lower.includes("flatiron")) return "flatiron";
  if (lower.includes("citigroup") || lower.includes("citicorp")) return "citigroup-slant";
  if (lower.includes("woolworth")) return "woolworth";
  if (lower.includes("rockefeller") || lower.includes("30 rock")) return "rockefeller";
  if (lower.includes("statue of liberty")) return "statue-liberty";
  if (lower.includes("brooklyn bridge")) return "brooklyn-bridge-tower";
  if (lower.includes("museum of the future")) return "museum-future";
  if (lower.includes("dubai frame") || lower.includes("za'abeel") || lower.includes("zaabeel")) {
    return "frame-dubai";
  }
  if (lower.includes("432 park") || lower.includes("central park tower")) return "432-park";
  if (lower.includes("hearst")) return "hearst";
  if (lower.includes("mi6") || lower.includes("vauxhall cross")) return "mi6-ziggurat";
  if (lower.includes("millbank")) return "millbank-cylinder";
  if (lower.includes("cleopatra")) return "obelisk";
  if (lower.includes("oxo")) return "oxo-tower";
  if (lower.includes("shell mex")) return "shell-mex";
  if (lower.includes("national theatre") || lower.includes("festival hall") || lower.includes("tate modern") || lower.includes("battersea")) {
    return "national-theatre";
  }
  if (
    lower.includes("chalet") ||
    lower.includes("berghaus") ||
    lower.includes("gasthof") ||
    lower.includes("hütte") ||
    lower.includes("hut") ||
    lower.includes("lodge")
  ) {
    return "alpine-chalet";
  }
  if (
    lower.includes("gornergrat") ||
    lower.includes("bergstation") ||
    lower.includes("matterhorn station") ||
    lower.includes("sugarloaf mountain station")
  ) {
    return "alpine-cable-station";
  }
  if (lower.includes("cristo")) return "cristo-redentor";
  if (lower.includes("museum of tomorrow")) return "rio-museum-tomorrow";
  if (lower.includes("lapa arch")) return "lapa-arches";
  if (lower.includes("metropolitan cathedral")) return "rio-cathedral";
  if (lower.includes("edificio italia")) return "edificio-italia";
  if (lower.includes("tokyo tower")) return "tokyo-tower";
  if (lower.includes("shibuya 109")) return "shibuya-109";
  if (lower.includes("cocoon")) return "cocoon-tower";
  if (lower.includes("docomo")) return "docomo-clock";
  if (lower.includes("metropolitan government")) return "tmgb-twin";
  if (lower.includes("waterloo") || (lower.includes("station") && !lower.includes("berg"))) {
    return "station-shed";
  }
  if (lower.includes("canada square")) return "canary-pyramid";
  if (lower.includes("hsbc")) return "canary-halo";
  if (lower.includes("newfoundland")) return "canary-diagrid";
  if (lower.includes("valley temple") || lower.includes("sphinx temple") || lower.includes("citadel") || lower.includes("necropolis") || lower.includes("pylon")) {
    return "egypt-pylon";
  }
  if (
    lower.includes("foreign office") ||
    lower.includes("treasury") ||
    lower.includes("somerset") ||
    lower.includes("lambeth") ||
    lower.includes("banqueting") ||
    lower.includes("admiralty") ||
    lower.includes("unilever") ||
    lower.includes("tate britain") ||
    lower.includes("imperial war")
  ) {
    return "classical-palace";
  }
  return null;
}

const TowerMapsCtx = createContext<FacadeMaps | null>(null);

function GlassFace({
  color,
  metalness = 0.28,
  roughness = 0.22,
}: {
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const maps = useContext(TowerMapsCtx);
  return (
    <meshStandardMaterial
      color={color}
      map={maps?.color}
      normalMap={maps?.normal}
      normalScale={[0.35, 0.35]}
      emissiveMap={maps?.emissive}
      emissive="#f0d8a0"
      emissiveIntensity={maps ? 0.42 : 0.08}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={1.15}
      transparent={!maps}
      opacity={maps ? 1 : 0.92}
    />
  );
}

function SolidFace({
  color,
  metalness = 0.18,
  roughness = 0.42,
}: {
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const maps = useContext(TowerMapsCtx);
  return (
    <meshStandardMaterial
      color={color}
      map={maps?.color}
      normalMap={maps?.normal}
      normalScale={[0.28, 0.28]}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={0.85}
    />
  );
}

function glassMat(color: string, metalness = 0.28, roughness = 0.22) {
  return <GlassFace color={color} metalness={metalness} roughness={roughness} />;
}

function solidMat(color: string, metalness = 0.18, roughness = 0.42) {
  return <SolidFace color={color} metalness={metalness} roughness={roughness} />;
}

/** Stepped Y-plan needle — Burj Khalifa tri-lobed silhouette. */
function BurjKhalifaMesh({ h, paint }: { h: number; paint: string }) {
  const wings = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  const steps = [0.12, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92];
  return (
    <group>
      {wings.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          {steps.map((t, i) => {
            const prev = i === 0 ? 0 : steps[i - 1];
            const segH = (t - prev) * h;
            const w = h * (0.13 - i * 0.013);
            return (
              <mesh
                key={t}
                position={[w * 0.52, prev * h + segH / 2, 0]}
                castShadow
              >
                <boxGeometry args={[w, segH, w * 0.48]} />
                {glassMat(paint, 0.46, 0.14)}
              </mesh>
            );
          })}
        </group>
      ))}
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <cylinderGeometry args={[h * 0.024, h * 0.042, h, 12]} />
        {glassMat("#c5d4e2", 0.52, 0.16)}
      </mesh>
      {[0.2, 0.38, 0.56, 0.74].map((t) => (
        <mesh key={t} position={[0, h * t, 0]}>
          <cylinderGeometry args={[h * 0.05, h * 0.055, h * 0.012, 12]} />
          {solidMat("#d8e4ee", 0.55, 0.25)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.97, 0]} castShadow>
        <coneGeometry args={[h * 0.01, h * 0.12, 10]} />
        {solidMat("#e8eef4", 0.78, 0.2)}
      </mesh>
    </group>
  );
}

/** Sail-shaped hotel — Burj Al Arab mast, sail glass, helipad. */
function BurjAlArabMesh({ h, paint, accent }: { h: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <cylinderGeometry args={[h * 0.018, h * 0.022, h, 8]} />
        {solidMat("#e8eef4", 0.55, 0.25)}
      </mesh>
      <mesh position={[h * 0.09, h * 0.48, 0]} rotation={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[h * 0.28, h * 0.9, h * 0.035]} />
        {glassMat("#6eb4e8", 0.22, 0.16)}
      </mesh>
      <mesh position={[h * 0.04, h * 0.5, 0.02]} rotation={[0, 0, -0.22]} castShadow>
        <boxGeometry args={[h * 0.16, h * 0.82, h * 0.03]} />
        {glassMat(paint, 0.28, 0.18)}
      </mesh>
      <mesh position={[-h * 0.015, h * 0.46, 0]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[h * 0.05, h * 0.88, h * 0.04]} />
        {solidMat(accent, 0.35, 0.28)}
      </mesh>
      <mesh position={[0, h * 0.97, h * 0.05]} castShadow>
        <boxGeometry args={[h * 0.16, h * 0.018, h * 0.14]} />
        {solidMat("#f4f7fa", 0.4, 0.3)}
      </mesh>
      <mesh position={[0, h * 0.28, h * 0.04]}>
        <boxGeometry args={[h * 0.08, h * 0.1, 0.35]} />
        {solidMat("#c9a227", 0.65, 0.28)}
      </mesh>
    </group>
  );
}

/** Stacked floors with progressive yaw — Cayan / Infinity twist. */
function TwistTowerMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  const floors = 14;
  return (
    <group>
      {Array.from({ length: floors }, (_, i) => {
        const t = i / floors;
        const yaw = t * Math.PI * 0.85;
        const yy = (t + 0.5 / floors) * h;
        const s = 1 - t * 0.18;
        return (
          <mesh key={i} position={[0, yy, 0]} rotation={[0, yaw, 0]} castShadow>
            <boxGeometry args={[w * s, h / floors + 0.4, w * s * 0.92]} />
            {glassMat(paint, 0.4, 0.2)}
          </mesh>
        );
      })}
      <mesh position={[0, h + 4, 0]}>
        <boxGeometry args={[w * 0.45, 6, w * 0.45]} />
        {solidMat("#d8e4ec", 0.5, 0.3)}
      </mesh>
    </group>
  );
}

function EmpireStateMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.1, 0]} castShadow>
        <boxGeometry args={[w * 1.35, h * 0.2, w * 1.22]} />
        {solidMat("#9a9084", 0.1, 0.55)}
      </mesh>
      <mesh position={[0, h * 0.28, 0]} castShadow>
        <boxGeometry args={[w * 1.12, h * 0.22, w * 1.02]} />
        {solidMat(paint, 0.12, 0.48)}
      </mesh>
      {[0.18, 0.28, 0.4, 0.52, 0.64, 0.76, 0.86].map((t, i) => {
        const s = 1.08 - i * 0.1;
        return (
          <mesh key={t} position={[0, h * t, 0]}>
            <boxGeometry args={[w * s * 1.04, h * 0.01, w * s * 0.96]} />
            {solidMat("#c4b8a4", 0.12, 0.5)}
          </mesh>
        );
      })}
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w * 0.82, h * 0.26, w * 0.74]} />
        {solidMat(paint, 0.14, 0.44)}
      </mesh>
      <mesh position={[0, h * 0.7, 0]} castShadow>
        <boxGeometry args={[w * 0.52, h * 0.18, w * 0.46]} />
        {solidMat(paint, 0.16, 0.4)}
      </mesh>
      <mesh position={[0, h * 0.84, 0]} castShadow>
        <boxGeometry args={[w * 0.32, h * 0.1, w * 0.28]} />
        {solidMat(accent, 0.22, 0.36)}
      </mesh>
      <mesh position={[0, h * 0.93, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.85, h * 0.08, 10]} />
        {solidMat("#c8d0d8", 0.68, 0.26)}
      </mesh>
      <mesh position={[0, h * 1.06, 0]}>
        <cylinderGeometry args={[0.22, 0.42, h * 0.18, 8]} />
        {solidMat("#a8b4c0", 0.82, 0.18)}
      </mesh>
    </group>
  );
}

function ChryslerMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.32, 0]} castShadow>
        <boxGeometry args={[w * 1.05, h * 0.64, w * 0.92]} />
        {solidMat(paint, 0.22, 0.38)}
      </mesh>
      {[0.18, 0.3, 0.42, 0.54].map((t) => (
        <mesh key={t} position={[0, h * t, w * 0.47]}>
          <boxGeometry args={[w * 0.9, h * 0.018, 0.12]} />
          {solidMat("#d4c080", 0.45, 0.32)}
        </mesh>
      ))}
      {[0.7, 0.78, 0.85, 0.91, 0.96].map((t, i) => (
        <mesh key={t} position={[0, h * t, 0]} castShadow>
          <cylinderGeometry
            args={[w * (0.46 - i * 0.065), w * (0.52 - i * 0.065), h * 0.055, 10]}
          />
          {solidMat(accent, 0.58, 0.24)}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * w * 0.22, h * 0.78, 0]}
          rotation={[0, 0, side * 0.4]}
        >
          <boxGeometry args={[w * 0.28, h * 0.012, w * 0.04]} />
          {solidMat("#e8d090", 0.7, 0.22)}
        </mesh>
      ))}
      <mesh position={[0, h * 1.04, 0]}>
        <coneGeometry args={[w * 0.07, h * 0.12, 10]} />
        {solidMat("#e8d090", 0.75, 0.2)}
      </mesh>
    </group>
  );
}

function OneWtcMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[w * 1.05, h * 0.84, w * 1.05]} />
        {glassMat(paint, 0.4, 0.14)}
      </mesh>
      {/* Antennaspire cue */}
      <mesh position={[0, h * 0.92, 0]} castShadow>
        <cylinderGeometry args={[w * 0.12, w * 0.22, h * 0.12, 8]} />
        {solidMat("#c0ccd6", 0.65, 0.25)}
      </mesh>
      <mesh position={[0, h * 1.05, 0]}>
        <cylinderGeometry args={[0.5, 1.2, h * 0.16, 6]} />
        {solidMat("#d8e0e8", 0.8, 0.2)}
      </mesh>
    </group>
  );
}

function FlatironMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.5, 0]} castShadow rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[0.01, w * 0.55, h, 3]} />
        {solidMat(paint, 0.12, 0.48)}
      </mesh>
      {/* Limestone banding cue */}
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <mesh key={t} position={[0, h * t, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[w * 0.52 * (1 - t * 0.15), w * 0.54 * (1 - t * 0.15), 1.2, 3]} />
          {solidMat("#c8bca8", 0.1, 0.55)}
        </mesh>
      ))}
    </group>
  );
}

function CitigroupSlantMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w, h * 0.84, w * 0.9]} />
        {glassMat(paint, 0.35, 0.18)}
      </mesh>
      {/* 45° roof */}
      <mesh position={[0, h * 0.9, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[w * 0.95, w * 0.55, w * 0.88]} />
        {solidMat(accent, 0.25, 0.35)}
      </mesh>
      {/* Stilt columns */}
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x * w * 0.35, h * 0.08, z * w * 0.32]} castShadow>
            <cylinderGeometry args={[1.2, 1.6, h * 0.16, 8]} />
            {solidMat("#c8d0d6", 0.5, 0.3)}
          </mesh>
        )),
      )}
    </group>
  );
}

function SetbackGlassMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  const tiers = [0.22, 0.42, 0.62, 0.8, 0.95] as const;
  return (
    <group>
      {tiers.map((t, i) => {
        const prev = i === 0 ? 0 : tiers[i - 1];
        const seg = (t - prev) * h;
        const s = 1 - i * 0.1;
        return (
          <group key={t}>
            <mesh position={[0, prev * h + seg / 2, 0]} castShadow>
              <boxGeometry args={[w * s, seg, w * s * 0.88]} />
              {glassMat(paint, 0.32, 0.2)}
            </mesh>
            <mesh position={[0, t * h, 0]}>
              <boxGeometry args={[w * s * 1.04, Math.max(0.6, h * 0.008), w * s * 0.92]} />
              {solidMat("#b8c4ce", 0.35, 0.35)}
            </mesh>
          </group>
        );
      })}
      {/* Mechanical penthouse */}
      <mesh position={[0, h * 0.98, 0]} castShadow>
        <boxGeometry args={[w * 0.35, h * 0.04, w * 0.3]} />
        {solidMat("#8a96a0", 0.25, 0.5)}
      </mesh>
    </group>
  );
}

function GlassNeedleMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.02, 0]} castShadow>
        <boxGeometry args={[w * 0.85, h * 0.04, w * 0.85]} />
        {solidMat("#6a7884", 0.2, 0.55)}
      </mesh>
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w * 0.68, h * 0.92, w * 0.68]} />
        {glassMat(paint, 0.36, 0.16)}
      </mesh>
      {/* Vertical mullion cues */}
      {[-0.28, 0, 0.28].map((ox) => (
        <mesh key={ox} position={[w * ox * 0.68, h * 0.5, w * 0.34]}>
          <boxGeometry args={[0.35, h * 0.9, 0.2]} />
          {solidMat("#d0dce6", 0.45, 0.3)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.98, 0]} castShadow>
        <boxGeometry args={[w * 0.4, h * 0.04, w * 0.4]} />
        {solidMat("#c8d4de", 0.4, 0.32)}
      </mesh>
    </group>
  );
}

function MuseumFutureMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} rotation={[0.2, 0.4, 0.15]} castShadow>
        <torusGeometry args={[w * 0.55, w * 0.28, 16, 32]} />
        {solidMat(paint, 0.55, 0.22)}
      </mesh>
      <mesh position={[0, h * 0.45, 0]}>
        <torusGeometry args={[w * 0.35, w * 0.08, 12, 24]} />
        {solidMat(accent, 0.4, 0.25)}
      </mesh>
    </group>
  );
}

function FrameMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  const t = Math.max(4, w * 0.12);
  return (
    <group>
      <mesh position={[-w * 0.4, h * 0.5, 0]} castShadow>
        <boxGeometry args={[t, h, t]} />
        {solidMat(paint, 0.3, 0.35)}
      </mesh>
      <mesh position={[w * 0.4, h * 0.5, 0]} castShadow>
        <boxGeometry args={[t, h, t]} />
        {solidMat(paint, 0.3, 0.35)}
      </mesh>
      <mesh position={[0, h * 0.95, 0]} castShadow>
        <boxGeometry args={[w * 0.9, t, t]} />
        {solidMat(paint, 0.3, 0.35)}
      </mesh>
      <mesh position={[0, h * 0.08, 0]} castShadow>
        <boxGeometry args={[w * 0.9, t * 0.8, t]} />
        {solidMat(paint, 0.3, 0.35)}
      </mesh>
    </group>
  );
}

function StatueLibertyMesh({ h }: { h: number }) {
  const s = h / 90;
  return (
    <group>
      <mesh position={[0, 8 * s, 0]} castShadow>
        <cylinderGeometry args={[10 * s, 14 * s, 16 * s, 8]} />
        {solidMat("#5a7a68", 0.15, 0.55)}
      </mesh>
      <mesh position={[0, 28 * s, 0]} castShadow>
        <cylinderGeometry args={[5 * s, 7 * s, 28 * s, 10]} />
        {solidMat("#4a8a72", 0.2, 0.45)}
      </mesh>
      <mesh position={[0, 48 * s, 0]} castShadow>
        <sphereGeometry args={[6 * s, 12, 10]} />
        {solidMat("#4a8a72", 0.2, 0.45)}
      </mesh>
      <mesh position={[6 * s, 55 * s, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[1.2 * s, 1.5 * s, 22 * s, 6]} />
        {solidMat("#4a8a72", 0.2, 0.45)}
      </mesh>
      <mesh position={[0, 56 * s, 0]}>
        <cylinderGeometry args={[7 * s, 7 * s, 2 * s, 8]} />
        {solidMat("#c9a84a", 0.55, 0.3)}
      </mesh>
    </group>
  );
}

function BrooklynBridgeTowerMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <boxGeometry args={[w * 0.7, h * 0.8, w * 0.55]} />
        {solidMat(paint, 0.1, 0.55)}
      </mesh>
      {/* Twin gothic arches */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * w * 0.18, h * 0.55, 0]}>
          <torusGeometry args={[w * 0.16, w * 0.04, 8, 16, Math.PI]} />
          {solidMat("#d8d0c4", 0.15, 0.5)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <boxGeometry args={[w * 0.75, h * 0.12, w * 0.2]} />
        {solidMat(paint, 0.1, 0.5)}
      </mesh>
    </group>
  );
}

function HearstMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.12, 0]} castShadow>
        <boxGeometry args={[w * 1.1, h * 0.24, w]} />
        {solidMat("#c8bca8", 0.1, 0.55)}
      </mesh>
      {/* Diagrid shaft */}
      <mesh position={[0, h * 0.6, 0]} castShadow>
        <boxGeometry args={[w * 0.85, h * 0.72, w * 0.8]} />
        {glassMat(paint, 0.4, 0.16)}
      </mesh>
      {([0, Math.PI / 2] as const).map((yaw) => (
        <group key={yaw} rotation={[0, yaw, 0]}>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[0, h * 0.55, w * 0.42]}
              rotation={[0, 0, side * 0.55]}
            >
              <boxGeometry args={[0.9, h * 0.7, 0.4]} />
              {solidMat("#2a3440", 0.3, 0.4)}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Mi6Mesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      {[0.22, 0.42, 0.62, 0.8].map((t, i) => {
        const prev = i === 0 ? 0 : [0.22, 0.42, 0.62, 0.8][i - 1];
        const seg = (t - prev) * h;
        const s = 1 - i * 0.14;
        return (
          <mesh key={t} position={[0, prev * h + seg / 2, 0]} castShadow>
            <boxGeometry args={[w * s * 1.15, seg, w * s]} />
            {solidMat(paint, 0.25, 0.38)}
          </mesh>
        );
      })}
      <mesh position={[0, h * 0.9, 0]} castShadow>
        <boxGeometry args={[w * 0.45, h * 0.14, w * 0.4]} />
        {solidMat(accent, 0.45, 0.3)}
      </mesh>
      {/* Corner bastions */}
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x * w * 0.48, h * 0.18, z * w * 0.42]} castShadow>
            <boxGeometry args={[w * 0.18, h * 0.32, w * 0.18]} />
            {solidMat(paint, 0.22, 0.4)}
          </mesh>
        )),
      )}
    </group>
  );
}

function MillbankMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.48, 0]} castShadow>
        <cylinderGeometry args={[w * 0.38, w * 0.42, h * 0.96, 20]} />
        {solidMat(paint, 0.15, 0.42)}
      </mesh>
      {[0.25, 0.5, 0.75].map((t) => (
        <mesh key={t} position={[0, h * t, 0]}>
          <cylinderGeometry args={[w * 0.44, w * 0.44, 1.2, 20]} />
          {solidMat("#d8dde4", 0.2, 0.4)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.98, 0]} castShadow>
        <cylinderGeometry args={[w * 0.2, w * 0.32, h * 0.06, 16]} />
        {solidMat("#c8d0d8", 0.35, 0.35)}
      </mesh>
    </group>
  );
}

function ClassicalPalaceMesh({ h, w, d, paint, accent }: { h: number; w: number; d: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w * 1.2, h * 0.84, d]} />
        {solidMat(paint, 0.08, 0.55)}
      </mesh>
      {/* Cornice */}
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <boxGeometry args={[w * 1.28, h * 0.06, d * 1.08]} />
        {solidMat(accent, 0.12, 0.5)}
      </mesh>
      {/* Column rhythm on face */}
      {[-0.35, -0.12, 0.12, 0.35].map((x) => (
        <mesh key={x} position={[w * x, h * 0.4, d * 0.52]} castShadow>
          <cylinderGeometry args={[0.7, 0.85, h * 0.55, 8]} />
          {solidMat(accent, 0.1, 0.5)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.96, 0]}>
        <boxGeometry args={[w * 0.4, h * 0.1, d * 0.35]} />
        {solidMat(paint, 0.1, 0.5)}
      </mesh>
    </group>
  );
}

function ObeliskMesh({ h, paint }: { h: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.01, h * 0.08, h * 0.9, 4]} />
        {solidMat(paint, 0.15, 0.45)}
      </mesh>
      <mesh position={[0, h * 0.92, 0]} castShadow>
        <coneGeometry args={[h * 0.04, h * 0.1, 4]} />
        {solidMat("#d4c4a0", 0.35, 0.35)}
      </mesh>
    </group>
  );
}

function OxoMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <boxGeometry args={[w, h * 0.8, w * 0.85]} />
        {solidMat(paint, 0.12, 0.5)}
      </mesh>
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <boxGeometry args={[w * 1.05, h * 0.16, w * 0.9]} />
        {solidMat(accent, 0.2, 0.4)}
      </mesh>
      {/* Window crown letters cue */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * w * 0.22, h * 0.88, w * 0.48]}>
          <boxGeometry args={[w * 0.14, h * 0.08, 0.4]} />
          {solidMat("#f0f4f8", 0.1, 0.35)}
        </mesh>
      ))}
    </group>
  );
}

function ShellMexMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <boxGeometry args={[w * 1.1, h * 0.8, w * 0.7]} />
        {solidMat(paint, 0.15, 0.45)}
      </mesh>
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <cylinderGeometry args={[w * 0.22, w * 0.28, h * 0.16, 16]} />
        {solidMat(accent, 0.35, 0.35)}
      </mesh>
      <mesh position={[0, h * 1.0, 0]}>
        <sphereGeometry args={[w * 0.12, 12, 10]} />
        {solidMat("#e8d090", 0.55, 0.3)}
      </mesh>
    </group>
  );
}

function NationalTheatreMesh({ h, w, d, paint }: { h: number; w: number; d: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.28, 0]} castShadow>
        <boxGeometry args={[w * 1.3, h * 0.55, d * 1.1]} />
        {solidMat(paint, 0.08, 0.62)}
      </mesh>
      <mesh position={[-w * 0.25, h * 0.65, 0]} castShadow>
        <boxGeometry args={[w * 0.7, h * 0.35, d * 0.9]} />
        {solidMat(paint, 0.08, 0.6)}
      </mesh>
      <mesh position={[w * 0.35, h * 0.55, d * 0.1]} castShadow>
        <boxGeometry args={[w * 0.5, h * 0.25, d * 0.7]} />
        {solidMat(paint, 0.1, 0.58)}
      </mesh>
      {/* Horizontal strata */}
      {[0.2, 0.35, 0.5].map((t) => (
        <mesh key={t} position={[0, h * t, d * 0.56]}>
          <boxGeometry args={[w * 1.32, 0.8, 0.5]} />
          {solidMat("#8a9098", 0.1, 0.55)}
        </mesh>
      ))}
    </group>
  );
}

function StationShedMesh({ h, w, d, paint }: { h: number; w: number; d: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <boxGeometry args={[w * 1.4, h * 0.7, d * 1.2]} />
        {solidMat(paint, 0.12, 0.55)}
      </mesh>
      {[-0.35, 0, 0.35].map((x) => (
        <mesh key={x} position={[w * x, h * 0.75, 0]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[d * 0.15, d * 0.15, w * 0.35, 8, 1, false, 0, Math.PI]} />
          {solidMat("#6a7078", 0.25, 0.45)}
        </mesh>
      ))}
    </group>
  );
}

function CanaryPyramidMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w, h * 0.84, w]} />
        {solidMat(paint, 0.45, 0.28)}
      </mesh>
      <mesh position={[0, h * 0.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.5, w * 0.55, h * 0.18, 4]} />
        {solidMat("#c8d0d8", 0.55, 0.28)}
      </mesh>
      <mesh position={[0, h * 1.05, 0]}>
        <sphereGeometry args={[1.2, 10, 8]} />
        {solidMat("#e8f0f8", 0.4, 0.3)}
      </mesh>
    </group>
  );
}

function CanaryHaloMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <boxGeometry args={[w * 0.85, h * 0.9, w * 0.85]} />
        {glassMat(paint, 0.4, 0.16)}
      </mesh>
      <mesh position={[0, h * 0.82, 0]}>
        <boxGeometry args={[w * 0.95, 3.2, w * 0.95]} />
        {solidMat(accent, 0.2, 0.35)}
      </mesh>
      <mesh position={[0, h * 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[w * 0.35, 1.0, 8, 28]} />
        {solidMat("#e8f6ff", 0.3, 0.25)}
      </mesh>
    </group>
  );
}

function CanaryDiagridMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.48, 0]} castShadow>
        <boxGeometry args={[w, h * 0.96, w]} />
        {glassMat(paint, 0.25, 0.2)}
      </mesh>
      {([0, Math.PI / 2, Math.PI, -Math.PI / 2] as const).map((yaw, face) => (
        <group key={face} rotation={[0, yaw, 0]}>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[0, h * 0.5, w * 0.52]}
              rotation={[0, 0, side * 0.55]}
            >
              <boxGeometry args={[1.0, h * 0.9, 0.4]} />
              {solidMat("#1a2430", 0.3, 0.4)}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function EgyptPylonMesh({ h, w, d, paint, accent }: { h: number; w: number; d: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <boxGeometry args={[w * 1.2, h * 0.8, d]} />
        {solidMat(paint, 0.08, 0.65)}
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * w * 0.55, h * 0.55, 0]} castShadow>
          <boxGeometry args={[w * 0.22, h * 1.05, d * 0.9]} />
          {solidMat(accent, 0.1, 0.6)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.88, 0]}>
        <boxGeometry args={[w * 1.35, h * 0.08, d * 1.05]} />
        {solidMat(accent, 0.12, 0.55)}
      </mesh>
    </group>
  );
}

function DefaultSlab({ h, w, d, paint }: { h: number; w: number; d: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.015, 0]} castShadow>
        <boxGeometry args={[w * 1.05, h * 0.03, d * 1.05]} />
        {solidMat("#5a646e", 0.15, 0.6)}
      </mesh>
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w, h * 0.94, d]} />
        {glassMat(paint, 0.3, 0.2)}
      </mesh>
      {/* Floor ledge every ~20% for scale */}
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <mesh key={t} position={[0, h * t, 0]}>
          <boxGeometry args={[w * 1.02, Math.max(0.4, h * 0.006), d * 1.02]} />
          {solidMat("#a8b4be", 0.3, 0.4)}
        </mesh>
      ))}
      <mesh position={[0, h * 0.98, 0]} castShadow>
        <boxGeometry args={[w * 0.45, h * 0.04, d * 0.4]} />
        {solidMat("#7a8690", 0.2, 0.55)}
      </mesh>
    </group>
  );
}

export function IconicTower({
  kind,
  height,
  width,
  depth,
  identity,
  name,
  castShadow = true,
  facadeMaps = null,
}: {
  kind: IconicKind;
  height: number;
  width: number;
  depth: number;
  identity: LandmarkIdentity;
  name: string;
  castShadow?: boolean;
  facadeMaps?: FacadeMaps | null;
}) {
  const h = Math.max(12, height);
  const w = Math.max(8, Math.max(width, depth));
  const paint = identity.color;
  const accent = identity.accent;
  void name;
  const root = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.castShadow = Boolean(castShadow);
    });
  }, [castShadow, kind, h, w]);

  const regionalBody = renderRegionalIconicBody(
    kind as RegionalIconicKind,
    h,
    w,
    paint,
    accent,
  );

  let body: ReactNode;
  if (regionalBody) {
    body = regionalBody;
  } else switch (kind) {
    case "burj-khalifa":
      body = <BurjKhalifaMesh h={h} paint={paint} />;
      break;
    case "burj-al-arab":
      body = <BurjAlArabMesh h={h} paint={paint} accent={accent} />;
      break;
    case "cayan-twist":
      body = <TwistTowerMesh h={h} w={w} paint={paint} />;
      break;
    case "empire-state":
      body = <EmpireStateMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "chrysler":
      body = <ChryslerMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "one-wtc":
      body = <OneWtcMesh h={h} w={w} paint={paint} />;
      break;
    case "flatiron":
      body = <FlatironMesh h={h} w={w} paint={paint} />;
      break;
    case "citigroup-slant":
      body = <CitigroupSlantMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "museum-future":
      body = <MuseumFutureMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "frame-dubai":
      body = <FrameMesh h={h} w={w * 1.2} paint={paint} />;
      break;
    case "statue-liberty":
      body = <StatueLibertyMesh h={h} />;
      break;
    case "brooklyn-bridge-tower":
      body = <BrooklynBridgeTowerMesh h={h} w={w} paint={paint} />;
      break;
    case "hearst":
      body = <HearstMesh h={h} w={w} paint={paint} />;
      break;
    case "mi6-ziggurat":
      body = <Mi6Mesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "millbank-cylinder":
      body = <MillbankMesh h={h} w={w} paint={paint} />;
      break;
    case "classical-palace":
    case "portland-stone":
      body = (
        <ClassicalPalaceMesh
          h={h}
          w={w}
          d={Math.max(8, depth)}
          paint={paint}
          accent={accent}
        />
      );
      break;
    case "obelisk":
      body = <ObeliskMesh h={h} paint={paint} />;
      break;
    case "oxo-tower":
      body = <OxoMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "shell-mex":
      body = <ShellMexMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "national-theatre":
      body = (
        <NationalTheatreMesh h={h} w={w} d={Math.max(8, depth)} paint={paint} />
      );
      break;
    case "station-shed":
      body = (
        <StationShedMesh h={h} w={w} d={Math.max(8, depth)} paint={paint} />
      );
      break;
    case "canary-pyramid":
      body = <CanaryPyramidMesh h={h} w={w} paint={paint} />;
      break;
    case "canary-halo":
      body = <CanaryHaloMesh h={h} w={w} paint={paint} accent={accent} />;
      break;
    case "canary-diagrid":
      body = <CanaryDiagridMesh h={h} w={w} paint={paint} />;
      break;
    case "egypt-pylon":
      body = (
        <EgyptPylonMesh
          h={h}
          w={w}
          d={Math.max(8, depth)}
          paint={paint}
          accent={accent}
        />
      );
      break;
    case "432-park":
    case "glass-needle":
    case "princess-tower":
    case "marina-101":
    case "emirates-twin":
    case "address-downtown":
    case "ailamas":
      body = <GlassNeedleMesh h={h} w={w * 0.85} paint={paint} />;
      break;
    case "setback-glass":
    case "woolworth":
    case "rockefeller":
    case "art-deco-crown":
    case "metlife":
      body = <SetbackGlassMesh h={h} w={w} paint={paint} />;
      break;
    case "seagram":
    case "lever-house":
    case "difc-gate":
    case "glass-slab-tall":
    default:
      body = <DefaultSlab h={h} w={w} d={Math.max(8, depth)} paint={paint} />;
      break;
  }

  // Extra crowns for a few kinds
  const crown =
    kind === "empire-state" || kind === "chrysler" || kind === "art-deco-crown" ? (
      <mesh position={[0, h + 2, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        {solidMat(accent, 0.5, 0.3)}
      </mesh>
    ) : kind === "432-park" ? (
      <mesh position={[0, h + 1, 0]}>
        <boxGeometry args={[w * 0.5, 4, w * 0.5]} />
        {solidMat("#f0f4f8", 0.2, 0.35)}
      </mesh>
    ) : null;

  return (
    <TowerMapsCtx.Provider value={facadeMaps}>
      <group ref={root}>
        {body}
        {crown}
        <LandmarkNameTag
          label={identity.label}
          accent={identity.accent}
          height={h}
          scale={0.82}
          lateral
        />
      </group>
    </TowerMapsCtx.Provider>
  );
}

export function hasIconicTower(name?: string): boolean {
  return resolveIconicKind(name) !== null;
}
