"use client";

import { RoundedBox } from "@react-three/drei";
import type { BumperStyle, KitStyle, WingStyle } from "@/lib/game/cosmetics";

export function CarAeroParts({
  bumper,
  wing,
  kit,
  paint,
  paintDark,
}: {
  bumper: BumperStyle;
  wing: WingStyle;
  kit: KitStyle;
  paint: string;
  paintDark: string;
}) {
  return (
    <group>
      {bumper === "lip" ? (
        <mesh position={[0, 0.18, 2.28]} castShadow>
          <boxGeometry args={[1.55, 0.06, 0.28]} />
          <meshStandardMaterial color={paintDark} roughness={0.4} />
        </mesh>
      ) : null}
      {bumper === "track" ? (
        <group>
          <mesh position={[0, 0.14, 2.35]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[1.72, 0.05, 0.42]} />
            <meshStandardMaterial color="#111318" roughness={0.45} />
          </mesh>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * 0.78, 0.22, 2.12]}
              rotation={[0.2, 0, side * 0.2]}
              castShadow
            >
              <boxGeometry args={[0.22, 0.08, 0.38]} />
              <meshStandardMaterial color="#111318" />
            </mesh>
          ))}
        </group>
      ) : null}
      {bumper === "aggressive" ? (
        <mesh position={[0, 0.16, 2.32]} castShadow>
          <boxGeometry args={[1.68, 0.1, 0.34]} />
          <meshStandardMaterial color={paint} metalness={0.35} roughness={0.32} />
        </mesh>
      ) : null}

      {wing === "lip" ? (
        <mesh position={[0, 0.62, -2.12]} castShadow>
          <boxGeometry args={[1.35, 0.04, 0.22]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {wing === "gt" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.42, 0.78, -2.05]} castShadow>
              <boxGeometry args={[0.06, 0.32, 0.08]} />
              <meshStandardMaterial color="#c8d0da" metalness={0.7} roughness={0.25} />
            </mesh>
          ))}
          <RoundedBox args={[1.55, 0.05, 0.28]} radius={0.02} position={[0, 0.96, -2.05]} castShadow>
            <meshStandardMaterial color={paintDark} metalness={0.4} roughness={0.3} />
          </RoundedBox>
        </group>
      ) : null}
      {wing === "swan" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * 0.38, 0.72, -1.85]}
              rotation={[0.4, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.05, 0.55, 0.08]} />
              <meshStandardMaterial color="#bbb" metalness={0.65} roughness={0.28} />
            </mesh>
          ))}
          <mesh position={[0, 1.02, -2.12]} castShadow>
            <boxGeometry args={[1.48, 0.045, 0.32]} />
            <meshStandardMaterial color={paint} metalness={0.45} roughness={0.28} />
          </mesh>
        </group>
      ) : null}

      {kit === "skirts" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.98, 0.22, 0]} castShadow>
              <boxGeometry args={[0.08, 0.1, 2.6]} />
              <meshStandardMaterial color={paintDark} roughness={0.4} />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "canards" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * 0.92, 0.32, 1.85]}
              rotation={[0, side * 0.35, 0]}
              castShadow
            >
              <boxGeometry args={[0.28, 0.03, 0.22]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "roof" ? (
        <mesh position={[0, 1.08, -0.2]} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.7]} />
          <meshStandardMaterial color="#1a1d22" roughness={0.5} />
        </mesh>
      ) : null}
      {kit === "lights" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.62, 0.38, 2.24]}>
              <boxGeometry args={[0.28, 0.08, 0.05]} />
              <meshStandardMaterial
                color="#9fd4ff"
                emissive="#7ec8ff"
                emissiveIntensity={1.4}
              />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  );
}
