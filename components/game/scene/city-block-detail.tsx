"use client";

export type CityRegion =
  | "london"
  | "dubai"
  | "egypt"
  | "tokyo"
  | "rio"
  | "alps"
  | "nyc";

export function cityRegionFromSlug(slug: string): CityRegion {
  if (slug.includes("dubai")) return "dubai";
  if (slug.includes("egypt") || slug.includes("pyramid")) return "egypt";
  if (slug.includes("tokyo")) return "tokyo";
  if (slug.includes("rio")) return "rio";
  if (slug.includes("alps")) return "alps";
  if (slug.includes("york") || slug.includes("harbor")) return "nyc";
  return "london";
}

function hash01(id: string, salt = 0): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

/**
 * Per-city dressing on ordinary footprint extrusions so London brick, Dubai
 * glass, Tokyo neon, etc. don't share one box language.
 */
export function CityBlockDetail({
  id,
  width,
  depth,
  height,
  color,
  style,
  dense,
  region,
}: {
  id: string;
  width: number;
  depth: number;
  height: number;
  color: string;
  style: string;
  dense: boolean;
  region: CityRegion;
}) {
  if (height < 4 || width < 3 || depth < 3) return null;

  const a = hash01(id, 3);
  const b = hash01(id, 11);
  const c = hash01(id, 19);
  const w = Math.max(3.2, width * 0.94);
  const d = Math.max(3.2, depth * 0.94);
  const podiumH = Math.min(region === "alps" ? 3.4 : 6.2, 2.1 + a * 2.8);
  const extra = dense || height > 16;
  const isGlass = style.includes("glass") || style.includes("steel");
  const isBrick = style.includes("brick") || style.includes("terrace");
  const isApt = style.includes("apartment") || style.includes("contemporary");

  const trim =
    region === "dubai"
      ? "#c9a227"
      : region === "egypt"
        ? "#c4a06a"
        : region === "tokyo"
          ? "#ff4d8d"
          : region === "rio"
            ? "#e85d4c"
            : region === "alps"
              ? "#6b4a32"
              : region === "nyc"
                ? "#c4ccd4"
                : "#d8c8b0";
  const podium =
    region === "egypt"
      ? "#8a6a42"
      : region === "alps"
        ? "#5a4030"
        : region === "rio"
          ? color
          : isBrick
            ? "#3a2a22"
            : "#1c242c";
  const shopGlow =
    region === "tokyo"
      ? "#7cffb2"
      : region === "dubai"
        ? "#ffe7a0"
        : region === "rio"
          ? "#ffd36a"
          : "#8ec4e8";

  return (
    <group>
      <mesh position={[0, podiumH / 2, 0]}>
        <boxGeometry args={[w * 1.07, podiumH, d * 1.07]} />
        <meshStandardMaterial color={podium} roughness={0.7} metalness={0.08} />
      </mesh>
      <mesh position={[0, podiumH * 0.45, d * 0.54]}>
        <boxGeometry args={[Math.min(w * 0.62, 9), podiumH * 0.58, 0.32]} />
        <meshStandardMaterial
          color={shopGlow}
          emissive={shopGlow}
          emissiveIntensity={region === "tokyo" ? 0.9 : 0.38}
          roughness={0.16}
          metalness={0.12}
        />
      </mesh>
      <mesh position={[0, podiumH + 0.12, 0]}>
        <boxGeometry args={[w * 1.1, 0.24, d * 1.1]} />
        <meshStandardMaterial color={trim} roughness={0.4} metalness={0.18} />
      </mesh>

      {height > 14 ? (
        <mesh position={[0, height * (0.36 + b * 0.18), 0]}>
          <boxGeometry args={[w * 1.08, 0.38, d * 1.08]} />
          <meshStandardMaterial color={color} roughness={0.48} metalness={0.1} />
        </mesh>
      ) : null}

      {height > 28 ? (
        <mesh position={[0, height * 0.68, 0]}>
          <boxGeometry args={[w * 0.88, 0.32, d * 0.88]} />
          <meshStandardMaterial color={trim} roughness={0.36} metalness={0.2} />
        </mesh>
      ) : null}

      {height > 40 ? (
        <mesh position={[0, height * 0.84, 0]}>
          <boxGeometry
            args={[
              w * (region === "nyc" || region === "dubai" ? 0.62 : 0.74),
              height * 0.09,
              d * (region === "nyc" || region === "dubai" ? 0.62 : 0.74),
            ]}
          />
          <meshStandardMaterial
            color={isGlass || region === "dubai" ? "#c8d8e4" : color}
            roughness={0.26}
            metalness={region === "dubai" ? 0.35 : 0.1}
          />
        </mesh>
      ) : null}

      {extra && height > 12
        ? (
            [
              [w * 0.5, d * 0.5],
              [-w * 0.5, d * 0.5],
              [w * 0.5, -d * 0.5],
              [-w * 0.5, -d * 0.5],
            ] as const
          ).map(([x, z], i) => (
            <mesh key={`fin-${i}`} position={[x, height * 0.52, z]}>
              <boxGeometry args={[0.26, height * 0.88, 0.26]} />
              <meshStandardMaterial
                color={region === "dubai" ? trim : isGlass ? "#d0dce6" : "#2a323c"}
                metalness={0.38}
                roughness={0.3}
              />
            </mesh>
          ))
        : null}

      {(isApt || region === "rio" || region === "nyc") && extra
        ? [0.3, 0.48, 0.66].map((t) => (
            <mesh key={`bal-${t}`} position={[0, height * t, d * 0.52]}>
              <boxGeometry args={[w * 0.72, 0.1, 0.5]} />
              <meshStandardMaterial color="#c8c2b8" roughness={0.55} />
            </mesh>
          ))
        : null}

      {region === "tokyo" && extra ? (
        <>
          <mesh position={[w * 0.52, height * (0.45 + a * 0.2), 0]}>
            <boxGeometry args={[0.18, Math.min(8, height * 0.22), Math.min(6.5, d * 0.55)]} />
            <meshStandardMaterial
              color="#111"
              emissive={c > 0.5 ? "#4df0ff" : "#ff3d7a"}
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
          {[0.22, 0.38, 0.54].map((t, i) => (
            <mesh key={`neon-${t}`} position={[0, height * t, d * 0.52]}>
              <boxGeometry args={[w * (0.7 - i * 0.08), 0.55, 0.22]} />
              <meshStandardMaterial
                color="#111"
                emissive={i === 1 ? "#7cffb2" : "#ff4d8d"}
                emissiveIntensity={1.7}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={[w * 0.08, height + 2.4, -d * 0.08]}>
            <cylinderGeometry args={[0.08, 0.1, 5.4, 6]} />
            <meshStandardMaterial color="#8898a8" metalness={0.55} roughness={0.3} />
          </mesh>
        </>
      ) : null}

      {region === "london" && extra ? (
        <>
          {[0.28, 0.44, 0.6].map((t) => (
            <mesh key={`sash-${t}`} position={[0, height * t, d * 0.51]}>
              <boxGeometry args={[w * 0.78, 0.14, 0.18]} />
              <meshStandardMaterial color="#d8c8b0" roughness={0.5} />
            </mesh>
          ))}
          {isBrick ? (
            <mesh position={[0, height * 0.14, d * 0.54]}>
              <boxGeometry args={[Math.min(w * 0.5, 7), 1.1, 0.4]} />
              <meshStandardMaterial color="#1a2430" roughness={0.4} />
            </mesh>
          ) : null}
        </>
      ) : null}

      {region === "nyc" && extra ? (
        <>
          {[0.25, 0.4, 0.55, 0.7].map((t) => (
            <mesh key={`ledge-${t}`} position={[0, height * t, 0]}>
              <boxGeometry args={[w * 1.06, 0.16, d * 1.06]} />
              <meshStandardMaterial color="#c4ccd4" roughness={0.42} metalness={0.12} />
            </mesh>
          ))}
        </>
      ) : null}

      {region === "dubai" && extra ? (
        <>
          {[0.2, 0.48, 0.76].map((t) => (
            <mesh key={`gold-${t}`} position={[0, height * t, 0]}>
              <boxGeometry args={[w * 1.04, 0.12, d * 1.04]} />
              <meshStandardMaterial color="#c9a227" metalness={0.55} roughness={0.28} />
            </mesh>
          ))}
          <mesh position={[0, height * 0.5, d * 0.52]}>
            <boxGeometry args={[w * 0.08, height * 0.9, 0.08]} />
            <meshStandardMaterial color="#e8f4ff" emissive="#9ad4ff" emissiveIntensity={0.5} />
          </mesh>
        </>
      ) : null}

      {region === "egypt" && height > 10 ? (
        <mesh position={[0, height * 0.92, 0]}>
          <boxGeometry args={[w * 1.02, 0.7, d * 1.02]} />
          <meshStandardMaterial color="#d2b48c" roughness={0.82} />
        </mesh>
      ) : null}

      {region === "alps" ? (
        <mesh position={[0, height + 1.3, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(w, d) * 0.62, 2.6, 4]} />
          <meshStandardMaterial color="#f4f7fb" roughness={0.9} />
        </mesh>
      ) : null}

      {region === "london" && height > 8 && isBrick ? (
        <>
          <mesh position={[-w * 0.22, height + 1.5, -d * 0.18]}>
            <cylinderGeometry args={[0.28, 0.32, 2.2, 8]} />
          <meshStandardMaterial color="#6a4034" roughness={0.85} />
          </mesh>
          <mesh position={[w * 0.18, height + 1.2, d * 0.12]}>
            <cylinderGeometry args={[0.22, 0.26, 1.7, 8]} />
            <meshStandardMaterial color="#5a382e" roughness={0.85} />
          </mesh>
        </>
      ) : null}

      {region === "nyc" && height > 22 ? (
        <mesh position={[-w * 0.16, height + 2.4, d * 0.12]}>
          <cylinderGeometry args={[0.85, 0.7, 2.2, 10]} />
          <meshStandardMaterial color="#8a9098" roughness={0.55} metalness={0.25} />
        </mesh>
      ) : null}

      <mesh position={[0, height + 0.18, 0]}>
        <boxGeometry args={[w * 0.97, 0.36, d * 0.97]} />
        <meshStandardMaterial
          color={region === "rio" ? "#c45c3a" : "#2e3844"}
          roughness={0.82}
        />
      </mesh>
      {region !== "alps" ? (
        <mesh
          position={[(-0.2 + a * 0.22) * w, height + 1.05, (-0.12 + b * 0.16) * d]}
        >
          <boxGeometry
            args={[Math.min(4.4, w * 0.3), 1.45, Math.min(3.4, d * 0.24)]}
          />
          <meshStandardMaterial color="#4a5560" roughness={0.68} />
        </mesh>
      ) : null}
      {c > 0.4 && region !== "alps" ? (
        <mesh position={[0.2 * w, height + 1.45, 0.16 * d]}>
          <cylinderGeometry args={[0.62, 0.62, 1.05, 10]} />
          <meshStandardMaterial color="#6a7380" metalness={0.4} roughness={0.4} />
        </mesh>
      ) : null}
      {height > 24 ? (
        <mesh position={[w * 0.16, height + 3.2, -d * 0.1]}>
          <cylinderGeometry args={[0.06, 0.09, 4.8, 6]} />
          <meshStandardMaterial color="#8a96a4" metalness={0.55} roughness={0.35} />
        </mesh>
      ) : null}
    </group>
  );
}
