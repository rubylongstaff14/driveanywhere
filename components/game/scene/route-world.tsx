"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  createCentreLineGeometry,
  createDirectionArrowGeometry,
  createEdgeLineGeometry,
  createKerbGeometry,
  createLaneLineGeometry,
  createPavementGeometry,
  createPaintUnderlayGeometry,
  createRacingKerbGeometry,
  createRoadShoulderApronGeometry,
  createRoadGeometry,
  createRumbleHatchGeometry,
  createShoulderStripeGeometry,
  createStartChevronGeometry,
  createStartFinishLineGeometry,
  createWheelPathGeometry,
  getRouteBounds,
  type RoadSample,
} from "@/lib/game/road-mesh";
import { createFacadeMaps } from "@/lib/game/building-textures";
import {
  createAsphaltTextures,
  createSidewalkTextures,
} from "@/lib/game/road-textures";
import { RouteDebug } from "@/components/game/scene/route-debug";
import { RealWorldContext } from "@/components/game/scene/real-world-context";
import {
  CairoTowerLandmark,
  CanaryTowerCrown,
  ClockTowerLandmark,
  CountyHallLandmark,
  DistantLondonSkyline,
  EgyptianMuseumLandmark,
  GizaPyramidLandmark,
  isFamousCanaryBuilding,
  LandmarkNameTag,
  LondonEyeLandmark,
  PalaceOfWestminsterLandmark,
  SphinxLandmark,
  StPaulsLandmark,
  ThamesArchBridge,
  TrackOverpassArch,
  TurnWarningSign,
  WestminsterAbbeyLandmark,
} from "@/components/game/scene/landmarks";
import {
  IconicTower,
  resolveIconicKind,
} from "@/components/game/scene/iconic-towers";
import { UniqueCircuitLandmarks } from "@/components/game/scene/unique-landmarks";
import { StreetFill } from "@/components/game/scene/street-fill";
import {
  CityBlockDetail,
  cityRegionFromSlug,
} from "@/components/game/scene/city-block-detail";
import { getLandmarkIdentity } from "@/lib/game/landmark-identity";
import { buildTrackBarriers } from "@/lib/game/track-barriers";
import { buildTracksideFurniture } from "@/lib/game/track-furniture";
import { findTrackOverpasses } from "@/lib/game/track-overpasses";
import { buildTurnSigns } from "@/lib/game/track-signs";
import {
  buildAlpineBackdropPeaks,
  buildAlpineCliffs,
  buildAlpineTerrainPads,
} from "@/lib/game/alpine-terrain";
import { aabbAsphaltClearance } from "@/lib/game/building-road-clearance";
import type { RouteData } from "@/lib/validation/route-data";
import type { QualityConfig } from "@/stores/settings-store";

// ---------------------------------------------------------------------------
// Procedural colour helpers
// ---------------------------------------------------------------------------

const STYLE_COLORS: Record<RouteData["buildings"][number]["style"], string> = {
  london_terrace: "#7a5c4a",
  modern_office: "#6b7d94",
  apartment_block: "#7a8898",
  retail_ground_floor: "#8a6c54",
  warehouse: "#686e78",
  landmark_placeholder: "#8f9cad",
  glass_curtain_wall: "#87a9bd",
  steel_and_glass_tower: "#b8c7d0",
  modern_office_podium: "#718696",
  contemporary_apartment: "#a19a90",
  concrete_office: "#858a8e",
  brick_commercial: "#8e604c",
  dockside_warehouse: "#725849",
  generic_distant_tower: "#7894a8",
};

const STYLE_PALETTES: Partial<
  Record<RouteData["buildings"][number]["style"], string[]>
> = {
  glass_curtain_wall: ["#426f88", "#678da0", "#8aa2ae", "#355c73"],
  steel_and_glass_tower: ["#aebbc2", "#738b99", "#c3cbd0"],
  modern_office_podium: ["#68767f", "#827c72", "#526773"],
  contemporary_apartment: ["#7d8991", "#9d8f82", "#5f7885"],
  concrete_office: ["#777b80", "#98948b", "#626a73"],
  brick_commercial: ["#82513e", "#9b6750", "#6e4438"],
  dockside_warehouse: ["#65483b", "#775747", "#55433b"],
  generic_distant_tower: ["#52768b", "#718e9f", "#465f72"],
};

function variedFacadeColour(
  id: string,
  base: string,
  alternatives: string[] = [],
): string {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const candidates = [base, ...alternatives];
  const colour = new THREE.Color(candidates[(hash >>> 2) % candidates.length]);
  const lightnessShift = (((hash >>> 8) % 23) - 11) / 100;
  const saturationShift = (((hash >>> 16) % 15) - 7) / 100;
  colour.offsetHSL(0, saturationShift, lightnessShift);
  return `#${colour.getHexString()}`;
}

function takeFraction<T>(items: T[], f: number): T[] {
  if (f >= 1) return items;
  const step = 1 / f;
  return items.filter((_, i) => i % step < 1);
}

function nearestRoadSample(
  samples: RoadSample[],
  x: number,
  z: number,
): RoadSample | null {
  let best: RoadSample | null = null;
  let bestDistSq = Infinity;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const dx = sample.position.x - x;
    const dz = sample.position.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = sample;
    }
  }
  return best;
}

function createExtrudedBuilding(
  footprint: RouteData["buildings"][number]["footprint"],
  height: number,
) {
  const points = [...footprint];
  const first = points[0];
  const last = points.at(-1);
  if (last && first.x === last.x && first.z === last.z) points.pop();

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    // Shape Y maps to world -Z after rotating the extrusion upright.
    const x = point.x - cx;
    const y = -(point.z - cz);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.12,
    bevelSegments: 1,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return {
    geometry,
    cx,
    cz,
    width: Math.max(2, maxX - minX),
    depth: Math.max(2, maxZ - minZ),
  };
}

// ---------------------------------------------------------------------------
// London landmark sub-components (route-local only)
// ---------------------------------------------------------------------------

/** Stylised date palm for marina promenades. */
function PalmTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 6.4, 6]} />
        <meshStandardMaterial color="#6a4a28" roughness={0.95} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i / 6) * Math.PI * 2) * 1.4,
            6.6,
            Math.cos((i / 6) * Math.PI * 2) * 1.4,
          ]}
          rotation={[0.55, (i / 6) * Math.PI * 2, 0.15]}
          castShadow
        >
          <boxGeometry args={[0.12, 2.8, 0.85]} />
          <meshStandardMaterial color="#3a7040" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Neon-ish Times Square advertising boards. */
function TimesSquareBoards({ cx, cz }: { cx: number; cz: number }) {
  const boards: Array<{
    pos: [number, number, number];
    rot: number;
    w: number;
    h: number;
    color: string;
  }> = [
    { pos: [cx - 28, 9, cz + 8], rot: 0.4, w: 18, h: 14, color: "#ff3355" },
    { pos: [cx + 22, 11, cz - 6], rot: -0.55, w: 22, h: 16, color: "#33aaff" },
    { pos: [cx - 8, 14, cz + 30], rot: 0.1, w: 26, h: 12, color: "#ffcc22" },
    { pos: [cx + 34, 8, cz + 24], rot: -1.1, w: 14, h: 18, color: "#44ff88" },
    { pos: [cx - 36, 12, cz - 18], rot: 1.2, w: 16, h: 20, color: "#aa44ff" },
  ];
  return (
    <group>
      {boards.map((b, i) => (
        <group key={i} position={b.pos} rotation={[0, b.rot, 0]}>
          <mesh castShadow>
            <boxGeometry args={[b.w, b.h, 0.45]} />
            <meshStandardMaterial
              color={b.color}
              emissive={b.color}
              emissiveIntensity={0.55}
              roughness={0.35}
              metalness={0.15}
            />
          </mesh>
          <mesh position={[0, 0, -0.4]}>
            <boxGeometry args={[b.w + 0.6, b.h + 0.6, 0.35]} />
            <meshStandardMaterial color="#1a1a22" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Central Park lawn patch with a few canopy trees. */
function CentralParkGreen({
  cx,
  cz,
  width,
  depth,
}: {
  cx: number;
  cz: number;
  width: number;
  depth: number;
}) {
  return (
    <group position={[cx, 0, cz]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#3d6a3a" roughness={0.95} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[width * 0.12, 0.07, -depth * 0.1]}
      >
        <planeGeometry args={[width * 0.35, depth * 0.28]} />
        <meshStandardMaterial color="#2f5a48" roughness={0.92} />
      </mesh>
      {[
        [-width * 0.28, depth * 0.2],
        [width * 0.22, -depth * 0.15],
        [-width * 0.1, -depth * 0.28],
        [width * 0.3, depth * 0.25],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.5, 4.4, 6]} />
            <meshStandardMaterial color="#4a3420" roughness={0.95} />
          </mesh>
          <mesh position={[0, 5.4, 0]} castShadow>
            <sphereGeometry args={[2.4 - (i % 3) * 0.2, 8, 6]} />
            <meshStandardMaterial color="#2f5a32" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Thames river plane. */
function ThamesRiver({
  cx,
  cz,
  length,
  width,
}: {
  cx: number;
  cz: number;
  length: number;
  width: number;
}) {
  return (
    <group>
      {/* Main water body */}
      <mesh position={[cx, -0.8, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length, 4, 4]} />
        <meshStandardMaterial
          color="#2a4a6a"
          roughness={0.15}
          metalness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* Thames wall / embankment retaining edge */}
      <mesh position={[cx, -0.1, cz]}>
        <boxGeometry args={[width + 2, 0.9, length + 2]} />
        <meshStandardMaterial color="#555e6a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Checkpoint gate arch
// ---------------------------------------------------------------------------

function CheckpointGate({
  x,
  z,
  rotation,
  width,
  color,
}: {
  x: number;
  z: number;
  rotation: number;
  width: number;
  color: string;
}) {
  const halfW = width / 2 + 0.8;
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Ground stripe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <planeGeometry args={[width + 0.2, 2.2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Vertical posts */}
      {([-halfW, halfW] as const).map((ox) => (
        <mesh key={ox} position={[ox, 2.4, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 4.8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* Overhead beam */}
      <mesh position={[0, 4.9, 0]} castShadow>
        <boxGeometry args={[width + 2, 0.28, 0.28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RouteWorldProps {
  route: RouteData;
  samples: RoadSample[];
  quality: QualityConfig;
  desert?: boolean;
}

export function RouteWorld({
  route,
  samples,
  quality,
  desert = false,
}: RouteWorldProps) {
  const buildingRefs = useRef<Array<THREE.Group | null>>([]);
  const cullFrame = useRef(0);
  // ---- geometry (memo to avoid recomputing every render) ----
  const roadGeo = useMemo(() => createRoadGeometry(samples), [samples]);
  const shoulderApronGeo = useMemo(
    () => createRoadShoulderApronGeometry(samples),
    [samples],
  );
  const centreGeo = useMemo(() => createCentreLineGeometry(samples), [samples]);
  const edgeGeo = useMemo(() => createEdgeLineGeometry(samples), [samples]);
  const laneGeo = useMemo(() => createLaneLineGeometry(samples), [samples]);
  const shoulderGeo = useMemo(
    () => createShoulderStripeGeometry(samples),
    [samples],
  );
  const paintUnderlayGeo = useMemo(
    () => createPaintUnderlayGeometry(samples),
    [samples],
  );
  const wheelPathGeo = useMemo(
    () => createWheelPathGeometry(samples),
    [samples],
  );
  const rumbleGeo = useMemo(
    () => createRumbleHatchGeometry(samples),
    [samples],
  );
  const arrowGeo = useMemo(
    () => createDirectionArrowGeometry(samples),
    [samples],
  );
  const startChevronGeo = useMemo(
    () => createStartChevronGeometry(samples),
    [samples],
  );
  const startFinishGeo = useMemo(
    () => createStartFinishLineGeometry(samples),
    [samples],
  );
  const kerbGeo = useMemo(() => createKerbGeometry(samples), [samples]);
  const racingKerbGeo = useMemo(
    () => createRacingKerbGeometry(samples),
    [samples],
  );
  const leftPave = useMemo(
    () => createPavementGeometry(samples, "left", 3.5),
    [samples],
  );
  const rightPave = useMemo(
    () => createPavementGeometry(samples, "right", 3.5),
    [samples],
  );
  const bounds = useMemo(() => getRouteBounds(route), [route]);
  const overpasses = useMemo(() => findTrackOverpasses(samples), [samples]);
  const turnSigns = useMemo(() => buildTurnSigns(samples), [samples]);
  const facades = useMemo(
    () => ({
      glass: createFacadeMaps("glass"),
      glassVertical: createFacadeMaps("glass_vertical"),
      glassDiagrid: createFacadeMaps("glass_diagrid"),
      brick: createFacadeMaps("brick"),
      concrete: createFacadeMaps("concrete"),
      sandstone: createFacadeMaps("sandstone"),
    }),
    [],
  );
  const asphalt = useMemo(() => createAsphaltTextures(), []);
  const sidewalk = useMemo(() => createSidewalkTextures(), []);

  useEffect(
    () => () => {
      roadGeo.dispose();
      shoulderApronGeo.dispose();
      centreGeo.dispose();
      edgeGeo.dispose();
      laneGeo.dispose();
      shoulderGeo.dispose();
      paintUnderlayGeo.dispose();
      wheelPathGeo.dispose();
      rumbleGeo.dispose();
      arrowGeo.dispose();
      startChevronGeo.dispose();
      startFinishGeo.dispose();
      kerbGeo.dispose();
      racingKerbGeo.dispose();
      leftPave.dispose();
      rightPave.dispose();
      for (const facade of Object.values(facades)) {
        facade.color.dispose();
        facade.normal.dispose();
        facade.emissive.dispose();
      }
      asphalt.color.dispose();
      asphalt.roughness.dispose();
      asphalt.normal.dispose();
      sidewalk.color.dispose();
      sidewalk.roughness.dispose();
      sidewalk.normal.dispose();
    },
    [
      roadGeo,
      shoulderApronGeo,
      centreGeo,
      edgeGeo,
      laneGeo,
      shoulderGeo,
      paintUnderlayGeo,
      wheelPathGeo,
      rumbleGeo,
      arrowGeo,
      startChevronGeo,
      startFinishGeo,
      kerbGeo,
      racingKerbGeo,
      leftPave,
      rightPave,
      facades,
      asphalt,
      sidewalk,
    ],
  );

  // ---- building memos ----
  const buildings = useMemo(
    () =>
      route.buildings.map((b) => {
        const renderHeight = Math.max(1, b.height - b.baseHeight);
        const extruded = createExtrudedBuilding(b.footprint, renderHeight);
        const isAlpsRoute = route.slug === "alps-mountain-pass";
        const nearest = isAlpsRoute
          ? nearestRoadSample(samples, extruded.cx, extruded.cz)
          : null;
        const groundY = isAlpsRoute
          ? Math.max(0, (nearest?.position.y ?? 0) + b.baseHeight)
          : b.baseHeight;
        const facade =
          b.name === "Newfoundland Quay"
            ? facades.glassDiagrid
            : b.style === "steel_and_glass_tower"
              ? facades.glassVertical
              : b.facadeMaterial === "glass"
                ? facades.glass
                : b.facadeMaterial === "sandstone"
                  ? facades.sandstone
                  : b.facadeMaterial === "concrete"
                    ? facades.concrete
                    : facades.brick;
        return {
          ...b,
          ...extruded,
          renderHeight,
          groundY,
          // Facade maps are shared by material family. Cloning one texture for
          // every building uploaded hundreds of duplicate GPU textures.
          tex: facade.color,
          normalTex: facade.normal,
          emissiveTex: facade.emissive,
          facadeColour: (() => {
            const identity = getLandmarkIdentity(b.name, b.height);
            if (identity) return identity.color;
            return variedFacadeColour(
              b.id,
              b.facadeColor ?? STYLE_COLORS[b.style],
              b.facadeColor ? [] : (STYLE_PALETTES[b.style] ?? []),
            );
          })(),
          landmark: getLandmarkIdentity(b.name, b.height),
        };
      }),
    [route.buildings, facades, samples, route.slug],
  );

  const visibleBuildings = useMemo(() => {
    // Hide any building whose AABB still clips the racing line.
    const filtered = buildings.filter((b) => {
      const clear = aabbAsphaltClearance(
        samples,
        b.cx,
        b.cz,
        Math.max(0.9, b.width / 2),
        Math.max(0.9, b.depth / 2),
      );
      return clear >= 1.0;
    });
    // Named heroes and tall skyline silhouettes always remain. Generic infill
    // is sampled deterministically by tier to cut hundreds of draw calls while
    // keeping the city visually dense and stable between frames.
    if (quality.sceneryDensity >= 0.95) return filtered;
    const stride =
      quality.sceneryDensity >= 0.8
        ? 5
        : quality.sceneryDensity >= 0.55
          ? 3
          : 4;
    const keep =
      quality.sceneryDensity >= 0.8
        ? 4
        : quality.sceneryDensity >= 0.55
          ? 2
          : 1;
    return filtered.filter(
      (b, i) =>
        Boolean(b.landmark) ||
        Boolean(b.name) ||
        b.height >= 55 ||
        i % stride < keep,
    );
  }, [buildings, samples, quality.sceneryDensity]);

  const streetOccupied = useMemo(
    () =>
      visibleBuildings.map((b) => ({
        x: b.cx,
        z: b.cz,
        r: Math.max(b.width, b.depth) * 0.55,
      })),
    [visibleBuildings],
  );

  useEffect(
    () => () => {
      for (const building of buildings) {
        building.geometry.dispose();
      }
    },
    [buildings],
  );

  // ---- scenery filtering ----
  const streetLights = useMemo(
    () =>
      takeFraction(
        route.sceneryObjects.filter((o) => o.type === "street_light"),
        quality.sceneryDensity,
      ).map((o) => {
        const nearest = nearestRoadSample(samples, o.position.x, o.position.z);
        const nearTrack =
          nearest &&
          Math.hypot(
            nearest.position.x - o.position.x,
            nearest.position.z - o.position.z,
          ) <=
            route.roadWidth + 18;
        return {
          ...o,
          position: {
            ...o.position,
            // Snap trackside lights to the ribbon elevation; distant lights fall
            // back to the world floor so they never hover over empty space.
            y: nearTrack ? nearest.position.y : 0,
          },
        };
      }),
    [quality.sceneryDensity, route.sceneryObjects, route.roadWidth, samples],
  );
  const trees = useMemo(
    () =>
      takeFraction(
        route.sceneryObjects.filter((o) => o.type === "tree"),
        quality.sceneryDensity,
      ).map((o) => {
        const nearest = nearestRoadSample(samples, o.position.x, o.position.z);
        const nearTrack =
          nearest &&
          Math.hypot(
            nearest.position.x - o.position.x,
            nearest.position.z - o.position.z,
          ) <=
            route.roadWidth + 24;
        return {
          ...o,
          position: {
            ...o.position,
            y: nearTrack ? Math.max(0, nearest.position.y - 0.2) : 0,
          },
        };
      }),
    [quality.sceneryDensity, route.sceneryObjects, route.roadWidth, samples],
  );

  // ---- ground / wall dimensions ----
  // Oversized pad so long circuits (Egypt D-lap, Embankment) never run off
  // the collision floor and drop the car "under the map".
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const w = Math.max(900, spanX + 700);
  const d = Math.max(900, spanZ + 700);
  const gcx = (bounds.minX + bounds.maxX) / 2;
  const gcz = (bounds.minZ + bounds.maxZ) / 2;

  // Variable-length Tecpro modules — shared builder keeps audit + game in sync.
  const walls = useMemo(() => buildTrackBarriers(samples), [samples]);
  // Keep full collider set; thin visuals on low quality for FPS.
  const visualWalls = useMemo(() => {
    if (quality.sceneryDensity >= 0.9) return walls;
    const step = quality.sceneryDensity < 0.5 ? 2 : 1;
    return step === 1 ? walls : walls.filter((_, i) => i % step === 0);
  }, [walls, quality.sceneryDensity]);
  const furniture = useMemo(
    () => buildTracksideFurniture(samples, visualWalls),
    [samples, visualWalls],
  );
  const tyreStacks = useMemo(
    () => furniture.filter((item) => item.kind === "tyres"),
    [furniture],
  );
  const bollards = useMemo(
    () => furniture.filter((item) => item.kind === "bollard"),
    [furniture],
  );
  const marshalPosts = useMemo(
    () => furniture.filter((item) => item.kind === "post"),
    [furniture],
  );

  // Solid building AABBs near the ribbon so you can't drive through them.
  // Never place a collider whose box intersects asphalt — that creates
  // "invisible wall / solid building on the track" bugs (e.g. Rio Museum).
  const buildingColliders = useMemo(() => {
    const corridor =
      route.roadWidth / 2 + (route.slug === "westminster-sprint" ? 96 : 72);
    const scored = buildings.map((b) => {
      let best = Infinity;
      for (let i = 0; i < samples.length; i += 3) {
        const s = samples[i];
        best = Math.min(
          best,
          Math.hypot(b.cx - s.position.x, b.cz - s.position.z),
        );
      }
      const hw = Math.max(0.9, b.width / 2);
      const hd = Math.max(0.9, b.depth / 2);
      const asphaltClear = aabbAsphaltClearance(samples, b.cx, b.cz, hw, hd);
      const named = Boolean(b.name);
      return { b, best, named, asphaltClear };
    });
    const near = scored
      // Keep at least ~1.2 m clear of asphalt edge (car half-width + margin).
      .filter((x) => x.asphaltClear >= 1.2)
      .filter((x) => x.best < corridor || x.named)
      .sort((a, b) => {
        if (a.named !== b.named) return a.named ? -1 : 1;
        return a.best - b.best;
      })
      .slice(0, quality.buildingColliderCap)
      .map((x) => x.b);
    return near;
  }, [buildings, samples, route.roadWidth, quality.buildingColliderCap]);

  // ---- route-specific environment ----
  const isWestminster = route.slug === "westminster-sprint";
  const isEmbankment = route.slug === "embankment-run";
  const isCanary = route.slug === "canary-wharf-loop";
  const isEgypt = route.slug === "egypt-pyramids";
  const isDubai = route.slug === "dubai-marina-circuit";
  const isNewYork = route.slug === "new-york-harbor-circuit";
  const isTokyo = route.slug === "tokyo-drift-circuit";
  const isAlps = route.slug === "alps-mountain-pass";
  const isRio = route.slug === "rio-coast-circuit";

  const alpineTerrain = useMemo(
    () =>
      isAlps
        ? [
            ...buildAlpineTerrainPads(samples, route.roadWidth),
            ...buildAlpineCliffs(samples, route.roadWidth),
          ]
        : [],
    [isAlps, samples, route.roadWidth],
  );
  const alpinePeaks = useMemo(
    () => (isAlps ? buildAlpineBackdropPeaks(samples) : []),
    [isAlps, samples],
  );

  // River sits east of the loop (high-x side) for Westminster and Embankment
  const riverCX = bounds.maxX + 60;
  const riverCZ = gcz;
  const riverLen = bounds.maxZ - bounds.minZ + 100;

  // Anchor iconic Westminster meshes on the harbour viewing straight so
  // Big Ben / Parliament read from the racing line (not AABB corners).
  const westminsterLandmarks = useMemo(() => {
    if (!isWestminster || samples.length < 8) return null;
    let harbour = samples[0];
    let harbourScore = -Infinity;
    for (const s of samples) {
      // Prefer high-X riverside samples mid-circuit (harbour / Tabac).
      const score = s.position.x * 2 + s.position.z * 0.15;
      if (score > harbourScore) {
        harbourScore = score;
        harbour = s;
      }
    }
    // East = toward +X river. Prefer the sample normal that points east.
    const eastSign = harbour.normal.x >= 0 ? 1 : -1;
    const nx = harbour.normal.x * eastSign;
    const nz = harbour.normal.z * eastSign;
    const hx = harbour.position.x;
    const hz = harbour.position.z;
    // Abbey sits on the inland (west) return — find min-X sample near mid-Z.
    let abbey = samples[0];
    let abbeyScore = Infinity;
    for (const s of samples) {
      const score = s.position.x - Math.abs(s.position.z - hz) * 0.2;
      if (score < abbeyScore) {
        abbeyScore = score;
        abbey = s;
      }
    }
    const abbeyWest = abbey.normal.x <= 0 ? 1 : -1;
    return {
      bigBen: [hx + nx * 52, 0, hz + nz * 52 - 58] as [number, number, number],
      parliament: [hx + nx * 108, 0, hz + nz * 108 + 42] as [
        number,
        number,
        number,
      ],
      abbey: [
        abbey.position.x + abbey.normal.x * abbeyWest * 62,
        0,
        abbey.position.z + abbey.normal.z * abbeyWest * 62,
      ] as [number, number, number],
      bridge: [hx + nx * 72, 0, hz + nz * 72 + 90] as [number, number, number],
      eye: [hx + nx * 95, 0, hz + nz * 95 - 120] as [number, number, number],
      wall: [hx + nx * 22, 1.2, hz] as [number, number, number],
      yaw: Math.atan2(nx, nz),
    };
  }, [isWestminster, samples]);

  // Anchor Embankment icons along the Thames mega-straight (high-X side).
  const embankmentLandmarks = useMemo(() => {
    if (!isEmbankment || samples.length < 8) return null;
    let north = samples[0];
    let south = samples[0];
    let mid = samples[0];
    let northScore = -Infinity;
    let southScore = Infinity;
    let midScore = Infinity;
    for (const s of samples) {
      if (s.position.z > northScore) {
        northScore = s.position.z;
        north = s;
      }
      if (s.position.z < southScore) {
        southScore = s.position.z;
        south = s;
      }
      const midDist = Math.abs(s.position.z - gcz) - s.position.x * 0.15;
      if (midDist < midScore) {
        midScore = midDist;
        mid = s;
      }
    }
    const eastOf = (s: (typeof samples)[number], dist: number, y = 0) => {
      const eastSign = s.normal.x >= 0 ? 1 : -1;
      return [
        s.position.x + s.normal.x * eastSign * dist,
        y,
        s.position.z + s.normal.z * eastSign * dist,
      ] as [number, number, number];
    };
    return {
      eye: eastOf(mid, 95, 48),
      countyHall: eastOf(mid, 78),
      bigBen: eastOf(north, 70),
      parliament: eastOf(south, 72),
      stPauls: [bounds.minX - 55, 0, gcz - 60] as [number, number, number],
      bridge: [bounds.maxX + 45, 0, gcz] as [number, number, number],
      wall: [bounds.maxX + 4, 1.2, gcz] as [number, number, number],
    };
  }, [isEmbankment, samples, gcz, bounds.minX, bounds.maxX]);

  // Anchor the Giza trio on the Kemmel crest so they sit in the east vista
  // with clear air between the racing line and the plateau.
  const egyptLandmarks = useMemo(() => {
    if (!isEgypt || samples.length < 8) return null;
    let kemmel = samples[0];
    let best = -Infinity;
    for (const s of samples) {
      // Kemmel = northern crest with a view toward +X desert.
      const score = s.position.z * 1.4 + s.position.x * 0.35 + s.position.y * 8;
      if (score > best) {
        best = score;
        kemmel = s;
      }
    }
    const eastSign = kemmel.normal.x >= 0 ? 1 : -1;
    const nx = kemmel.normal.x * eastSign;
    const nz = kemmel.normal.z * eastSign;
    // Prefer a clean +X offset if the sample normal isn't east-ish.
    const ex = Math.abs(nx) > 0.35 ? nx : 1;
    const ez = Math.abs(nx) > 0.35 ? nz : 0;
    const hx = kemmel.position.x;
    const hz = kemmel.position.z;
    return {
      great: [hx + ex * 220, 0, hz + ez * 220 + 35] as [number, number, number],
      khafre: [hx + ex * 310, 0, hz + ez * 310 + 110] as [
        number,
        number,
        number,
      ],
      menkaure: [hx + ex * 360, 0, hz + ez * 360 - 50] as [
        number,
        number,
        number,
      ],
      sphinx: [hx + ex * 180, 0, hz + ez * 180 - 95] as [
        number,
        number,
        number,
      ],
      museum: [hx - Math.abs(ex) * 160 - 40, 0, hz - 120] as [
        number,
        number,
        number,
      ],
      cairoTower: [bounds.minX - 160, 0, gcz] as [number, number, number],
    };
  }, [isEgypt, samples, bounds.minX, gcz]);

  // Frustum culling cannot reject a tall building whose bounding sphere
  // touches the view. Distance-cull the skyline in one cheap pass instead of
  // running a hook per building. Fog hides the transition.
  useFrame(({ camera }) => {
    cullFrame.current = (cullFrame.current + 1) % 12;
    if (cullFrame.current !== 0) return;
    const maximumDistance = quality.drawDistance;
    const maximumDistanceSq = maximumDistance * maximumDistance;
    const skylineDistanceSq = maximumDistanceSq * 1.35;
    for (let index = 0; index < visibleBuildings.length; index += 1) {
      const building = visibleBuildings[index];
      const group = buildingRefs.current[index];
      if (!group) continue;
      const dx = building.cx - camera.position.x;
      const dz = building.cz - camera.position.z;
      const distanceSq = dx * dx + dz * dz;
      const famous = isFamousCanaryBuilding(building.name, building.height);
      group.visible = famous
        ? distanceSq <= skylineDistanceSq
        : distanceSq <= maximumDistanceSq;
    }
  });

  return (
    <group>
      <RouteDebug route={route} />
      <RealWorldContext route={route} />
      {(isCanary || isWestminster || isEmbankment) &&
      quality.drawDistance >= 280 ? (
        <DistantLondonSkyline route={route} />
      ) : null}
      {/* ---- Ground plane (primary car collision surface) ---- */}
      <RigidBody type="fixed" colliders={false} position={[gcx, 0, gcz]}>
        {/* Giant plane skips shadow receiving — road mesh carries contact shadows. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            color={
              isEgypt
                ? "#c4a06a"
                : isDubai
                  ? "#c2a878"
                  : isNewYork
                    ? "#6a7580"
                    : isAlps
                      ? "#4a6b3a"
                      : isRio
                        ? "#5a8a5a"
                        : isTokyo
                          ? "#3a3a44"
                          : "#7a848e"
            }
            roughness={1}
          />
        </mesh>
        {/* Thick world floor — top flush with y=0; oversized so circuits can't escape. */}
        <CuboidCollider args={[w / 2, 8, d / 2]} position={[0, -8, 0]} />
      </RigidBody>

      {/* ---- Shoulder apron (blends road into the world floor) ---- */}
      <mesh geometry={shoulderApronGeo} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          color="#a8b0b8"
          roughness={0.96}
          metalness={0.01}
        />
      </mesh>

      {/* ---- Road surface (solid asphalt deck) ---- */}
      <mesh geometry={roadGeo} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          map={asphalt.color}
          roughnessMap={asphalt.roughness}
          normalMap={asphalt.normal}
          color={desert ? "#a8aeb8" : "#dce2e8"}
          roughness={0.9}
          metalness={desert ? 0.02 : 0.015}
          normalScale={[0.28, 0.28]}
          envMapIntensity={desert ? 0.05 : 0.18}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <mesh geometry={paintUnderlayGeo} renderOrder={2}>
        <meshBasicMaterial
          color="#8a929c"
          toneMapped={false}
          depthWrite={false}
          transparent
          opacity={0.14}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>

      {/* ---- Road markings (unlit so paint stays bright in dusk/desert) ---- */}
      <mesh geometry={centreGeo} renderOrder={4}>
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-8}
          polygonOffsetUnits={-8}
        />
      </mesh>
      <mesh geometry={laneGeo} renderOrder={4}>
        <meshBasicMaterial
          color="#f7f7f2"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-7}
          polygonOffsetUnits={-7}
        />
      </mesh>
      <mesh geometry={shoulderGeo} renderOrder={3}>
        <meshBasicMaterial
          color="#fff6d6"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-6}
          polygonOffsetUnits={-6}
        />
      </mesh>
      <mesh geometry={rumbleGeo} renderOrder={4}>
        <meshBasicMaterial
          color="#f0c93a"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-7}
          polygonOffsetUnits={-7}
        />
      </mesh>
      <mesh geometry={arrowGeo} renderOrder={5}>
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-9}
          polygonOffsetUnits={-9}
        />
      </mesh>
      <mesh geometry={startChevronGeo} renderOrder={5}>
        <meshBasicMaterial
          color="#f4d35e"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-9}
          polygonOffsetUnits={-9}
        />
      </mesh>
      <mesh geometry={edgeGeo} renderOrder={4}>
        <meshBasicMaterial
          color="#f2c230"
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-8}
          polygonOffsetUnits={-8}
        />
      </mesh>
      <mesh geometry={startFinishGeo} renderOrder={5}>
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-9}
          polygonOffsetUnits={-9}
        />
      </mesh>

      {/* ---- Kerbs ---- */}
      <mesh geometry={kerbGeo} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          map={sidewalk.color}
          roughnessMap={sidewalk.roughness}
          normalMap={sidewalk.normal}
          normalScale={[0.4, 0.4]}
          color="#8a9098"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <mesh geometry={racingKerbGeo} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          vertexColors
          roughness={0.55}
          metalness={0.08}
          envMapIntensity={0.35}
        />
      </mesh>

      {/* ---- Pavements ---- */}
      <mesh geometry={leftPave} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          map={sidewalk.color}
          roughnessMap={sidewalk.roughness}
          normalMap={sidewalk.normal}
          normalScale={[0.55, 0.55]}
          color="#a8adb4"
          roughness={0.92}
          metalness={0.03}
        />
      </mesh>
      <mesh geometry={rightPave} receiveShadow={quality.shadows}>
        <meshStandardMaterial
          map={sidewalk.color}
          roughnessMap={sidewalk.roughness}
          normalMap={sidewalk.normal}
          normalScale={[0.55, 0.55]}
          color="#a8adb4"
          roughness={0.92}
          metalness={0.03}
        />
      </mesh>

      {/* ---- Invisible Tecpro colliders (thin, outside the racing line) ---- */}
      <RigidBody type="fixed" colliders={false}>
        {walls.map((wall) => (
          <CuboidCollider
            key={wall.key}
            args={[0.32, 0.58, wall.hl * 0.92]}
            position={wall.pos}
            rotation={wall.rot}
          />
        ))}
      </RigidBody>

      {/* Building AABBs near the track — stops drive-through glitches */}
      <RigidBody type="fixed" colliders={false}>
        {buildingColliders.map((b) => {
          const h = Math.max(4, b.renderHeight);
          // Match the extruded footprint — no inflate into the racing line.
          const hw = Math.max(0.9, b.width / 2);
          const hd = Math.max(0.9, b.depth / 2);
          return (
            <CuboidCollider
              key={`bcol-${b.id}`}
              args={[hw, h / 2, hd]}
              position={[b.cx, b.groundY + h / 2, b.cz]}
            />
          );
        })}
      </RigidBody>

      {/* Alpine terrain is visual-only. Tecpro/stone ribbon barriers define the
          legal road edge; large cliff boxes caused false blockages on hairpins. */}

      {/* F1 Tecpro — city circuits only (Alps uses stone walls) */}
      {!isAlps && (
        <>
          {([0, 1] as const).map((parity) => {
            const barriers = visualWalls.filter(
              (wall) => wall.stripe === parity,
            );
            return (
              <Instances key={`tecpro-${parity}`} limit={barriers.length + 1}>
                <boxGeometry args={[0.7, 0.78, 1.85]} />
                <meshStandardMaterial
                  color={parity === 0 ? "#f4f4f1" : "#d0102e"}
                  roughness={0.55}
                  metalness={0.02}
                />
                {barriers.map((wall) => (
                  <Instance
                    key={`tecpro-body-${wall.key}`}
                    position={[wall.pos[0], wall.pos[1] + 0.06, wall.pos[2]]}
                    rotation={wall.rot}
                    scale={[1, 1, (wall.hl * 2) / 1.85]}
                  />
                ))}
              </Instances>
            );
          })}
          {([0, 1] as const).map((parity) => {
            const barriers = visualWalls.filter(
              (wall) => wall.stripe === parity,
            );
            return (
              <Instances
                key={`tecpro-mid-${parity}`}
                limit={barriers.length + 1}
              >
                <boxGeometry args={[0.74, 0.14, 1.85]} />
                <meshStandardMaterial
                  color={parity === 0 ? "#c8102e" : "#f4f4f1"}
                  roughness={0.5}
                  metalness={0.03}
                />
                {barriers.map((wall) => (
                  <Instance
                    key={`tecpro-mid-${wall.key}`}
                    position={[wall.pos[0], wall.pos[1] + 0.22, wall.pos[2]]}
                    rotation={wall.rot}
                    scale={[1, 1, (wall.hl * 2) / 1.85]}
                  />
                ))}
              </Instances>
            );
          })}
          {([0, 1] as const).map((parity) => {
            const barriers = visualWalls.filter(
              (wall) => wall.stripe === parity,
            );
            return (
              <Instances
                key={`tecpro-top-${parity}`}
                limit={barriers.length + 1}
              >
                <boxGeometry args={[0.66, 0.34, 1.85]} />
                <meshStandardMaterial
                  color={parity === 0 ? "#efecea" : "#b80e28"}
                  roughness={0.48}
                  metalness={0.04}
                />
                {barriers.map((wall) => (
                  <Instance
                    key={`tecpro-top-${wall.key}`}
                    position={[wall.pos[0], wall.pos[1] + 0.52, wall.pos[2]]}
                    rotation={wall.rot}
                    scale={[1, 1, (wall.hl * 2) / 1.85]}
                  />
                ))}
              </Instances>
            );
          })}
          <Instances limit={visualWalls.length + 1}>
            <boxGeometry args={[0.78, 0.18, 1.85]} />
            <meshStandardMaterial
              color="#1a1c20"
              roughness={0.92}
              metalness={0.02}
            />
            {visualWalls.map((wall) => (
              <Instance
                key={`tecpro-base-${wall.key}`}
                position={[wall.pos[0], wall.pos[1] - 0.38, wall.pos[2]]}
                rotation={wall.rot}
                scale={[1, 1, (wall.hl * 2) / 1.85]}
              />
            ))}
          </Instances>
          <Instances limit={visualWalls.length + 1}>
            <boxGeometry args={[0.1, 0.14, 1.85]} />
            <meshStandardMaterial
              color="#d0d6dc"
              roughness={0.28}
              metalness={0.82}
            />
            {visualWalls.map((wall) => (
              <Instance
                key={`armco-${wall.key}`}
                position={[wall.pos[0], wall.pos[1] + 0.78, wall.pos[2]]}
                rotation={wall.rot}
                scale={[1, 1, (wall.hl * 2) / 1.85]}
              />
            ))}
          </Instances>
          <Instances limit={Math.ceil(visualWalls.length / 3) + 1}>
            <cylinderGeometry args={[0.045, 0.045, 2.6, 6]} />
            <meshStandardMaterial
              color="#8a949e"
              roughness={0.35}
              metalness={0.65}
            />
            {visualWalls
              .filter((_, index) => index % 3 === 0)
              .map((wall) => (
                <Instance
                  key={`fence-post-${wall.key}`}
                  position={[wall.pos[0], wall.pos[1] + 1.35, wall.pos[2]]}
                  rotation={wall.rot}
                />
              ))}
          </Instances>
        </>
      )}

      {/* Alpine stone / timber guardrail */}
      {isAlps && (
        <>
          <Instances limit={visualWalls.length + 1}>
            <boxGeometry args={[0.55, 0.95, 1.85]} />
            <meshStandardMaterial
              color="#6a6e72"
              roughness={0.94}
              flatShading
            />
            {visualWalls.map((wall) => (
              <Instance
                key={`alps-stone-${wall.key}`}
                position={[wall.pos[0], wall.pos[1] + 0.05, wall.pos[2]]}
                rotation={wall.rot}
                scale={[1, 1, (wall.hl * 2) / 1.85]}
              />
            ))}
          </Instances>
          <Instances limit={visualWalls.length + 1}>
            <boxGeometry args={[0.22, 0.18, 1.85]} />
            <meshStandardMaterial color="#5c4332" roughness={0.88} />
            {visualWalls.map((wall) => (
              <Instance
                key={`alps-rail-${wall.key}`}
                position={[wall.pos[0], wall.pos[1] + 0.72, wall.pos[2]]}
                rotation={wall.rot}
                scale={[1, 1, (wall.hl * 2) / 1.85]}
              />
            ))}
          </Instances>
        </>
      )}

      <Instances limit={Math.max(1, tyreStacks.length)}>
        <torusGeometry args={[0.32, 0.11, 6, 10]} />
        <meshStandardMaterial
          color="#1a1c20"
          roughness={0.92}
          metalness={0.04}
        />
        {tyreStacks.map((item) => (
          <Instance
            key={`${item.key}-a`}
            position={[item.pos[0], item.pos[1] + 0.12, item.pos[2]]}
            rotation={[Math.PI / 2, item.rot[1], 0]}
          />
        ))}
      </Instances>
      <Instances limit={Math.max(1, tyreStacks.length)}>
        <torusGeometry args={[0.32, 0.11, 6, 10]} />
        <meshStandardMaterial
          color="#2a2e34"
          roughness={0.9}
          metalness={0.04}
        />
        {tyreStacks.map((item) => (
          <Instance
            key={`${item.key}-b`}
            position={[item.pos[0], item.pos[1] + 0.34, item.pos[2]]}
            rotation={[Math.PI / 2, item.rot[1] + 0.4, 0]}
          />
        ))}
      </Instances>
      <Instances limit={Math.max(1, tyreStacks.length)}>
        <torusGeometry args={[0.32, 0.11, 6, 10]} />
        <meshStandardMaterial
          color="#14161a"
          roughness={0.94}
          metalness={0.03}
        />
        {tyreStacks.map((item) => (
          <Instance
            key={`${item.key}-c`}
            position={[item.pos[0], item.pos[1] + 0.56, item.pos[2]]}
            rotation={[Math.PI / 2, item.rot[1] + 0.8, 0]}
          />
        ))}
      </Instances>
      <Instances limit={Math.max(1, bollards.length)}>
        <cylinderGeometry args={[0.09, 0.11, 0.85, 8]} />
        <meshStandardMaterial
          color="#e8a020"
          roughness={0.45}
          metalness={0.08}
        />
        {bollards.map((item) => (
          <Instance
            key={item.key}
            position={[item.pos[0], item.pos[1] + 0.42, item.pos[2]]}
            rotation={item.rot}
          />
        ))}
      </Instances>
      <Instances limit={Math.max(1, marshalPosts.length)}>
        <cylinderGeometry args={[0.05, 0.06, 2.15, 6]} />
        <meshStandardMaterial
          color="#c45a1a"
          roughness={0.55}
          metalness={0.12}
        />
        {marshalPosts.map((item) => (
          <Instance
            key={item.key}
            position={[item.pos[0], item.pos[1] + 1.05, item.pos[2]]}
            rotation={item.rot}
          />
        ))}
      </Instances>
      <Instances limit={Math.max(1, marshalPosts.length)}>
        <boxGeometry args={[0.42, 0.28, 0.04]} />
        <meshStandardMaterial
          color="#f2f4f6"
          roughness={0.4}
          metalness={0.05}
        />
        {marshalPosts.map((item) => (
          <Instance
            key={`${item.key}-board`}
            position={[item.pos[0], item.pos[1] + 1.72, item.pos[2]]}
            rotation={item.rot}
          />
        ))}
      </Instances>

      {overpasses.map((pass) => (
        <TrackOverpassArch
          key={pass.key}
          position={pass.position}
          yaw={pass.yaw}
          span={pass.span}
          roadY={pass.roadY}
          clearance={pass.clearance}
          castShadow={quality.shadows}
        />
      ))}

      {/* Layout-driven turn warnings — regenerate with the centreline */}
      {turnSigns.map((sign) => (
        <TurnWarningSign
          key={sign.key}
          position={sign.position}
          yaw={sign.yaw}
          turn={sign.turn}
          severity={sign.severity}
          metres={sign.metres}
        />
      ))}

      {/* ================================================================
          ROUTE-SPECIFIC ENVIRONMENT
          ================================================================ */}

      {/* --- Westminster Sprint --- */}
      {isWestminster && westminsterLandmarks && (
        <>
          <ThamesRiver
            cx={riverCX}
            cz={riverCZ}
            length={riverLen}
            width={110}
          />
          {/* Big Ben on the east riverside viewing straight */}
          <RigidBody
            type="fixed"
            colliders={false}
            position={westminsterLandmarks.bigBen}
          >
            <CuboidCollider args={[11, 42, 11]} position={[0, 42, 0]} />
            <group>
              <ClockTowerLandmark position={[0, 0, 0]} scale={1.35} />
              <LandmarkNameTag
                label="Big Ben"
                accent="#8f785a"
                height={92}
                scale={0.7}
                lateral
              />
            </group>
          </RigidBody>
          {/* Palace of Westminster along the harbour */}
          <RigidBody
            type="fixed"
            colliders={false}
            position={westminsterLandmarks.parliament}
            rotation={[0, westminsterLandmarks.yaw + Math.PI / 2, 0]}
          >
            <CuboidCollider args={[82, 34, 18]} position={[0, 17, 0]} />
            <group>
              <PalaceOfWestminsterLandmark
                position={[0, 0, 0]}
                rotation={0}
                scale={1.15}
              />
              <LandmarkNameTag
                label="Parliament"
                accent="#8a7050"
                height={78}
                scale={0.7}
                lateral
              />
            </group>
          </RigidBody>
          {/* Westminster Abbey outside the west return */}
          <RigidBody
            type="fixed"
            colliders={false}
            position={westminsterLandmarks.abbey}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <CuboidCollider args={[38, 28, 22]} position={[0, 14, 0]} />
            <group>
              <WestminsterAbbeyLandmark
                position={[0, 0, 0]}
                rotation={0}
                scale={0.95}
              />
              <LandmarkNameTag
                label="Abbey"
                accent="#7a7060"
                height={62}
                scale={0.7}
                lateral
              />
            </group>
          </RigidBody>
          {/* Westminster Bridge spanning toward the Thames */}
          <ThamesArchBridge
            position={westminsterLandmarks.bridge}
            rotation={westminsterLandmarks.yaw + Math.PI / 2}
            span={110}
            arches={3}
          />
          {/* London Eye — south bank cue so densify/Unreal parity is obvious */}
          <group position={westminsterLandmarks.eye}>
            <LondonEyeLandmark
              position={[0, 0, 0]}
              detail={quality.drawDistance >= 280}
            />
            <LandmarkNameTag
              label="London Eye"
              accent="#5a8aaa"
              height={48}
              scale={0.75}
              lateral
            />
          </group>
          {/* Embankment retaining wall — well clear of asphalt */}
          <mesh position={westminsterLandmarks.wall}>
            <boxGeometry args={[2.5, 2.4, Math.min(220, riverLen * 0.45)]} />
            <meshStandardMaterial color="#60687a" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* --- Embankment Run --- */}
      {isEmbankment && embankmentLandmarks && (
        <>
          <ThamesRiver
            cx={riverCX}
            cz={riverCZ}
            length={riverLen}
            width={140}
          />
          <group position={embankmentLandmarks.eye}>
            <LondonEyeLandmark
              position={[0, 0, 0]}
              detail={quality.drawDistance >= 400}
            />
            <LandmarkNameTag
              label="London Eye"
              accent="#5a8aaa"
              height={40}
              scale={0.7}
              lateral
            />
          </group>
          <group position={embankmentLandmarks.bigBen}>
            <ClockTowerLandmark position={[0, 0, 0]} scale={0.55} />
            <LandmarkNameTag
              label="Big Ben"
              accent="#8f785a"
              height={48}
              scale={0.7}
              lateral
            />
          </group>
          <group position={embankmentLandmarks.countyHall}>
            <CountyHallLandmark position={[0, 0, 0]} scale={0.9} />
            <LandmarkNameTag
              label="County Hall"
              accent="#9a8870"
              height={48}
              scale={0.7}
              lateral
            />
          </group>
          <group position={embankmentLandmarks.stPauls}>
            <StPaulsLandmark position={[0, 0, 0]} scale={1.05} />
            <LandmarkNameTag
              label="St Paul's"
              accent="#8a8070"
              height={72}
              scale={0.7}
              lateral
            />
          </group>
          <RigidBody
            type="fixed"
            colliders={false}
            position={embankmentLandmarks.parliament}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <CuboidCollider args={[32, 14, 8]} position={[0, 7, 0]} />
            <PalaceOfWestminsterLandmark
              position={[0, 0, 0]}
              rotation={0}
              scale={0.42}
            />
            <LandmarkNameTag
              label="Parliament"
              accent="#8a7050"
              height={40}
              scale={0.7}
              lateral
            />
          </RigidBody>
          <ThamesArchBridge
            position={embankmentLandmarks.bridge}
            rotation={0}
            span={120}
            arches={4}
          />
          <mesh position={embankmentLandmarks.wall}>
            <boxGeometry args={[2.5, 2.4, riverLen]} />
            <meshStandardMaterial color="#60687a" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* --- Giza Desert Circuit --- */}
      {isEgypt && egyptLandmarks && (
        <>
          {/* Distant dunes — low mounds outside the circuit (not flat discs). */}
          {[
            [bounds.minX - 260, bounds.minZ - 240, 70, 14],
            [bounds.maxX + 380, bounds.maxZ + 220, 95, 18],
            [bounds.minX - 300, bounds.maxZ + 220, 65, 12],
            [bounds.maxX + 420, bounds.minZ - 200, 80, 16],
            [bounds.maxX + 320, gcz + 40, 55, 10],
          ].map(([x, z, r, h], i) => (
            <mesh
              key={`dune-${i}`}
              position={[x, 0, z]}
              rotation={[0, i * 0.7, 0]}
              castShadow={quality.shadows}
            >
              <coneGeometry args={[r, h, 7]} />
              <meshStandardMaterial color="#d2ae72" roughness={1} flatShading />
            </mesh>
          ))}
          {/* Pyramid plateau — anchored off Kemmel Straight, clear east vista */}
          <group position={egyptLandmarks.great}>
            <GizaPyramidLandmark
              position={[0, 0, 0]}
              base={130}
              height={168}
              capped={false}
            />
            <LandmarkNameTag
              label="Great Pyramid"
              accent="#b88840"
              height={172}
              scale={0.7}
              lateral
            />
          </group>
          <group position={egyptLandmarks.khafre}>
            <GizaPyramidLandmark
              position={[0, 0, 0]}
              base={112}
              height={155}
              capped
            />
            <LandmarkNameTag
              label="Khafre"
              accent="#a87838"
              height={158}
              scale={0.7}
              lateral
            />
          </group>
          <group position={egyptLandmarks.menkaure}>
            <GizaPyramidLandmark
              position={[0, 0, 0]}
              base={68}
              height={78}
              capped={false}
            />
            <LandmarkNameTag
              label="Menkaure"
              accent="#9a7030"
              height={82}
              scale={0.7}
              lateral
            />
          </group>
          <group position={egyptLandmarks.sphinx}>
            <SphinxLandmark
              position={[0, 0, 0]}
              rotation={Math.PI * 0.35}
              scale={1.25}
            />
            <LandmarkNameTag
              label="Sphinx"
              accent="#8a6840"
              height={40}
              scale={0.7}
              lateral
            />
          </group>
          <group position={egyptLandmarks.cairoTower}>
            <CairoTowerLandmark position={[0, 0, 0]} scale={1.25} />
            <LandmarkNameTag
              label="Cairo Tower"
              accent="#c8b898"
              height={130}
              scale={0.7}
              lateral
            />
          </group>
          {/* Museum sits inland / south — not in the pyramid sightline */}
          <group position={egyptLandmarks.museum}>
            <EgyptianMuseumLandmark position={[0, 0, 0]} scale={1.05} />
            <LandmarkNameTag
              label="Museum"
              accent="#8a5040"
              height={36}
              scale={0.7}
              lateral
            />
          </group>
        </>
      )}

      {/* --- Dubai Marina Circuit --- */}
      {isDubai && (
        <>
          {/* Outer gulf */}
          <ThamesRiver
            cx={bounds.maxX + 110}
            cz={gcz}
            length={bounds.maxZ - bounds.minZ + 160}
            width={200}
          />
          {/* Inner marina basin the circuit wraps around */}
          <ThamesRiver cx={gcx} cz={gcz} length={240} width={160} />
          {/* Promenade quay around the basin */}
          <mesh position={[gcx, 0.06, gcz]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[82, 98, 48]} />
            <meshStandardMaterial color="#b89a72" roughness={0.92} />
          </mesh>
          {/* Beach strip along the gulf */}
          <mesh
            position={[bounds.maxX + 28, 0.04, gcz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[48, bounds.maxZ - bounds.minZ + 100]} />
            <meshStandardMaterial color="#d2b48a" roughness={1} />
          </mesh>
          {/* Palm promenade along the east viewing straight */}
          {[-120, -60, 0, 60, 120, 180, 240].map((dz, i) => (
            <PalmTree
              key={`palm-e-${i}`}
              position={[bounds.maxX + 12, 0, gcz + dz]}
              scale={0.9 + (i % 3) * 0.12}
            />
          ))}
          {[-80, -20, 40, 100, 160].map((dz, i) => (
            <PalmTree
              key={`palm-i-${i}`}
              position={[bounds.maxX - 8, 0, gcz + dz - 30]}
              scale={0.75 + (i % 2) * 0.15}
            />
          ))}
        </>
      )}

      {/* --- New York Harbor Circuit --- */}
      {isNewYork && (
        <>
          <ThamesRiver
            cx={bounds.maxX + 95}
            cz={gcz}
            length={bounds.maxZ - bounds.minZ + 160}
            width={200}
          />
          {/* Hudson seawall */}
          <mesh position={[bounds.maxX + 6, 1.2, gcz]}>
            <boxGeometry args={[3.2, 2.4, bounds.maxZ - bounds.minZ + 80]} />
            <meshStandardMaterial color="#4a5460" roughness={0.88} />
          </mesh>
          {/* Pier stubs toward the harbor */}
          {[-90, -20, 50, 120].map((dz, i) => (
            <mesh
              key={`pier-${i}`}
              position={[bounds.maxX + 38, 0.35, gcz + dz]}
            >
              <boxGeometry args={[55, 0.7, 8]} />
              <meshStandardMaterial color="#5a5040" roughness={0.9} />
            </mesh>
          ))}
          {/* Times Square neon cluster near the north hairpin */}
          <TimesSquareBoards cx={gcx} cz={bounds.maxZ - 55} />
          {/* Central Park edge — inland of the north/west kink */}
          <CentralParkGreen
            cx={bounds.minX + 70}
            cz={bounds.maxZ - 90}
            width={110}
            depth={90}
          />
        </>
      )}

      {/* --- Alps Mountain Pass --- */}
      {isAlps && (
        <>
          {/* Shoulder pads + cliff faces (colliders elsewhere) */}
          {alpineTerrain.map((block) => {
            const [hw, hh, hl] = block.halfExtents;
            const color =
              block.variant === "snow"
                ? "#9aa4a8"
                : block.variant === "grass"
                  ? "#4f6e3f"
                  : block.variant === "scree"
                    ? "#7a7468"
                    : "#5a655c";
            const snowCap = block.variant === "snow" && hh > 10;
            return (
              <group
                key={`${block.key}-mesh`}
                position={block.pos}
                rotation={block.rot}
              >
                {block.shape === "boulder" ? (
                  <mesh castShadow={quality.shadows} rotation={[0.2, 0.4, 0.1]}>
                    <dodecahedronGeometry
                      args={[Math.max(hw, hh, hl) * 1.05, 0]}
                    />
                    <meshStandardMaterial
                      color={color}
                      roughness={0.97}
                      flatShading
                    />
                  </mesh>
                ) : block.shape === "wedge" ? (
                  <>
                    <mesh
                      castShadow={quality.shadows}
                      position={[hw * 0.15, 0, 0]}
                    >
                      <boxGeometry args={[hw * 1.6, hh * 2, hl * 2]} />
                      <meshStandardMaterial
                        color={color}
                        roughness={0.96}
                        flatShading
                      />
                    </mesh>
                    <mesh
                      castShadow={quality.shadows}
                      position={[-hw * 0.35, hh * 0.15, 0]}
                      rotation={[0, 0, -0.35]}
                    >
                      <boxGeometry args={[hw * 1.1, hh * 1.5, hl * 1.6]} />
                      <meshStandardMaterial
                        color="#4e584f"
                        roughness={0.97}
                        flatShading
                      />
                    </mesh>
                  </>
                ) : (
                  <mesh castShadow={quality.shadows}>
                    <boxGeometry args={[hw * 2, hh * 2, hl * 2]} />
                    <meshStandardMaterial
                      color={color}
                      roughness={0.96}
                      flatShading
                    />
                  </mesh>
                )}
                {snowCap && (
                  <mesh position={[0, hh * 0.78, 0]}>
                    <boxGeometry args={[hw * 2.05, hh * 0.32, hl * 2.05]} />
                    <meshStandardMaterial
                      color="#eef3f7"
                      roughness={0.86}
                      flatShading
                    />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* Distant ridge + Matterhorn hero peak */}
          {alpinePeaks.map((peak) => (
            <group key={peak.key} position={peak.pos}>
              <mesh
                position={[0, peak.height / 2, 0]}
                castShadow={quality.shadows}
              >
                <coneGeometry
                  args={[
                    peak.radius,
                    peak.height,
                    peak.key === "matterhorn" ? 6 : 7,
                  ]}
                />
                <meshStandardMaterial
                  color={peak.key === "matterhorn" ? "#5a6460" : "#556658"}
                  roughness={0.97}
                  flatShading
                />
              </mesh>
              {peak.snow && (
                <mesh position={[0, peak.height * 0.86, 0]}>
                  <coneGeometry
                    args={[
                      peak.radius * (peak.key === "matterhorn" ? 0.42 : 0.36),
                      peak.height * (peak.key === "matterhorn" ? 0.22 : 0.16),
                      6,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#eef3f7"
                    roughness={0.82}
                    flatShading
                  />
                </mesh>
              )}
              {peak.key === "matterhorn" && (
                <mesh
                  position={[
                    peak.radius * 0.55,
                    peak.height * 0.42,
                    peak.radius * 0.2,
                  ]}
                  castShadow={quality.shadows}
                >
                  <coneGeometry
                    args={[peak.radius * 0.55, peak.height * 0.62, 5]}
                  />
                  <meshStandardMaterial
                    color="#4e5854"
                    roughness={0.97}
                    flatShading
                  />
                </mesh>
              )}
            </group>
          ))}

          {/* High-elevation snow banks along the ribbon */}
          {samples.map((s, i) => {
            if (s.position.y < 40 || i % 7 !== 0) return null;
            const side = i % 2 === 0 ? 1 : -1;
            const offset = route.roadWidth / 2 + 4.5;
            return (
              <mesh
                key={`snowbank-${i}`}
                position={[
                  s.position.x + s.normal.x * side * offset,
                  s.position.y + 0.35,
                  s.position.z + s.normal.z * side * offset,
                ]}
                rotation={[
                  0,
                  Math.atan2(s.tangent.x, s.tangent.z),
                  0.08 * side,
                ]}
              >
                <boxGeometry args={[3.2, 0.9, 8]} />
                <meshStandardMaterial
                  color="#e8eef4"
                  roughness={0.9}
                  flatShading
                />
              </mesh>
            );
          })}

          {/* Alpine chalet clusters — clear of the racing line */}
          {[
            [bounds.minX - 130, gcz - 140],
            [bounds.minX - 90, gcz + 130],
            [gcx + 230, bounds.minZ - 140],
            [gcx + 280, bounds.maxZ + 110],
            [bounds.maxX + 130, gcz - 180],
            [bounds.maxX + 110, gcz + 170],
          ].map(([x, z], i) => {
            const nearest = nearestRoadSample(samples, x, z);
            const y = Math.max(0, nearest?.position.y ?? 0) - 1.2;
            const roadDist = nearest
              ? Math.hypot(x - nearest.position.x, z - nearest.position.z)
              : 999;
            if (roadDist < route.roadWidth / 2 + 36) return null;
            return (
              <RigidBody
                key={`chalet-${i}`}
                type="fixed"
                colliders={false}
                position={[x, y, z]}
              >
                <CuboidCollider args={[6.5, 7, 5.5]} position={[0, 7, 0]} />
                <group>
                  <mesh position={[0, 4, 0]} castShadow={quality.shadows}>
                    <boxGeometry args={[11, 8, 8]} />
                    <meshStandardMaterial color="#7a6451" roughness={0.96} />
                  </mesh>
                  <mesh position={[0, 9.2, 0]} castShadow={quality.shadows}>
                    <coneGeometry args={[7.8, 6.2, 4]} />
                    <meshStandardMaterial
                      color="#4a3428"
                      roughness={0.94}
                      flatShading
                    />
                  </mesh>
                  <mesh position={[0, 3.2, 4.2]}>
                    <boxGeometry args={[2.2, 2.8, 0.2]} />
                    <meshStandardMaterial
                      color="#1a2838"
                      emissive="#ffaa44"
                      emissiveIntensity={0.35}
                    />
                  </mesh>
                </group>
              </RigidBody>
            );
          })}

          {/* Dense pine belts — pushed clear of asphalt */}
          {Array.from({
            length: quality.sceneryDensity >= 0.8 ? 96 : 52,
          }).map((_, i, items) => {
            const s = samples[Math.floor((i / items.length) * samples.length)];
            if (!s) return null;
            const side = i % 2 === 0 ? 1 : -1;
            const offset = 26 + (i % 7) * 5.5;
            const tx = s.position.x + s.normal.x * side * offset;
            const tz = s.position.z + s.normal.z * side * offset;
            const scale = 0.85 + (i % 5) * 0.12;
            const trunkH = 2.6 * scale;
            return (
              <group
                key={`pine-${i}`}
                position={[tx, Math.max(0, s.position.y - 0.35), tz]}
                scale={scale}
              >
                <mesh position={[0, trunkH / 2, 0]}>
                  <cylinderGeometry args={[0.32, 0.48, trunkH, 5]} />
                  <meshStandardMaterial color="#3d2c1e" roughness={0.95} />
                </mesh>
                <mesh
                  position={[0, trunkH + 2.8, 0]}
                  castShadow={quality.shadows}
                >
                  <coneGeometry args={[3.2, 7.5, 6]} />
                  <meshStandardMaterial
                    color="#1f4a22"
                    roughness={0.92}
                    flatShading
                  />
                </mesh>
                <mesh
                  position={[0, trunkH + 6.2, 0]}
                  castShadow={quality.shadows}
                >
                  <coneGeometry args={[2.4, 6.2, 6]} />
                  <meshStandardMaterial
                    color="#2d5e2c"
                    roughness={0.9}
                    flatShading
                  />
                </mesh>
                <mesh position={[0, trunkH + 9.2, 0]}>
                  <coneGeometry args={[1.5, 4.2, 5]} />
                  <meshStandardMaterial
                    color="#3a6f35"
                    roughness={0.88}
                    flatShading
                  />
                </mesh>
              </group>
            );
          })}

          {/* Valley meadow floor under the lower circuit */}
          <mesh
            position={[gcx, -0.8, gcz]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={quality.shadows}
          >
            <planeGeometry
              args={[Math.max(900, spanX + 500), Math.max(900, spanZ + 500)]}
            />
            <meshStandardMaterial color="#3d5a38" roughness={1} />
          </mesh>
        </>
      )}

      {/* --- Rio Coast Circuit --- */}
      {isRio && (
        <>
          {/* Ocean on the east side */}
          <ThamesRiver
            cx={bounds.maxX + 120}
            cz={gcz}
            length={bounds.maxZ - bounds.minZ + 200}
            width={300}
          />
          {/* Beach strip */}
          <mesh
            position={[bounds.maxX + 20, 0.03, gcz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[60, bounds.maxZ - bounds.minZ + 120]} />
            <meshStandardMaterial color="#e8d5a0" roughness={1} />
          </mesh>
          {/* Sugarloaf mountain */}
          <mesh
            position={[bounds.maxX + 180, 0, bounds.minZ - 60]}
            castShadow={quality.shadows}
          >
            <coneGeometry args={[45, 70, 8]} />
            <meshStandardMaterial color="#4a6848" roughness={0.9} flatShading />
          </mesh>
          {/* Corcovado hill */}
          <mesh
            position={[bounds.minX - 100, 0, gcz - 80]}
            castShadow={quality.shadows}
          >
            <coneGeometry args={[55, 55, 7]} />
            <meshStandardMaterial color="#3d5c3a" roughness={0.9} flatShading />
          </mesh>
          {/* Palm trees along coast */}
          {[-150, -90, -30, 30, 90, 150].map((dz, i) => (
            <PalmTree
              key={`rio-palm-${i}`}
              position={[bounds.maxX + 8, 0, gcz + dz]}
              scale={0.85 + (i % 3) * 0.1}
            />
          ))}
        </>
      )}

      <UniqueCircuitLandmarks slug={route.slug} samples={samples} />
      <StreetFill
        samples={samples}
        region={cityRegionFromSlug(route.slug)}
        density={quality.sceneryDensity}
        occupied={streetOccupied}
      />

      {/* ================================================================
          BUILDINGS (genuine footprint extrusion for OSM-backed routes)
          ================================================================ */}
      {visibleBuildings.map((b, buildingIndex) => {
        const iconicKind = resolveIconicKind(b.name);
        const landmarkIdentity =
          b.landmark ??
          (b.name
            ? {
                label: b.name.length > 22 ? `${b.name.slice(0, 20)}…` : b.name,
                color: b.facadeColour,
                accent: "#e8f0f8",
              }
            : null);
        const useIconic = Boolean(iconicKind && landmarkIdentity && b.name);
        return (
          <group
            key={b.id}
            ref={(node) => {
              buildingRefs.current[buildingIndex] = node;
            }}
            position={[b.cx, b.groundY, b.cz]}
          >
            {useIconic && iconicKind && landmarkIdentity && b.name ? (
              <IconicTower
                kind={iconicKind}
                height={b.renderHeight}
                width={b.width}
                depth={b.depth}
                identity={landmarkIdentity}
                name={b.name}
                facadeMaps={
                  b.facadeMaterial === "concrete" ||
                  b.facadeMaterial === "brick"
                    ? facades.concrete
                    : b.facadeMaterial === "sandstone"
                      ? facades.sandstone
                      : facades.glass
                }
                castShadow={
                  quality.shadows && (b.height >= 55 || buildingIndex % 4 === 0)
                }
              />
            ) : (
              <>
                <mesh
                  geometry={b.geometry}
                  castShadow={
                    quality.shadows &&
                    (b.height >= 55 || buildingIndex % 4 === 0)
                  }
                  receiveShadow={false}
                >
                  {b.facadeMaterial === "glass" || b.landmark ? (
                    <meshStandardMaterial
                      map={b.tex}
                      normalMap={b.normalTex}
                      normalScale={[0.4, 0.4]}
                      color={b.facadeColour}
                      roughness={b.landmark ? 0.32 : 0.24}
                      metalness={b.landmark ? 0.12 : 0.08}
                      envMapIntensity={1.05}
                      emissive="#f0d8a0"
                      emissiveMap={b.emissiveTex}
                      emissiveIntensity={0.72}
                    />
                  ) : b.facadeMaterial === "concrete" ? (
                    <meshStandardMaterial
                      map={b.tex}
                      normalMap={b.normalTex}
                      normalScale={[0.55, 0.55]}
                      color={b.facadeColour}
                      roughness={0.86}
                      metalness={0.06}
                      envMapIntensity={0.7}
                    />
                  ) : (
                    <meshStandardMaterial
                      map={b.tex}
                      normalMap={b.normalTex}
                      normalScale={[0.75, 0.75]}
                      color={b.facadeColour}
                      roughness={0.9}
                      metalness={0.02}
                      envMapIntensity={0.55}
                    />
                  )}
                </mesh>
                {!useIconic ? (
                  <CityBlockDetail
                    id={b.id}
                    width={b.width}
                    depth={b.depth}
                    height={b.renderHeight}
                    color={b.facadeColour}
                    style={b.style}
                    dense={quality.sceneryDensity >= 0.45}
                    region={cityRegionFromSlug(route.slug)}
                  />
                ) : null}
                {b.landmark ? (
                  <CanaryTowerCrown
                    name={b.name}
                    width={b.width}
                    depth={b.depth}
                    renderHeight={b.renderHeight}
                    castShadow={quality.shadows}
                  />
                ) : b.roofType === "pyramidal" ? (
                  <mesh
                    position={[0, b.renderHeight + 10, 0]}
                    rotation={[0, Math.PI / 4, 0]}
                    castShadow={quality.shadows}
                  >
                    <coneGeometry
                      args={[Math.max(b.width, b.depth) * 0.64, 20, 4]}
                    />
                    <meshStandardMaterial
                      color="#aab5be"
                      roughness={0.35}
                      metalness={0.35}
                    />
                  </mesh>
                ) : b.roofType === "round" ? (
                  <mesh
                    position={[0, b.renderHeight + 1.5, 0]}
                    castShadow={quality.shadows}
                  >
                    <cylinderGeometry
                      args={[b.width * 0.48, b.width * 0.48, 3, 24]}
                    />
                    <meshStandardMaterial
                      color="#64717c"
                      roughness={0.5}
                      metalness={0.25}
                    />
                  </mesh>
                ) : b.roofType === "pitched" ? (
                  <mesh
                    position={[0, b.renderHeight + 1.5, 0]}
                    rotation={[0, Math.PI / 4, 0]}
                    castShadow={quality.shadows}
                  >
                    <coneGeometry
                      args={[Math.max(b.width, b.depth) * 0.7, 3, 4]}
                    />
                    <meshStandardMaterial color="#4a3828" roughness={0.88} />
                  </mesh>
                ) : (
                  <mesh position={[0, b.renderHeight + 0.35, 0]}>
                    <boxGeometry
                      args={[
                        Math.max(2, b.width * 0.22),
                        0.7,
                        Math.max(2, b.depth * 0.22),
                      ]}
                    />
                    <meshStandardMaterial color="#38434d" roughness={0.82} />
                  </mesh>
                )}
                {!b.landmark && b.height >= 90 ? (
                  <group
                    position={[
                      0,
                      b.renderHeight + (b.roofType === "pyramidal" ? 21 : 2.4),
                      0,
                    ]}
                  >
                    <mesh>
                      <cylinderGeometry args={[0.08, 0.12, 2.5, 6]} />
                      <meshStandardMaterial
                        color="#697581"
                        metalness={0.55}
                        roughness={0.4}
                      />
                    </mesh>
                    <mesh position={[0, 1.4, 0]}>
                      <sphereGeometry args={[0.22, 8, 6]} />
                      <meshStandardMaterial
                        color="#ff334d"
                        emissive="#ff1738"
                        emissiveIntensity={3}
                        toneMapped={false}
                      />
                    </mesh>
                  </group>
                ) : null}
              </>
            )}
          </group>
        );
      })}

      {/* ================================================================
          STREET SCENERY (instanced)
          ================================================================ */}
      {streetLights.length > 0 && (
        <>
          <Instances limit={streetLights.length + 1}>
            <cylinderGeometry args={[0.08, 0.12, 5.2, 7]} />
            <meshStandardMaterial
              color="#8d97a6"
              metalness={0.6}
              roughness={0.45}
            />
            {streetLights.map((l) => (
              <Instance
                key={l.id}
                position={[l.position.x, l.position.y + 2.6, l.position.z]}
              />
            ))}
          </Instances>
          <Instances limit={streetLights.length + 1}>
            <boxGeometry args={[1.0, 0.14, 0.28]} />
            <meshStandardMaterial
              color="#e6edf5"
              emissive="#ffd8a0"
              emissiveIntensity={0.85}
            />
            {streetLights.map((l) => (
              <Instance
                key={l.id}
                position={[l.position.x, l.position.y + 5.3, l.position.z]}
                rotation={[0, l.rotation, 0]}
              />
            ))}
          </Instances>
        </>
      )}

      {trees.length > 0 && (
        <>
          <Instances limit={trees.length + 1}>
            <cylinderGeometry args={[0.15, 0.24, 2.2, 6]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
            {trees.map((t) => (
              <Instance
                key={t.id}
                position={[t.position.x, t.position.y + 1.1, t.position.z]}
                scale={t.scale}
              />
            ))}
          </Instances>
          <Instances limit={trees.length + 1}>
            <coneGeometry args={[1.35, 2.4, 7]} />
            <meshStandardMaterial
              color={isEgypt ? "#6a8a48" : isCanary ? "#2f5a42" : "#3a6040"}
              roughness={0.88}
            />
            {trees.map((t, i) => (
              <Instance
                key={t.id}
                position={[t.position.x, t.position.y + 2.9, t.position.z]}
                rotation={[0, i * 1.618, 0]}
                scale={0.85 + (i % 5) * 0.08}
              />
            ))}
          </Instances>
          <Instances limit={trees.length + 1}>
            <coneGeometry args={[1.05, 1.8, 6]} />
            <meshStandardMaterial
              color={isEgypt ? "#8aa858" : isCanary ? "#3a6b4e" : "#4a7050"}
              roughness={0.9}
            />
            {trees.map((t, i) => (
              <Instance
                key={`${t.id}-top`}
                position={[t.position.x, t.position.y + 4.1, t.position.z]}
                rotation={[0, i * 0.7, 0]}
                scale={0.75 + (i % 4) * 0.06}
              />
            ))}
          </Instances>
        </>
      )}

      {/* ================================================================
          CHECKPOINT GATES
          ================================================================ */}
      {route.checkpoints.map((cp, i) => {
        const isStart = i === 0;
        const isFinish = i === route.checkpoints.length - 1;
        const color = isFinish ? "#34d399" : isStart ? "#f0f4ff" : "#38bdf8";
        return (
          <CheckpointGate
            key={cp.id}
            x={cp.position.x}
            z={cp.position.z}
            rotation={cp.rotation}
            width={cp.width}
            color={color}
          />
        );
      })}
    </group>
  );
}
