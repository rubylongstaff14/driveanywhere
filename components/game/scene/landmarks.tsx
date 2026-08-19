"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { wgs84ToLocal } from "@/lib/geo/coordinate-projection";
import {
  getLandmarkIdentity,
  isIdentifiableLandmark,
} from "@/lib/game/landmark-identity";
import type { RouteData } from "@/lib/validation/route-data";
import { useSettingsStore } from "@/stores/settings-store";

export { isIdentifiableLandmark as isFamousCanaryBuilding };

/**
 * Lightweight procedural landmarks. These are original silhouettes meant to
 * read as recognisable London skyline cues — not replicas of protected designs.
 */

const mats = {
  stone: new THREE.MeshStandardMaterial({ color: "#c4a882", roughness: 0.88 }),
  stoneDark: new THREE.MeshStandardMaterial({
    color: "#a89070",
    roughness: 0.86,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: "#5f6f5d",
    roughness: 0.55,
    metalness: 0.25,
  }),
  glass: new THREE.MeshStandardMaterial({
    color: "#c8dce8",
    roughness: 0.12,
    metalness: 0.08,
    envMapIntensity: 1.1,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: "#a8b4be",
    roughness: 0.35,
    metalness: 0.55,
  }),
  clock: new THREE.MeshStandardMaterial({
    color: "#1a3a8a",
    emissive: "#243f9a",
    emissiveIntensity: 0.5,
    roughness: 0.45,
  }),
  white: new THREE.MeshStandardMaterial({
    color: "#f2f5f8",
    roughness: 0.35,
    metalness: 0.15,
  }),
  beacon: new THREE.MeshStandardMaterial({
    color: "#ff334d",
    emissive: "#ff1738",
    emissiveIntensity: 4.2,
    toneMapped: false,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: "#d4af37",
    metalness: 0.65,
    roughness: 0.28,
    emissive: "#a88420",
    emissiveIntensity: 0.2,
  }),
  prussian: new THREE.MeshStandardMaterial({
    color: "#1a3a8a",
    emissive: "#243f9a",
    emissiveIntensity: 0.55,
    roughness: 0.45,
  }),
  limestone: new THREE.MeshStandardMaterial({
    color: "#d8c8a8",
    roughness: 0.9,
  }),
  limestoneDark: new THREE.MeshStandardMaterial({
    color: "#b8a888",
    roughness: 0.88,
  }),
  lead: new THREE.MeshStandardMaterial({
    color: "#5a6870",
    metalness: 0.45,
    roughness: 0.4,
  }),
  portland: new THREE.MeshStandardMaterial({
    color: "#e8e0d0",
    roughness: 0.86,
  }),
  county: new THREE.MeshStandardMaterial({
    color: "#c8b898",
    roughness: 0.88,
  }),
  sand: new THREE.MeshStandardMaterial({
    color: "#d4b078",
    roughness: 0.92,
  }),
  sandDark: new THREE.MeshStandardMaterial({
    color: "#b89058",
    roughness: 0.9,
  }),
  limestoneCap: new THREE.MeshStandardMaterial({
    color: "#e8e0d0",
    roughness: 0.75,
    emissive: "#c8c0a8",
    emissiveIntensity: 0.08,
  }),
};

const distantMats = {
  glass: mats.glass.clone(),
  steel: mats.steel.clone(),
  white: mats.white.clone(),
  stone: mats.stone.clone(),
  stoneDark: mats.stoneDark.clone(),
  copper: mats.copper.clone(),
  clock: mats.clock.clone(),
  portland: mats.portland.clone(),
  limestoneDark: mats.limestoneDark.clone(),
  lead: mats.lead.clone(),
};
for (const material of Object.values(distantMats)) {
  material.fog = false;
}

/** Elizabeth Tower–evoking clock tower (original silhouette). */
export function ClockTowerLandmark({
  position,
  scale = 1,
  castShadow = true,
  fog = true,
}: {
  position: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  fog?: boolean;
}) {
  const s = scale;
  const stone = fog ? mats.stone : distantMats.stone;
  const stoneDark = fog ? mats.stoneDark : distantMats.stoneDark;
  const copper = fog ? mats.copper : distantMats.copper;
  const clock = fog ? mats.prussian : distantMats.clock;
  const gold = mats.gold;

  return (
    <group position={position}>
      {/* Sand-coloured Anston stone shaft */}
      <mesh position={[0, 10 * s, 0]} castShadow={castShadow} material={stoneDark}>
        <boxGeometry args={[14 * s, 20 * s, 14 * s]} />
      </mesh>
      {[8, 14, 20].map((y) => (
        <mesh key={y} position={[0, y * s, 0]} material={stone}>
          <boxGeometry args={[14.6 * s, 1.4 * s, 14.6 * s]} />
        </mesh>
      ))}
      <mesh position={[0, 34 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[11.5 * s, 28 * s, 11.5 * s]} />
      </mesh>
      {/* Clock stage */}
      <mesh position={[0, 52 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[12 * s, 12 * s, 12 * s]} />
      </mesh>
      {/* Gilded clock surround rings */}
      {([0, Math.PI / 2, Math.PI, -Math.PI / 2] as const).map((yaw, i) => (
        <group
          key={i}
          position={[
            Math.sin(yaw) * 6.1 * s,
            52 * s,
            Math.cos(yaw) * 6.1 * s,
          ]}
          rotation={[0, yaw, 0]}
        >
          <mesh material={gold}>
            <ringGeometry args={[3.5 * s, 4.1 * s, 24]} />
          </mesh>
          {/* Prussian blue dial */}
          <mesh position={[0, 0, 0.05 * s]} material={clock}>
            <circleGeometry args={[3.4 * s, 24]} />
          </mesh>
          {/* Gold hands */}
          <mesh position={[0, 0, 0.1 * s]} rotation={[0, 0, -0.7]} material={gold}>
            <boxGeometry args={[0.18 * s, 2.6 * s, 0.08 * s]} />
          </mesh>
          <mesh position={[0, 0, 0.12 * s]} rotation={[0, 0, 0.35]} material={gold}>
            <boxGeometry args={[0.14 * s, 1.9 * s, 0.08 * s]} />
          </mesh>
        </group>
      ))}
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => (
          <group
            key={`${x}-${z}`}
            position={[x * 5.8 * s, 52 * s, z * 5.8 * s]}
          >
            <mesh castShadow={castShadow} material={stoneDark}>
              <cylinderGeometry args={[0.75 * s, 1.0 * s, 18 * s, 6]} />
            </mesh>
            <mesh position={[0, 11 * s, 0]} material={copper}>
              <coneGeometry args={[1.2 * s, 5 * s, 6]} />
            </mesh>
          </group>
        )),
      )}
      {/* Iron / copper spire with gold tip */}
      <mesh position={[0, 66 * s, 0]} castShadow={castShadow} material={copper}>
        <coneGeometry args={[4.4 * s, 18 * s, 8]} />
      </mesh>
      <mesh position={[0, 76 * s, 0]} material={gold}>
        <cylinderGeometry args={[0.15 * s, 0.22 * s, 5 * s, 6]} />
      </mesh>
    </group>
  );
}

/** London Eye–evoking observation wheel (original silhouette). */
export function LondonEyeLandmark({
  position,
  castShadow = false,
  detail = true,
  fog = true,
}: {
  position: [number, number, number];
  castShadow?: boolean;
  detail?: boolean;
  fog?: boolean;
}) {
  const radius = 32;
  const capsules = detail ? 24 : 12;
  const white = fog ? mats.white : distantMats.white;
  const steel = fog ? mats.steel : distantMats.steel;
  const glass = fog ? mats.glass : distantMats.glass;
  const stoneDark = fog ? mats.stoneDark : distantMats.stoneDark;

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow={castShadow} material={white}>
        <torusGeometry args={[radius, 0.55, 8, detail ? 64 : 32]} />
      </mesh>
      <mesh material={steel}>
        <torusGeometry args={[radius * 0.72, 0.22, 6, detail ? 48 : 24]} />
      </mesh>
      {Array.from({ length: capsules }, (_, index) => {
        const angle = (index / capsules) * Math.PI * 2;
        return (
          <group key={index} rotation={[0, 0, angle]}>
            <mesh position={[radius / 2, 0, 0]} material={steel}>
              <boxGeometry args={[radius, 0.08, 0.08]} />
            </mesh>
            <mesh position={[radius, 0, 0]} material={glass}>
              <capsuleGeometry args={[0.85, 1.4, 4, 8]} />
            </mesh>
          </group>
        );
      })}
      <mesh material={steel}>
        <cylinderGeometry args={[1.6, 1.6, 4, 12]} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * 11, -33, 0]}
          rotation={[0, 0, side * -0.3]}
          material={steel}
        >
          <boxGeometry args={[1.2, 36, 1.2]} />
        </mesh>
      ))}
      <mesh position={[0, -48, 0]} material={stoneDark}>
        <boxGeometry args={[18, 3, 10]} />
      </mesh>
    </group>
  );
}

/** The Shard–evoking tapered glass tower (original silhouette). */
export function ShardLandmark({
  position,
  scale = 1,
  castShadow = false,
  fog = true,
}: {
  position: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  fog?: boolean;
}) {
  const s = scale;
  const height = 310 * s;
  const glass = fog ? mats.glass : distantMats.glass;
  const steel = fog ? mats.steel : distantMats.steel;
  const white = fog ? mats.white : distantMats.white;

  return (
    <group position={position}>
      {/* Extra-white glass taper — Renzo Piano shard silhouette */}
      <mesh
        position={[0, height * 0.42, 0]}
        castShadow={castShadow}
        material={glass}
      >
        <cylinderGeometry args={[0.2, 22 * s, height * 0.84, 4]} />
      </mesh>
      {/* Offset broken facet */}
      <mesh
        position={[3.5 * s, height * 0.4, -2.2 * s]}
        rotation={[0, 0.35, 0.05]}
        material={white}
      >
        <cylinderGeometry args={[0.15, 16 * s, height * 0.78, 3]} />
      </mesh>
      <mesh
        position={[-2.4 * s, height * 0.36, 1.8 * s]}
        rotation={[0, -0.4, -0.03]}
        material={steel}
      >
        <cylinderGeometry args={[0.1, 12 * s, height * 0.68, 3]} />
      </mesh>
      {/* Needle tip */}
      <mesh position={[0, height * 0.9, 0]} material={white}>
        <cylinderGeometry args={[0.05, 5 * s, height * 0.18, 4]} />
      </mesh>
    </group>
  );
}

/**
 * Palace of Westminster–evoking riverside silhouette: long Gothic facade,
 * Victoria Tower (tall square), Central Tower lantern, river terrace.
 */
export function PalaceOfWestminsterLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  const stone = mats.limestone;
  const dark = mats.limestoneDark;
  const lead = mats.lead;
  const copper = mats.copper;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main riverside range */}
      <mesh position={[0, 11 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[148 * s, 22 * s, 28 * s]} />
      </mesh>
      {/* River terrace plinth */}
      <mesh position={[0, 1.2 * s, 16 * s]} material={dark}>
        <boxGeometry args={[152 * s, 2.4 * s, 8 * s]} />
      </mesh>
      {/* Buttress / bay rhythm along river face */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = -66 * s + i * 10 * s;
        return (
          <group key={i} position={[x, 0, 14.2 * s]}>
            <mesh position={[0, 12 * s, 0]} castShadow={castShadow} material={dark}>
              <boxGeometry args={[2.2 * s, 18 * s, 2.5 * s]} />
            </mesh>
            <mesh position={[0, 22 * s, 0]} material={copper}>
              <coneGeometry args={[1.4 * s, 4.5 * s, 4]} />
            </mesh>
          </group>
        );
      })}
      {/* Victoria Tower — tall square SW corner with corner pinnacles */}
      <group position={[-62 * s, 0, -2 * s]}>
        <mesh position={[0, 28 * s, 0]} castShadow={castShadow} material={dark}>
          <boxGeometry args={[18 * s, 56 * s, 18 * s]} />
        </mesh>
        <mesh position={[0, 58 * s, 0]} material={stone}>
          <boxGeometry args={[19.5 * s, 6 * s, 19.5 * s]} />
        </mesh>
        {([-1, 1] as const).flatMap((x) =>
          ([-1, 1] as const).map((z) => (
            <mesh
              key={`${x}-${z}`}
              position={[x * 8 * s, 64 * s, z * 8 * s]}
              material={copper}
            >
              <coneGeometry args={[1.6 * s, 10 * s, 4]} />
            </mesh>
          )),
        )}
        <mesh position={[0, 62 * s, 0]} material={lead}>
          <boxGeometry args={[10 * s, 4 * s, 10 * s]} />
        </mesh>
      </group>
      {/* Central Tower — octagonal lantern over the middle */}
      <group position={[8 * s, 0, -2 * s]}>
        <mesh position={[0, 26 * s, 0]} castShadow={castShadow} material={stone}>
          <cylinderGeometry args={[7 * s, 8.5 * s, 20 * s, 8]} />
        </mesh>
        <mesh position={[0, 38 * s, 0]} material={dark}>
          <cylinderGeometry args={[5.5 * s, 7 * s, 8 * s, 8]} />
        </mesh>
        <mesh position={[0, 46 * s, 0]} material={copper}>
          <coneGeometry args={[6.5 * s, 14 * s, 8]} />
        </mesh>
        <mesh position={[0, 54 * s, 0]} material={mats.gold}>
          <cylinderGeometry args={[0.2 * s, 0.35 * s, 4 * s, 6]} />
        </mesh>
      </group>
      {/* NE wing / Commons end block */}
      <mesh
        position={[68 * s, 14 * s, 0]}
        castShadow={castShadow}
        material={dark}
      >
        <boxGeometry args={[22 * s, 28 * s, 30 * s]} />
      </mesh>
      {([-1, 1] as const).map((z) => (
        <mesh key={z} position={[68 * s, 30 * s, z * 10 * s]} material={copper}>
          <coneGeometry args={[3.5 * s, 8 * s, 4]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Westminster Abbey–evoking twin west towers + long nave + crossing lantern.
 */
export function WestminsterAbbeyLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  const stone = mats.portland;
  const dark = mats.limestoneDark;
  const lead = mats.lead;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Nave + choir mass */}
      <mesh position={[0, 12 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[72 * s, 24 * s, 28 * s]} />
      </mesh>
      {/* Pitched roof mass */}
      <mesh position={[0, 26 * s, 0]} rotation={[0, 0, Math.PI / 4]} material={lead}>
        <boxGeometry args={[18 * s, 18 * s, 70 * s]} />
      </mesh>
      {/* Twin west towers */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 16 * s, 0, -16 * s]}>
          <mesh position={[0, 22 * s, 0]} castShadow={castShadow} material={dark}>
            <boxGeometry args={[12 * s, 44 * s, 12 * s]} />
          </mesh>
          <mesh position={[0, 46 * s, 0]} material={stone}>
            <boxGeometry args={[13 * s, 5 * s, 13 * s]} />
          </mesh>
          <mesh position={[0, 52 * s, 0]} material={lead}>
            <boxGeometry args={[8 * s, 8 * s, 8 * s]} />
          </mesh>
          {([-1, 1] as const).flatMap((x) =>
            ([-1, 1] as const).map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[x * 5 * s, 50 * s, z * 5 * s]}
                material={mats.copper}
              >
                <coneGeometry args={[1.1 * s, 6 * s, 4]} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {/* Crossing lantern */}
      <group position={[0, 0, 6 * s]}>
        <mesh position={[0, 28 * s, 0]} castShadow={castShadow} material={stone}>
          <boxGeometry args={[16 * s, 16 * s, 16 * s]} />
        </mesh>
        <mesh position={[0, 38 * s, 0]} material={dark}>
          <cylinderGeometry args={[5 * s, 6.5 * s, 8 * s, 8]} />
        </mesh>
        <mesh position={[0, 45 * s, 0]} material={lead}>
          <coneGeometry args={[6 * s, 10 * s, 8]} />
        </mesh>
      </group>
      {/* Flying buttress stubs (south aisle cue) */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[-24 * s + i * 12 * s, 14 * s, 16 * s]}
          rotation={[0.35, 0, 0]}
          material={dark}
        >
          <boxGeometry args={[2 * s, 2 * s, 10 * s]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * St Paul's–evoking dome: drum, colonnade rings, lantern, west towers.
 */
export function StPaulsLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
  fog = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
  fog?: boolean;
}) {
  const s = scale;
  const stone = fog ? mats.portland : distantMats.portland;
  const dark = fog ? mats.limestoneDark : distantMats.limestoneDark;
  const lead = fog ? mats.lead : distantMats.lead;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Cathedral body */}
      <mesh position={[0, 14 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[48 * s, 28 * s, 32 * s]} />
      </mesh>
      {/* West towers */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 18 * s, 0, -18 * s]}>
          <mesh position={[0, 22 * s, 0]} castShadow={castShadow} material={dark}>
            <boxGeometry args={[10 * s, 44 * s, 10 * s]} />
          </mesh>
          <mesh position={[0, 46 * s, 0]} material={lead}>
            <coneGeometry args={[5.5 * s, 10 * s, 4]} />
          </mesh>
        </group>
      ))}
      {/* Dome drum */}
      <mesh position={[0, 36 * s, 4 * s]} castShadow={castShadow} material={stone}>
        <cylinderGeometry args={[14 * s, 15 * s, 16 * s, 16]} />
      </mesh>
      {/* Colonnade ring */}
      <mesh position={[0, 36 * s, 4 * s]} material={dark}>
        <torusGeometry args={[14.5 * s, 0.9 * s, 6, 24]} />
      </mesh>
      {/* Main dome */}
      <mesh position={[0, 52 * s, 4 * s]} castShadow={castShadow} material={lead}>
        <sphereGeometry args={[15 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Lantern + orb */}
      <mesh position={[0, 62 * s, 4 * s]} material={stone}>
        <cylinderGeometry args={[3.2 * s, 4 * s, 8 * s, 8]} />
      </mesh>
      <mesh position={[0, 68 * s, 4 * s]} material={lead}>
        <coneGeometry args={[3.5 * s, 6 * s, 8]} />
      </mesh>
      <mesh position={[0, 72 * s, 4 * s]} material={mats.gold}>
        <sphereGeometry args={[1.1 * s, 10, 8]} />
      </mesh>
    </group>
  );
}

/**
 * County Hall–evoking curved riverside civic block with end cupolas.
 */
export function CountyHallLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  const stone = mats.county;
  const dark = mats.limestoneDark;
  const lead = mats.lead;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 14 * s, 0]} castShadow={castShadow} material={stone}>
        <boxGeometry args={[70 * s, 28 * s, 22 * s]} />
      </mesh>
      {/* Curved river front (approximated with offset bays) */}
      {([-2, -1, 0, 1, 2] as const).map((i) => (
        <mesh
          key={i}
          position={[i * 12 * s, 12 * s, 12 * s + Math.abs(i) * 1.2 * s]}
          castShadow={castShadow}
          material={dark}
        >
          <boxGeometry args={[11 * s, 22 * s, 6 * s]} />
        </mesh>
      ))}
      {/* End pavilion cupolas */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 32 * s, 0, 0]}>
          <mesh position={[0, 20 * s, 0]} castShadow={castShadow} material={stone}>
            <boxGeometry args={[14 * s, 40 * s, 18 * s]} />
          </mesh>
          <mesh position={[0, 42 * s, 0]} material={lead}>
            <sphereGeometry args={[6 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 48 * s, 0]} material={mats.copper}>
            <coneGeometry args={[2.2 * s, 5 * s, 6]} />
          </mesh>
        </group>
      ))}
      {/* Central pediment cue */}
      <mesh position={[0, 30 * s, 12 * s]} material={stone}>
        <coneGeometry args={[8 * s, 8 * s, 3]} />
      </mesh>
    </group>
  );
}

/** Multi-arch Thames road bridge (generic London embankment cue). */
export function ThamesArchBridge({
  position,
  rotation = 0,
  span = 90,
  arches = 3,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  span?: number;
  arches?: number;
  castShadow?: boolean;
}) {
  const deckY = 9;
  const archWidth = span / arches;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, deckY, 0]} castShadow={castShadow} material={mats.stoneDark}>
        <boxGeometry args={[span + 8, 2.2, 14]} />
      </mesh>
      {/* Parapet rails */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[0, deckY + 1.6, side * 6.5]} material={mats.steel}>
          <boxGeometry args={[span + 6, 1.2, 0.35]} />
        </mesh>
      ))}
      {Array.from({ length: arches }, (_, i) => {
        const x = -span / 2 + archWidth * (i + 0.5);
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh
              position={[0, 4.5, 0]}
              rotation={[0, 0, 0]}
              material={mats.stone}
            >
              <torusGeometry args={[archWidth * 0.38, 1.1, 6, 16, Math.PI]} />
            </mesh>
            <mesh position={[-archWidth * 0.42, 4, 0]} material={mats.stoneDark}>
              <boxGeometry args={[2.4, 8, 12]} />
            </mesh>
          </group>
        );
      })}
      {/* End abutments */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[(span / 2 + 4) * side, 5, 0]}
          castShadow={castShadow}
          material={mats.stoneDark}
        >
          <boxGeometry args={[8, 10, 16]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Track overpass / flyover arch. Deck sits well above the road so the car
 * always passes underneath — never blocks the racing line.
 */
export function TrackOverpassArch({
  position,
  yaw,
  span,
  roadY,
  clearance,
  castShadow = true,
}: {
  position: [number, number, number];
  yaw: number;
  span: number;
  roadY: number;
  clearance: number;
  castShadow?: boolean;
}) {
  // `position` is already at road height — keep local Y relative to that.
  const soffit = clearance;
  const deckThick = 1.4;
  const pierH = Math.max(3.2, clearance - 0.4);
  const width = Math.max(14, span * 0.55);
  const pierOut = Math.max(span * 0.48, span * 0.5 - 1.2);
  void roadY;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Deck */}
      <mesh
        position={[0, soffit + deckThick / 2, 0]}
        castShadow={castShadow}
        material={mats.stoneDark}
      >
        <boxGeometry args={[span + 4, deckThick, width]} />
      </mesh>
      {/* Parapet */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`rail-${side}`}
          position={[0, soffit + deckThick + 0.55, side * (width * 0.45)]}
          material={mats.steel}
        >
          <boxGeometry args={[span + 2, 0.9, 0.28]} />
        </mesh>
      ))}
      {/* Soft arch soffit cue */}
      <mesh
        position={[0, soffit - 0.15, 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 2]}
        material={mats.stone}
      >
        <torusGeometry args={[span * 0.28, 0.55, 8, 20, Math.PI]} />
      </mesh>
      {/* Side piers well clear of the asphalt */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`pier-${side}`}
          position={[side * pierOut, pierH / 2, 0]}
          castShadow={castShadow}
          material={mats.stoneDark}
        >
          <boxGeometry args={[2.2, pierH, Math.min(8, width * 0.45)]} />
        </mesh>
      ))}
    </group>
  );
}

/** Roadside turn warning — metre boards with chevrons by severity. */
export function TurnWarningSign({
  position,
  yaw,
  turn,
  severity,
  metres = 50,
}: {
  position: [number, number, number];
  yaw: number;
  turn: -1 | 1;
  severity: "mild" | "sharp" | "hairpin";
  metres?: 100 | 50 | 25;
}) {
  const chevrons = severity === "hairpin" ? 3 : severity === "sharp" ? 2 : 1;
  const boardH = 1.35 + chevrons * 0.12;
  const label =
    metres === 100 ? "100m" : metres === 25 ? "25m" : "50m";

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 2.9, 6]} />
        <meshStandardMaterial color="#5a626a" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* White distance plate */}
      <mesh position={[0, 2.85, 0.05]} castShadow>
        <boxGeometry args={[1.15, 0.55, 0.06]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.85, 0.09]}>
        <planeGeometry args={[1.0, 0.42]} />
        <meshBasicMaterial color="#f4f6f8" />
      </mesh>
      {/* Metre numeral as extruded bars (readable without canvas text) */}
      <group position={[0, 2.85, 0.1]}>
        {label === "100m" && (
          <>
            <mesh position={[-0.28, 0, 0]}>
              <boxGeometry args={[0.08, 0.32, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.05, 0, 0]}>
              <torusGeometry args={[0.12, 0.035, 8, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.25, 0, 0]}>
              <torusGeometry args={[0.12, 0.035, 8, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </>
        )}
        {label === "50m" && (
          <>
            <mesh position={[-0.18, 0.06, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.18, 0, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.18, -0.06, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.18, 0, 0]}>
              <torusGeometry args={[0.12, 0.035, 8, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </>
        )}
        {label === "25m" && (
          <>
            <mesh position={[-0.2, 0, 0]}>
              <boxGeometry args={[0.12, 0.28, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.2, 0.1, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.18, 0.05, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.18, -0.05, 0]}>
              <boxGeometry args={[0.2, 0.06, 0.04]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </>
        )}
      </group>
      {/* Yellow direction board below */}
      <mesh position={[0, 2.15, 0.06]} castShadow>
        <boxGeometry args={[1.4, boardH * 0.72, 0.08]} />
        <meshStandardMaterial color="#f0c020" roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.15, 0.11]}>
        <boxGeometry args={[1.22, boardH * 0.72 - 0.14, 0.02]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.7} />
      </mesh>
      {Array.from({ length: chevrons }, (_, i) => {
        const y = 2.15 + (i - (chevrons - 1) / 2) * 0.28;
        return (
          <group key={i} position={[0, y, 0.14]} scale={[turn, 1, 1]}>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.5, 0.11, 0.04]} />
              <meshStandardMaterial
                color="#f0c020"
                emissive="#806010"
                emissiveIntensity={0.3}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0.16, -0.16, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.5, 0.11, 0.04]} />
              <meshStandardMaterial
                color="#f0c020"
                emissive="#806010"
                emissiveIntensity={0.3}
                roughness={0.4}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const labelTextureCache = new Map<string, THREE.CanvasTexture>();

function getLabelTexture(label: string, accent: string): THREE.CanvasTexture {
  const key = `${label}|${accent}`;
  const cached = labelTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 192);
    const radius = 40;
    // High-contrast cartoon plate so labels stay readable in dusk fog.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(radius, 24);
    ctx.arcTo(1000, 24, 1000, 168, radius);
    ctx.arcTo(1000, 168, 24, 168, radius);
    ctx.arcTo(24, 168, 24, 24, radius);
    ctx.arcTo(24, 24, 1000, 24, radius);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.stroke();
    ctx.font = "bold 72px system-ui, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(label, 512, 100);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, 512, 100);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  labelTextureCache.set(key, texture);
  return texture;
}

export function LandmarkNameTag({
  label,
  accent,
  height,
  scale = 1,
}: {
  label: string;
  accent: string;
  height: number;
  /** Extra multiplier for skyline-readable tags. */
  scale?: number;
}) {
  const quality = useSettingsStore((s) => s.quality);
  const texture = useMemo(
    () => getLabelTexture(label, accent),
    [accent, label],
  );
  if (quality !== "high") return null;

  // Scale with tower height so distant skyline tags stay readable.
  const width =
    THREE.MathUtils.clamp(28 + height * 0.085, 34, 64) * scale;
  const plateHeight = width * 0.28;
  return (
    <Billboard position={[0, height + plateHeight * 2.2, 0]} follow>
      <mesh renderOrder={10}>
        <planeGeometry args={[width, plateHeight]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

/**
 * Distinctive cartoon crowns based on each tower's real silhouette cues.
 */
export function CanaryTowerCrown({
  name,
  width,
  depth,
  renderHeight,
  castShadow = true,
}: {
  name?: string;
  width: number;
  depth: number;
  renderHeight: number;
  castShadow?: boolean;
}) {
  const identity = getLandmarkIdentity(name, renderHeight);
  if (!identity || !name) return null;
  const span = Math.max(width, depth);
  const lower = name.toLowerCase();

  return (
    <group>
      <LandmarkNameTag
        label={identity.label}
        accent={identity.accent}
        height={renderHeight}
        scale={1.2}
      />

      {/* One Canada Square — stainless prism + large steel pyramid + beacon */}
      {lower.includes("canada square") ? (
        <group position={[0, renderHeight, 0]}>
          {/* Pyramid is ~40 m of the real 235 m tower */}
          <mesh
            position={[0, renderHeight * 0.085, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow={castShadow}
          >
            <cylinderGeometry
              args={[0.4, span * 0.72, renderHeight * 0.17, 4]}
            />
            <meshStandardMaterial
              color="#c8d0d8"
              metalness={0.55}
              roughness={0.28}
              emissive="#a8b4c0"
              emissiveIntensity={0.15}
            />
          </mesh>
          {/* Inverted corner notches (cartoon of Pelli's chamfers) */}
          {([-1, 1] as const).flatMap((x) =>
            ([-1, 1] as const).map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[
                  x * span * 0.48,
                  -renderHeight * 0.35,
                  z * span * 0.48,
                ]}
              >
                <boxGeometry args={[span * 0.12, renderHeight * 0.7, span * 0.12]} />
                <meshStandardMaterial color="#b0bac4" roughness={0.35} metalness={0.35} />
              </mesh>
            )),
          )}
          <mesh position={[0, renderHeight * 0.175, 0]} material={mats.beacon}>
            <sphereGeometry args={[1.1, 12, 10]} />
          </mesh>
        </group>
      ) : null}

      {/* HSBC — sheer glass shaft cues + luminous halo ring */}
      {lower.includes("hsbc") ? (
        <group>
          {/* Red brand stripe near top (readable cue without logos) */}
          <mesh position={[0, renderHeight * 0.82, 0]}>
            <boxGeometry args={[span * 1.06, 3.5, span * 1.06]} />
            <meshStandardMaterial
              color="#c8102e"
              emissive="#c8102e"
              emissiveIntensity={0.45}
            />
          </mesh>
          {/* Foster-style illuminated halo */}
          <mesh position={[0, renderHeight + 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[span * 0.42, 1.1, 8, 32]} />
            <meshStandardMaterial
              color="#e8f6ff"
              emissive="#b8e8ff"
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, renderHeight + 3.5, 0]}>
            <cylinderGeometry args={[span * 0.28, span * 0.28, 2, 16]} />
            <meshStandardMaterial color="#d0e4f0" roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {/* Citi — blue glass slab with stepped dark crown */}
      {lower === "citi" || lower.startsWith("citi") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[span * 0.85, 4, span * 0.85]} />
            <meshStandardMaterial color="#0a3a68" roughness={0.35} />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[span * 0.55, 5, span * 0.55]} />
            <meshStandardMaterial
              color="#4a8ec4"
              emissive="#2a6ea4"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ) : null}

      {/* Newfoundland — full-height diamond / X diagrid on all faces */}
      {lower.includes("newfoundland") ? (
        <group>
          {([0, Math.PI / 2, Math.PI, -Math.PI / 2] as const).map((yaw, face) => (
            <group key={face} rotation={[0, yaw, 0]}>
              {([-1, 1] as const).map((side) => (
                <mesh
                  key={side}
                  position={[0, renderHeight * 0.5, span * 0.52]}
                  rotation={[0, 0, side * 0.6]}
                >
                  <boxGeometry args={[1.1, renderHeight * 0.92, 0.45]} />
                  <meshStandardMaterial
                    color="#1a2430"
                    roughness={0.4}
                    metalness={0.2}
                  />
                </mesh>
              ))}
              {/* Mid diamond nodes */}
              {[0.25, 0.5, 0.75].map((t) => (
                <mesh
                  key={t}
                  position={[0, renderHeight * t, span * 0.54]}
                >
                  <boxGeometry args={[2.2, 1.4, 0.5]} />
                  <meshStandardMaterial color="#2a3440" roughness={0.35} />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[0, renderHeight + 2, 0]}>
            <boxGeometry args={[span * 0.65, 4, span * 0.65]} />
            <meshStandardMaterial color="#1a2430" roughness={0.35} />
          </mesh>
        </group>
      ) : null}

      {/* Landmark Pinnacle — tall flush needle with pointed tip */}
      {lower.includes("pinnacle") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh castShadow={castShadow}>
            <cylinderGeometry args={[1.2, span * 0.38, 28, 8]} />
            <meshStandardMaterial color="#e4eef4" roughness={0.28} metalness={0.15} />
          </mesh>
          <mesh position={[0, 18, 0]}>
            <coneGeometry args={[span * 0.22, 14, 8]} />
            <meshStandardMaterial color="#9ab0c0" roughness={0.35} />
          </mesh>
        </group>
      ) : null}

      {/* JP Morgan / 40 Bank Street — dark glass + gold cap cue */}
      {lower.includes("jp morgan") || lower.includes("40 bank") ? (
        <group position={[0, renderHeight + 1, 0]}>
          <mesh>
            <boxGeometry args={[span * 0.7, 3, span * 0.7]} />
            <meshStandardMaterial
              color={identity.accent}
              metalness={0.45}
              roughness={0.3}
              emissive={identity.accent}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[span * 0.4, 6, span * 0.4]} />
            <meshStandardMaterial color={identity.color} roughness={0.28} />
          </mesh>
        </group>
      ) : null}

      {/* Hampton / Harcourt — twin residential pair cue: rounded top */}
      {lower.includes("hampton") || lower.includes("harcourt") ? (
        <group position={[0, renderHeight + 1, 0]}>
          <mesh>
            <cylinderGeometry args={[span * 0.28, span * 0.4, 10, 12]} />
            <meshStandardMaterial color={identity.accent} roughness={0.4} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[span * 0.22, 12, 8]} />
            <meshStandardMaterial
              color="#e8f0f4"
              emissive="#c8d8e4"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ) : null}

      {/* Novotel — blue shaft + yellow hotel crown */}
      {lower.includes("novotel") ? (
        <group position={[0, renderHeight + 1, 0]}>
          <mesh>
            <boxGeometry args={[span * 0.75, 3.5, span * 0.75]} />
            <meshStandardMaterial
              color="#f0c040"
              emissive="#f0c040"
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>
      ) : null}

      {/* Wardian towers — paired dark/light glass tips */}
      {lower.includes("wardian") ? (
        <group position={[0, renderHeight + 1, 0]}>
          <mesh>
            <boxGeometry args={[span * 0.55, 8, span * 0.35]} />
            <meshStandardMaterial color={identity.accent} roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {/* Landmark East / West — twin residential shafts with offset caps */}
      {lower.includes("landmark east") || lower.includes("landmark west") ? (
        <group position={[0, renderHeight, 0]}>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * span * 0.22, 6, 0]}
              castShadow={castShadow}
            >
              <boxGeometry args={[span * 0.38, 12, span * 0.55]} />
              <meshStandardMaterial
                color={identity.color}
                roughness={0.28}
                metalness={0.12}
              />
            </mesh>
          ))}
          <mesh position={[0, 14, 0]}>
            <boxGeometry args={[span * 0.7, 2.5, span * 0.7]} />
            <meshStandardMaterial
              color={identity.accent}
              emissive={identity.accent}
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ) : null}

      {/* West India Quay — gold crown twin-cap (historic warehouse hotel cue) */}
      {lower.includes("west india quay") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[span * 1.02, 3, span * 1.02]} />
            <meshStandardMaterial
              color="#e8c040"
              emissive="#c8a020"
              emissiveIntensity={0.4}
            />
          </mesh>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * span * 0.28, 8, 0]}>
              <boxGeometry args={[span * 0.32, 8, span * 0.55]} />
              <meshStandardMaterial color="#c8dce8" roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 14, 0]} material={mats.gold}>
            <sphereGeometry args={[1.2, 10, 8]} />
          </mesh>
        </group>
      ) : null}

      {/* Bank of America — red brand stripe + dark glass cap */}
      {lower.includes("bank of america") ? (
        <group>
          <mesh position={[0, renderHeight * 0.78, 0]}>
            <boxGeometry args={[span * 1.05, 3.2, span * 1.05]} />
            <meshStandardMaterial
              color="#e04040"
              emissive="#e04040"
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, renderHeight + 2, 0]}>
            <boxGeometry args={[span * 0.6, 5, span * 0.6]} />
            <meshStandardMaterial color="#2a4050" roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {/* Cascades — stepped cascade silhouette */}
      {lower.includes("cascades") ? (
        <group position={[0, renderHeight, 0]}>
          {[0.85, 0.65, 0.45].map((w, i) => (
            <mesh key={i} position={[0, 2 + i * 4, i * 1.5]}>
              <boxGeometry args={[span * w, 4, span * 0.7]} />
              <meshStandardMaterial color={identity.color} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* South Quay Plaza — dark podium crown + white lip */}
      {lower.includes("south quay") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[span * 0.9, 5, span * 0.9]} />
            <meshStandardMaterial color="#2a3848" roughness={0.32} />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[span * 1.02, 1.5, span * 1.02]} />
            <meshStandardMaterial
              color="#e8f0f4"
              emissive="#d0e0e8"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ) : null}

      {/* Canary Wharf DLR — green canopy + platform lip */}
      {lower.includes("dlr") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[span * 1.2, 1.2, span * 0.9]} />
            <meshStandardMaterial
              color="#2e9a58"
              emissive="#1e8048"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, 4, 0]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[span * 1.15, 0.6, span * 1.1]} />
            <meshStandardMaterial color="#f4fff6" roughness={0.45} />
          </mesh>
        </group>
      ) : null}

      {/* Morgan Stanley — dark shaft + gold band */}
      {lower.includes("morgan stanley") ? (
        <group>
          <mesh position={[0, renderHeight * 0.85, 0]}>
            <boxGeometry args={[span * 1.04, 2.8, span * 1.04]} />
            <meshStandardMaterial
              color="#c9a84a"
              emissive="#a88830"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, renderHeight + 2, 0]}>
            <boxGeometry args={[span * 0.55, 5, span * 0.55]} />
            <meshStandardMaterial color="#1a2830" roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {/* Credit Suisse / Cabot — curved cool-glass crown */}
      {lower.includes("credit suisse") || lower.includes("cabot") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh>
            <cylinderGeometry args={[span * 0.35, span * 0.48, 10, 16]} />
            <meshStandardMaterial color="#d4e4ec" roughness={0.25} metalness={0.1} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <torusGeometry args={[span * 0.32, 0.8, 6, 20]} />
            <meshStandardMaterial
              color="#e8f4fa"
              emissive="#b8d8e8"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ) : null}

      {/* Barclays — teal/green brand crown */}
      {lower.includes("barclays") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[span * 1.05, 3.5, span * 1.05]} />
            <meshStandardMaterial
              color="#20c080"
              emissive="#10a060"
              emissiveIntensity={0.45}
            />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[span * 0.5, 5, span * 0.5]} />
            <meshStandardMaterial color="#0a5a40" roughness={0.35} />
          </mesh>
        </group>
      ) : null}

      {/* Hilton — gold hotel band */}
      {lower.includes("hilton") ? (
        <group position={[0, renderHeight + 1, 0]}>
          <mesh>
            <boxGeometry args={[span * 0.8, 3.5, span * 0.8]} />
            <meshStandardMaterial
              color="#c8a050"
              emissive="#c8a050"
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      ) : null}

      {/* Wintergarden — glass atrium roof cue */}
      {lower.includes("wintergarden") ? (
        <group position={[0, renderHeight, 0]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[span * 0.55, span * 0.55, span * 0.9]} />
            <meshStandardMaterial
              color="#e8f8f0"
              transparent
              opacity={0.75}
              roughness={0.15}
              metalness={0.05}
            />
          </mesh>
        </group>
      ) : null}

      {/* Generic readable cap for other tagged landmarks */}
      {!(
        lower.includes("canada square") ||
        lower.includes("hsbc") ||
        lower === "citi" ||
        lower.startsWith("citi") ||
        lower.includes("newfoundland") ||
        lower.includes("pinnacle") ||
        lower.includes("jp morgan") ||
        lower.includes("40 bank") ||
        lower.includes("hampton") ||
        lower.includes("harcourt") ||
        lower.includes("novotel") ||
        lower.includes("wardian") ||
        lower.includes("landmark east") ||
        lower.includes("landmark west") ||
        lower.includes("west india quay") ||
        lower.includes("bank of america") ||
        lower.includes("cascades") ||
        lower.includes("south quay") ||
        lower.includes("dlr") ||
        lower.includes("morgan stanley") ||
        lower.includes("credit suisse") ||
        lower.includes("cabot") ||
        lower.includes("barclays") ||
        lower.includes("hilton") ||
        lower.includes("wintergarden")
      ) ? (
        <group>
          <mesh position={[0, renderHeight * 0.7, 0]}>
            <boxGeometry args={[span * 1.05, 2.4, span * 1.05]} />
            <meshStandardMaterial
              color={identity.accent}
              emissive={identity.accent}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, renderHeight + 2, 0]}>
            <boxGeometry args={[span * 0.55, 4, span * 0.55]} />
            <meshStandardMaterial color={identity.accent} roughness={0.4} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/**
 * Giza pyramid silhouette — stepped/smooth limestone mass with optional cap.
 */
export function GizaPyramidLandmark({
  position,
  base = 90,
  height = 140,
  capped = false,
  castShadow = true,
}: {
  position: [number, number, number];
  base?: number;
  height?: number;
  capped?: boolean;
  castShadow?: boolean;
}) {
  return (
    <group position={position}>
      <mesh
        position={[0, height * 0.5, 0]}
        castShadow={castShadow}
        material={mats.sand}
      >
        <coneGeometry args={[base * 0.72, height, 4]} />
      </mesh>
      {/* Course banding rings for readable masonry */}
      {[0.25, 0.45, 0.65, 0.82].map((t) => (
        <mesh
          key={t}
          position={[0, height * t, 0]}
          material={mats.sandDark}
        >
          <cylinderGeometry
            args={[
              base * 0.72 * (1 - t) * 1.05,
              base * 0.72 * (1 - t) * 1.12,
              height * 0.04,
              4,
            ]}
          />
        </mesh>
      ))}
      {capped ? (
        <mesh
          position={[0, height * 0.92, 0]}
          material={mats.limestoneCap}
        >
          <coneGeometry args={[base * 0.12, height * 0.16, 4]} />
        </mesh>
      ) : null}
      {/* Entrance niche cue */}
      <mesh position={[0, height * 0.12, base * 0.55]} material={mats.sandDark}>
        <boxGeometry args={[base * 0.08, height * 0.1, base * 0.12]} />
      </mesh>
    </group>
  );
}

/** Great Sphinx–evoking limestone figure (original silhouette). */
export function SphinxLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Recumbent body */}
      <mesh
        position={[0, 6 * s, 0]}
        castShadow={castShadow}
        material={mats.sand}
      >
        <boxGeometry args={[42 * s, 12 * s, 16 * s]} />
      </mesh>
      {/* Haunches */}
      <mesh
        position={[-14 * s, 8 * s, 0]}
        castShadow={castShadow}
        material={mats.sandDark}
      >
        <boxGeometry args={[12 * s, 16 * s, 18 * s]} />
      </mesh>
      {/* Forepaws */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[18 * s, 3 * s, side * 5 * s]}
          castShadow={castShadow}
          material={mats.sand}
        >
          <boxGeometry args={[16 * s, 5 * s, 5 * s]} />
        </mesh>
      ))}
      {/* Neck */}
      <mesh position={[14 * s, 14 * s, 0]} material={mats.sandDark}>
        <boxGeometry args={[8 * s, 10 * s, 10 * s]} />
      </mesh>
      {/* Head */}
      <mesh
        position={[16 * s, 24 * s, 0]}
        castShadow={castShadow}
        material={mats.sand}
      >
        <boxGeometry args={[10 * s, 14 * s, 10 * s]} />
      </mesh>
      {/* Nemes headdress wings */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[14 * s, 24 * s, side * 6 * s]}
          rotation={[0, 0, side * 0.25]}
          material={mats.sandDark}
        >
          <boxGeometry args={[8 * s, 16 * s, 3 * s]} />
        </mesh>
      ))}
      {/* Face plane */}
      <mesh position={[21.2 * s, 24 * s, 0]} material={mats.limestoneCap}>
        <boxGeometry args={[0.6 * s, 10 * s, 8 * s]} />
      </mesh>
    </group>
  );
}

/** Cairo Tower–evoking lattice needle. */
export function CairoTowerLandmark({
  position,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  return (
    <group position={position}>
      <mesh
        position={[0, 55 * s, 0]}
        castShadow={castShadow}
        material={mats.limestoneCap}
      >
        <cylinderGeometry args={[2.2 * s, 6 * s, 110 * s, 8]} />
      </mesh>
      {/* Lattice rings */}
      {[20, 40, 60, 80].map((y) => (
        <mesh
          key={y}
          position={[0, y * s, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={mats.steel}
        >
          <torusGeometry args={[5.5 * s * (1 - y / 140), 0.35 * s, 6, 16]} />
        </mesh>
      ))}
      <mesh position={[0, 118 * s, 0]} material={mats.gold}>
        <coneGeometry args={[3 * s, 16 * s, 8]} />
      </mesh>
    </group>
  );
}

/** Egyptian Museum–evoking coral-red classical block with dome cue. */
export function EgyptianMuseumLandmark({
  position,
  rotation = 0,
  scale = 1,
  castShadow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const s = scale;
  const coral = mats.sandDark;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh
        position={[0, 10 * s, 0]}
        castShadow={castShadow}
        material={coral}
      >
        <boxGeometry args={[55 * s, 20 * s, 28 * s]} />
      </mesh>
      {/* Domed hall */}
      <mesh position={[0, 24 * s, 0]} material={mats.limestoneCap}>
        <sphereGeometry args={[10 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Corner statues plinths */}
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x * 24 * s, 6 * s, z * 12 * s]}
            material={mats.sand}
          >
            <cylinderGeometry args={[2.5 * s, 3 * s, 12 * s, 8]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 22 * s, 14.5 * s]} material={mats.gold}>
        <boxGeometry args={[18 * s, 4 * s, 1.2 * s]} />
      </mesh>
    </group>
  );
}

/**
 * Distant skyline cues. Uses British National Grid projection when present;
 * otherwise places stylised silhouettes west of the circuit for procedural maps.
 */
export function DistantLondonSkyline({ route }: { route: RouteData }) {
  const projection = route.realWorld?.projection;
  const groupRef = useRef<THREE.Group>(null);

  const landmarks = useMemo(() => {
    if (projection) {
      const shard = wgs84ToLocal(
        { latitude: 51.5045, longitude: -0.0865 },
        projection,
      );
      const eye = wgs84ToLocal(
        { latitude: 51.5033, longitude: -0.1195 },
        projection,
      );
      const bigBen = wgs84ToLocal(
        { latitude: 51.5007, longitude: -0.1246 },
        projection,
      );
      const stPauls = wgs84ToLocal(
        { latitude: 51.5138, longitude: -0.0984 },
        projection,
      );
      return { shard, eye, bigBen, stPauls };
    }
    // Procedural Canary: park skyline west of the docklands loop.
    return {
      shard: { x: -900, y: 0, z: 120 },
      eye: { x: -1100, y: 0, z: -80 },
      bigBen: { x: -1200, y: 0, z: -200 },
      stPauls: { x: -1000, y: 0, z: 280 },
    };
  }, [projection]);

  useFrame(({ camera }) => {
    if (!groupRef.current || !landmarks) return;
    const dx = landmarks.shard.x - camera.position.x;
    const dz = landmarks.shard.z - camera.position.z;
    groupRef.current.rotation.y = Math.atan2(dx, dz) * 0.02;
  });

  return (
    <group ref={groupRef} name="distant-london-skyline">
      <group position={[landmarks.shard.x, 0, landmarks.shard.z]}>
        <ShardLandmark
          position={[0, 0, 0]}
          castShadow={false}
          fog={false}
        />
        <LandmarkNameTag
          label="The Shard"
          accent="#003b70"
          height={280}
          scale={1.2}
        />
      </group>
      <group position={[landmarks.eye.x, 48, landmarks.eye.z]}>
        <LondonEyeLandmark
          position={[0, 0, 0]}
          castShadow={false}
          detail={false}
          fog={false}
        />
        <LandmarkNameTag
          label="London Eye"
          accent="#5a8aaa"
          height={40}
          scale={1.15}
        />
      </group>
      <group position={[landmarks.bigBen.x, 0, landmarks.bigBen.z]}>
        <ClockTowerLandmark
          position={[0, 0, 0]}
          scale={1.15}
          castShadow={false}
          fog={false}
        />
        <LandmarkNameTag
          label="Big Ben"
          accent="#8f785a"
          height={85}
          scale={1.2}
        />
      </group>
      <group position={[landmarks.stPauls.x, 0, landmarks.stPauls.z]}>
        <StPaulsLandmark
          position={[0, 0, 0]}
          scale={1.35}
          castShadow={false}
          fog={false}
        />
        <LandmarkNameTag
          label="St Paul's"
          accent="#8a8070"
          height={95}
          scale={1.15}
        />
      </group>
    </group>
  );
}
