"use client";

import type { ReactNode } from "react";

/** Regional landmark silhouettes — Tokyo, Alps, Rio. */

function Solid({
  color,
  metalness = 0.18,
  roughness = 0.42,
}: {
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
  );
}

function Glass({
  color,
  emissive,
  intensity = 0.35,
}: {
  color: string;
  emissive?: string;
  intensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={intensity}
      metalness={0.32}
      roughness={0.18}
      transparent
      opacity={0.92}
    />
  );
}

export function TokyoTowerMesh({
  h,
  paint,
  accent,
}: {
  h: number;
  paint: string;
  accent: string;
}) {
  const spread = h * 0.16;
  return (
    <group>
      {([0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2] as const).map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * spread * 0.55, h * 0.28, Math.sin(a) * spread * 0.55]}
          rotation={[0.22, a, 0]}
          castShadow
        >
          <boxGeometry args={[h * 0.018, h * 0.58, h * 0.018]} />
          <Solid color={paint} roughness={0.5} />
        </mesh>
      ))}
      {[0.12, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82].map((t, i) => (
        <mesh key={t} position={[0, h * t, 0]} castShadow>
          <cylinderGeometry
            args={[h * (0.09 - t * 0.07), h * (0.1 - t * 0.07), h * 0.045, 8]}
          />
          <Solid color={i % 2 === 0 ? paint : accent} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.34, 0]} castShadow>
        <cylinderGeometry args={[h * 0.07, h * 0.085, h * 0.07, 12]} />
        <Solid color="#f4f4f1" metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[0, h * 0.62, 0]} castShadow>
        <cylinderGeometry args={[h * 0.045, h * 0.055, h * 0.05, 12]} />
        <Solid color="#f4f4f1" metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[0, h * 0.92, 0]}>
        <coneGeometry args={[h * 0.016, h * 0.16, 8]} />
        <Solid color="#f4f4f4" metalness={0.7} roughness={0.22} />
      </mesh>
      {[0.2, 0.4, 0.55, 0.75].map((t) =>
        [0, Math.PI / 2].map((a) => (
          <mesh
            key={`${t}-${a}`}
            position={[0, h * t, 0]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[h * (0.16 - t * 0.12), h * 0.01, h * 0.01]} />
            <Solid color="#4a3028" roughness={0.65} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Shibuya109Mesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <cylinderGeometry args={[w * 0.55, w * 0.64, h * 0.78, 20]} />
        <Solid color={paint} roughness={0.32} />
      </mesh>
      {[0.18, 0.32, 0.46, 0.6, 0.74].map((t, i) => (
        <mesh key={t} position={[0, h * t, 0]}>
          <cylinderGeometry args={[w * (0.57 - i * 0.01), w * (0.58 - i * 0.01), h * 0.035, 20]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? accent : "#4df0ff"}
            emissive={i % 2 === 0 ? accent : "#4df0ff"}
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <sphereGeometry args={[w * 0.58, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Solid color={accent} roughness={0.24} />
      </mesh>
      <mesh position={[0, h * 0.2, w * 0.62]}>
        <boxGeometry args={[w * 0.95, h * 0.1, 0.18]} />
        <meshStandardMaterial color="#ff3388" emissive="#ff3388" emissiveIntensity={2.1} toneMapped={false} />
      </mesh>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x * w, h * 0.52, w * 0.5]}>
          <boxGeometry args={[w * 0.12, h * 0.42, 0.12]} />
          <meshStandardMaterial color="#111" emissive="#ffd36a" emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function CocoonTowerMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.5, 0]} castShadow scale={[w * 0.22, h * 0.92, w * 0.16]}>
        <capsuleGeometry args={[1, 1, 4, 12]} />
        <Glass color={paint} intensity={0.22} />
      </mesh>
      {[0.15, 0.35, 0.55, 0.75].map((t) => (
        <mesh key={t} position={[0, h * t, 0]}>
          <torusGeometry args={[w * (0.2 - t * 0.04), 0.15, 6, 20]} />
          <Solid color="#3a4850" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function DocomoClockMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.38, 0]} castShadow>
        <boxGeometry args={[w * 0.35, h * 0.72, w * 0.28]} />
        <Solid color={paint} />
      </mesh>
      <mesh position={[0, h * 0.82, 0]} castShadow>
        <sphereGeometry args={[w * 0.42, 14, 12]} />
        <Solid color={accent} metalness={0.55} roughness={0.22} />
      </mesh>
      <mesh position={[0, h * 0.82, w * 0.38]}>
        <ringGeometry args={[w * 0.12, w * 0.16, 16]} />
        <Solid color="#f0f4f8" metalness={0.8} roughness={0.15} />
      </mesh>
    </group>
  );
}

export function TmgbTwinMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  const offset = w * 0.38;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * offset, 0, 0]}>
          <mesh position={[0, h * 0.42, 0]} castShadow>
            <boxGeometry args={[w * 0.42, h * 0.78, w * 0.38]} />
            <Glass color={paint} intensity={0.28} />
          </mesh>
          <mesh position={[0, h * 0.86, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[w * 0.32, h * 0.18, 4]} />
            <Solid color={accent} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, h * 0.08, 0]}>
        <boxGeometry args={[w * 1.05, h * 0.12, w * 0.55]} />
        <Solid color="#6a7480" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function ShibuyaScrambleMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.32, 0]} castShadow>
        <boxGeometry args={[w * 1.02, h * 0.58, w * 0.88]} />
        <Glass color={paint} />
      </mesh>
      {[0.18, 0.3, 0.42, 0.54].map((t) => (
        <mesh key={t} position={[0, h * t, w * 0.45]}>
          <boxGeometry args={[w * 1.08, h * 0.06, 0.16]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, h * 0.72, 0]} castShadow>
        <boxGeometry args={[w * 0.78, h * 0.22, w * 0.66]} />
        <Glass color={paint} intensity={0.45} />
      </mesh>
      <mesh position={[0, h * 0.9, 0]}>
        <boxGeometry args={[w * 1.12, h * 0.09, w * 0.22]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[w * 0.52, h * 0.48, 0]}>
        <boxGeometry args={[0.16, h * 0.28, w * 0.55]} />
        <meshStandardMaterial color="#111" emissive="#4df0ff" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function TokyoDeptStoreMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      {[0.18, 0.42, 0.66, 0.88].map((t, i) => (
        <mesh key={t} position={[0, h * t, 0]} castShadow>
          <boxGeometry args={[w * (1 - i * 0.04), h * 0.18, w * 0.78]} />
          <Solid color={i % 2 === 0 ? paint : accent} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.95, 0]}>
        <boxGeometry args={[w * 0.5, h * 0.06, w * 0.15]} />
        <meshStandardMaterial color="#ff4488" emissive="#ff4488" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function AlpineChaletMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  const bodyH = h * 0.55;
  return (
    <group>
      <mesh position={[0, bodyH / 2, 0]} castShadow>
        <boxGeometry args={[w, bodyH, w * 0.72]} />
        <Solid color={paint} roughness={0.92} />
      </mesh>
      <mesh position={[0, bodyH + h * 0.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.72, h * 0.32, 4]} />
        <Solid color={accent} roughness={0.88} />
      </mesh>
      {[0.25, 0.75].map((t) => (
        <mesh key={t} position={[(t - 0.5) * w * 0.5, bodyH * 0.45, w * 0.37]}>
          <boxGeometry args={[w * 0.18, bodyH * 0.22, 0.08]} />
          <Solid color="#7eb0d8" roughness={0.2} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

export function AlpineCableStationMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.28, 0]} castShadow>
        <boxGeometry args={[w, h * 0.48, w * 0.7]} />
        <Solid color={paint} roughness={0.55} />
      </mesh>
      <mesh position={[0, h * 0.62, 0]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.15, h * 0.08, w * 1.05]} />
        <Solid color={accent} roughness={0.45} />
      </mesh>
      <mesh position={[0, h * 0.72, w * 0.35]}>
        <boxGeometry args={[w * 0.35, h * 0.35, 0.12]} />
        <Glass color="#a8c8e0" intensity={0.15} />
      </mesh>
    </group>
  );
}

export function CristoRedentorMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.12, 0]} castShadow>
        <cylinderGeometry args={[w * 0.55, w * 0.7, h * 0.2, 10]} />
        <Solid color="#8a9078" roughness={0.95} />
      </mesh>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w * 0.22, h * 0.42, w * 0.16]} />
        <Solid color={paint} roughness={0.55} />
      </mesh>
      <mesh position={[0, h * 0.68, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <boxGeometry args={[w * 0.95, h * 0.08, w * 0.12]} />
        <Solid color={paint} roughness={0.5} />
      </mesh>
      <mesh position={[0, h * 0.82, 0]} castShadow>
        <boxGeometry args={[w * 0.14, h * 0.12, w * 0.12]} />
        <Solid color={paint} roughness={0.48} />
      </mesh>
    </group>
  );
}

export function RioArtDecoHotelMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <boxGeometry args={[w, h * 0.82, w * 0.65]} />
        <Solid color={paint} roughness={0.35} />
      </mesh>
      {[0.2, 0.4, 0.6, 0.78].map((t) => (
        <mesh key={t} position={[0, h * t, w * 0.33]}>
          <boxGeometry args={[w * 1.02, h * 0.04, 0.08]} />
          <Solid color={accent} metalness={0.35} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.92, 0]}>
        <boxGeometry args={[w * 0.35, h * 0.08, w * 0.25]} />
        <Solid color={accent} metalness={0.5} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function MuseumTomorrowRioMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.22, 0]} castShadow>
        <boxGeometry args={[w * 0.85, h * 0.32, w * 0.55]} />
        <Solid color={paint} roughness={0.55} />
      </mesh>
      <mesh position={[0, h * 0.55, 0]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.1, h * 0.12, w * 0.75]} />
        <Solid color={accent} metalness={0.65} roughness={0.22} />
      </mesh>
      <mesh position={[0, h * 0.72, w * 0.2]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.95, h * 0.08, w * 0.55]} />
        <Glass color="#c8dce8" intensity={0.45} />
      </mesh>
    </group>
  );
}

export function EdificioItaliaMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      {[0.2, 0.45, 0.68, 0.86].map((t, i) => (
        <mesh key={t} position={[0, h * t, 0]} castShadow>
          <boxGeometry args={[w * (1 - i * 0.08), h * 0.18, w * (0.82 - i * 0.06)]} />
          <Solid color={paint} roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.96, 0]}>
        <cylinderGeometry args={[0.8, 1.4, h * 0.08, 8]} />
        <Solid color={accent} metalness={0.72} roughness={0.18} />
      </mesh>
    </group>
  );
}

export function LapaArchesMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <mesh key={x} position={[x * w * 0.22, h * 0.42, 0]} castShadow>
          <torusGeometry args={[h * 0.22, h * 0.04, 8, 16, Math.PI]} />
          <Solid color={paint} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

export function RioCathedralMesh({ h, w, paint }: { h: number; w: number; paint: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.18, 0]} castShadow>
        <cylinderGeometry args={[w * 0.48, w * 0.55, h * 0.28, 12]} />
        <Solid color={paint} roughness={0.75} />
      </mesh>
      <mesh position={[0, h * 0.58, 0]} castShadow>
        <coneGeometry args={[w * 0.52, h * 0.62, 4]} />
        <Solid color={paint} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function RioModernOfficeMesh({ h, w, paint, accent }: { h: number; w: number; paint: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <boxGeometry args={[w * 0.72, h * 0.82, w * 0.55]} />
        <Glass color={paint} intensity={0.25} />
      </mesh>
      <mesh position={[w * 0.22, h * 0.55, 0]} rotation={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[w * 0.28, h * 0.62, w * 0.48]} />
        <Glass color={accent} intensity={0.35} />
      </mesh>
      <mesh position={[0, h * 0.92, 0]}>
        <boxGeometry args={[w * 0.18, h * 0.08, w * 0.12]} />
        <Solid color={accent} metalness={0.65} roughness={0.2} />
      </mesh>
    </group>
  );
}

export type RegionalIconicKind =
  | "tokyo-tower"
  | "shibuya-109"
  | "cocoon-tower"
  | "docomo-clock"
  | "tmgb-twin"
  | "shibuya-scramble"
  | "tokyo-dept-store"
  | "alpine-chalet"
  | "alpine-cable-station"
  | "cristo-redentor"
  | "rio-art-deco-hotel"
  | "rio-museum-tomorrow"
  | "edificio-italia"
  | "lapa-arches"
  | "rio-cathedral"
  | "rio-modern-office";

export const REGIONAL_NAME_TO_KIND: Record<string, RegionalIconicKind> = {
  "Tokyo Tower": "tokyo-tower",
  "Shibuya 109": "shibuya-109",
  "Mode Gakuen Cocoon Tower": "cocoon-tower",
  "NTT Docomo Yoyogi Building": "docomo-clock",
  "Tokyo Metropolitan Government Building": "tmgb-twin",
  "Shibuya Scramble Square": "shibuya-scramble",
  "Shibuya Hikarie": "shibuya-scramble",
  "Midtown Tower": "shibuya-scramble",
  "Mori Tower": "shibuya-scramble",
  "Takashimaya Times Square": "tokyo-dept-store",
  "Odakyu Department Store": "tokyo-dept-store",
  "Keio Department Store": "tokyo-dept-store",
  "Lumine Shinjuku": "tokyo-dept-store",
  "Tokyu Plaza Shibuya": "tokyo-dept-store",
  "Matterhorn Lodge": "alpine-chalet",
  "Hotel Zermatterhof": "alpine-chalet",
  "Grand Hotel Zermatt": "alpine-chalet",
  "Chalet Edelweiss": "alpine-chalet",
  "Berghaus Sonnblick": "alpine-chalet",
  "Chalet Alpina": "alpine-chalet",
  "Chalet Riffelberg": "alpine-chalet",
  "Monte Rosa Hut": "alpine-chalet",
  "Alpenrose Gasthof": "alpine-chalet",
  "Berggasthaus Fluhalp": "alpine-chalet",
  "Findeln Village Chalet": "alpine-chalet",
  "Berghaus Trift": "alpine-chalet",
  "Gandegghütte": "alpine-chalet",
  "Schönbielhütte SAC": "alpine-chalet",
  "Hörnlihütte": "alpine-chalet",
  "Gornergrat Station": "alpine-cable-station",
  "Bergstation Furi": "alpine-cable-station",
  "Klein Matterhorn Station": "alpine-cable-station",
  "Trockener Steg Berghaus": "alpine-cable-station",
  "Sugarloaf Mountain Station": "alpine-cable-station",
  "Cristo Redentor Viewpoint": "cristo-redentor",
  "Copacabana Palace": "rio-art-deco-hotel",
  "Hotel Fasano": "rio-art-deco-hotel",
  "Hilton Copacabana": "rio-art-deco-hotel",
  "Sheraton Grand Rio": "rio-art-deco-hotel",
  "Museum of Tomorrow": "rio-museum-tomorrow",
  "Edificio Italia": "edificio-italia",
  "Lapa Arches": "lapa-arches",
  "Metropolitan Cathedral": "rio-cathedral",
  "BNDES Tower": "rio-modern-office",
  "Petrobras HQ": "rio-modern-office",
  "Shinjuku Park Tower": "shibuya-scramble",
  "Shinjuku Mitsui Building": "shibuya-scramble",
  "Cerulean Tower": "shibuya-scramble",
  "Shinjuku Sumitomo Building": "shibuya-scramble",
  "Shinjuku Center Building": "shibuya-scramble",
  "Shinjuku Nomura Building": "shibuya-scramble",
  "Keio Plaza Hotel": "shibuya-scramble",
  "Sompo Japan Building": "shibuya-scramble",
  "Roppongi Hills Gate Tower": "shibuya-scramble",
};

export function resolveRegionalIconicKind(name?: string): RegionalIconicKind | null {
  if (!name) return null;
  if (REGIONAL_NAME_TO_KIND[name]) return REGIONAL_NAME_TO_KIND[name];
  const lower = name.toLowerCase();
  if (lower.includes("tokyo tower")) return "tokyo-tower";
  if (lower.includes("shibuya 109")) return "shibuya-109";
  if (lower.includes("cocoon")) return "cocoon-tower";
  if (lower.includes("docomo")) return "docomo-clock";
  if (lower.includes("metropolitan government") || lower.includes("tmgb")) return "tmgb-twin";
  if (lower.includes("scramble") || lower.includes("hikarie") || lower.includes("midtown")) {
    return "shibuya-scramble";
  }
  if (lower.includes("department") || lower.includes("takashimaya") || lower.includes("lumine")) {
    return "tokyo-dept-store";
  }
  if (lower.includes("chalet") || lower.includes("hut") || lower.includes("hütte") || lower.includes("berghaus") || lower.includes("gasthof") || lower.includes("lodge")) {
    return "alpine-chalet";
  }
  if (lower.includes("station") || lower.includes("bergstation")) return "alpine-cable-station";
  if (lower.includes("cristo")) return "cristo-redentor";
  if (lower.includes("copacabana palace") || lower.includes("fasano") || lower.includes("hilton copacabana") || lower.includes("sheraton")) {
    return "rio-art-deco-hotel";
  }
  if (lower.includes("museum of tomorrow")) return "rio-museum-tomorrow";
  if (lower.includes("edificio italia")) return "edificio-italia";
  if (lower.includes("lapa arch")) return "lapa-arches";
  if (lower.includes("cathedral")) return "rio-cathedral";
  if (lower.includes("bndes") || lower.includes("petrobras")) return "rio-modern-office";
  if (lower.includes("park tower") || lower.includes("mitsui") || lower.includes("cerulean") || lower.includes("mori tower")) {
    return "shibuya-scramble";
  }
  return null;
}

export function renderRegionalIconicBody(
  kind: RegionalIconicKind,
  h: number,
  w: number,
  paint: string,
  accent: string,
): ReactNode {
  switch (kind) {
    case "tokyo-tower":
      return <TokyoTowerMesh h={h} paint={paint} accent={accent} />;
    case "shibuya-109":
      return <Shibuya109Mesh h={h} w={w} paint={paint} accent={accent} />;
    case "cocoon-tower":
      return <CocoonTowerMesh h={h} w={w} paint={paint} />;
    case "docomo-clock":
      return <DocomoClockMesh h={h} w={w} paint={paint} accent={accent} />;
    case "tmgb-twin":
      return <TmgbTwinMesh h={h} w={w} paint={paint} accent={accent} />;
    case "shibuya-scramble":
      return <ShibuyaScrambleMesh h={h} w={w} paint={paint} accent={accent} />;
    case "tokyo-dept-store":
      return <TokyoDeptStoreMesh h={h} w={w} paint={paint} accent={accent} />;
    case "alpine-chalet":
      return <AlpineChaletMesh h={h} w={w} paint={paint} accent={accent} />;
    case "alpine-cable-station":
      return <AlpineCableStationMesh h={h} w={w} paint={paint} accent={accent} />;
    case "cristo-redentor":
      return <CristoRedentorMesh h={h} w={w} paint={paint} />;
    case "rio-art-deco-hotel":
      return <RioArtDecoHotelMesh h={h} w={w} paint={paint} accent={accent} />;
    case "rio-museum-tomorrow":
      return <MuseumTomorrowRioMesh h={h} w={w} paint={paint} accent={accent} />;
    case "edificio-italia":
      return <EdificioItaliaMesh h={h} w={w} paint={paint} accent={accent} />;
    case "lapa-arches":
      return <LapaArchesMesh h={h} w={w} paint={paint} />;
    case "rio-cathedral":
      return <RioCathedralMesh h={h} w={w} paint={paint} />;
    case "rio-modern-office":
      return <RioModernOfficeMesh h={h} w={w} paint={paint} accent={accent} />;
    default:
      return null;
  }
}
