"use client";

import { RoundedBox } from "@react-three/drei";
import type { BumperStyle, KitStyle, WingStyle } from "@/lib/game/cosmetics";
import type { VehicleId } from "@/lib/game/vehicles";

export function CarAeroParts({
  vehicleId = "sports",
  bumper,
  wing,
  kit,
  paint,
  paintDark,
}: {
  vehicleId?: VehicleId;
  bumper: BumperStyle;
  wing: WingStyle;
  kit: KitStyle;
  paint: string;
  paintDark: string;
}) {
  if (vehicleId === "f1") {
    return <F1Aero bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />;
  }
  if (vehicleId === "gwagon") {
    return <SuvAero bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />;
  }
  if (vehicleId === "corsa") {
    return <HatchAero bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />;
  }
  return <GtAero bumper={bumper} wing={wing} kit={kit} paint={paint} paintDark={paintDark} />;
}

function GtAero({
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

/** Front wing variants replace cascade; rear wing variants REPLACE factory beam. */
function F1Aero({
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
        <mesh position={[0, 0.12, 2.22]} castShadow>
          <boxGeometry args={[1.95, 0.04, 0.42]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {bumper === "aggressive" ? (
        <group>
          <RoundedBox args={[2.05, 0.05, 0.48]} radius={0.02} position={[0, 0.14, 2.2]} castShadow>
            <meshStandardMaterial color={paint} metalness={0.35} />
          </RoundedBox>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.95, 0.22, 2.05]} castShadow>
              <boxGeometry args={[0.08, 0.28, 0.35]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
        </group>
      ) : null}
      {bumper === "track" ? (
        <group>
          <mesh position={[0, 0.1, 2.28]} castShadow>
            <boxGeometry args={[2.1, 0.05, 0.55]} />
            <meshStandardMaterial color="#0e1014" />
          </mesh>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 1.0, 0.28, 2.0]} castShadow>
              <boxGeometry args={[0.1, 0.4, 0.4]} />
              <meshStandardMaterial color="#c8d0da" metalness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}

      {wing === "lip" ? (
        <mesh position={[0, 0.72, -1.9]} castShadow>
          <boxGeometry args={[0.9, 0.04, 0.28]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {wing === "gt" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.28, 0.7, -1.85]} castShadow>
              <boxGeometry args={[0.05, 0.45, 0.08]} />
              <meshStandardMaterial color="#bbb" metalness={0.6} />
            </mesh>
          ))}
          <RoundedBox args={[1.15, 0.05, 0.34]} radius={0.015} position={[0, 0.95, -1.88]} castShadow>
            <meshStandardMaterial color={paintDark} />
          </RoundedBox>
        </group>
      ) : null}
      {wing === "swan" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * 0.32, 0.65, -1.7]}
              rotation={[0.45, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.05, 0.7, 0.07]} />
              <meshStandardMaterial color="#ccc" metalness={0.65} />
            </mesh>
          ))}
          <mesh position={[0, 1.05, -1.95]} castShadow>
            <boxGeometry args={[1.2, 0.045, 0.36]} />
            <meshStandardMaterial color={paint} metalness={0.4} />
          </mesh>
        </group>
      ) : null}

      {kit === "skirts" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.72, 0.18, -0.1]} castShadow>
              <boxGeometry args={[0.06, 0.06, 1.8]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "canards" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.55, 0.28, 1.2]} castShadow>
              <boxGeometry args={[0.22, 0.03, 0.35]} />
              <meshStandardMaterial color="#1a1d22" />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "roof" ? (
        <mesh position={[0, 0.78, -0.05]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.22]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ) : null}
      {kit === "lights" ? (
        <mesh position={[0, 0.55, -1.55]}>
          <boxGeometry args={[0.2, 0.08, 0.06]} />
          <meshStandardMaterial color="#ff3030" emissive="#ff2020" emissiveIntensity={2} />
        </mesh>
      ) : null}
    </group>
  );
}

function SuvAero({
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
        <mesh position={[0, 0.35, 2.15]} castShadow>
          <boxGeometry args={[1.9, 0.12, 0.35]} />
          <meshStandardMaterial color="#2a2e32" metalness={0.5} />
        </mesh>
      ) : null}
      {bumper === "aggressive" ? (
        <mesh position={[0, 0.42, 2.2]} castShadow>
          <boxGeometry args={[2.0, 0.28, 0.4]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.6} />
        </mesh>
      ) : null}
      {bumper === "track" ? (
        <group>
          <mesh position={[0, 0.4, 2.25]} castShadow>
            <boxGeometry args={[2.05, 0.35, 0.45]} />
            <meshStandardMaterial color="#15171a" />
          </mesh>
          <mesh position={[0, 0.55, 2.35]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.35, 8]} />
            <meshStandardMaterial color="#888" metalness={0.7} />
          </mesh>
        </group>
      ) : null}

      {wing === "lip" ? (
        <mesh position={[0, 1.72, -1.9]} castShadow>
          <boxGeometry args={[1.7, 0.06, 0.2]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {wing === "gt" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.7, 1.78, 0]} castShadow>
              <boxGeometry args={[0.08, 0.08, 2.2]} />
              <meshStandardMaterial color="#2a2e32" metalness={0.5} />
            </mesh>
          ))}
          {[ -0.6, 0, 0.6 ].map((z) => (
            <mesh key={z} position={[0, 1.78, z]} castShadow>
              <boxGeometry args={[1.5, 0.06, 0.08]} />
              <meshStandardMaterial color="#3a4048" />
            </mesh>
          ))}
        </group>
      ) : null}
      {wing === "swan" ? (
        <mesh position={[-1.05, 1.2, 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.4, 8]} />
          <meshStandardMaterial color="#4a5560" metalness={0.45} />
        </mesh>
      ) : null}

      {kit === "skirts" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 1.1, 0.38, 0]} castShadow>
              <boxGeometry args={[0.1, 0.12, 2.8]} />
              <meshStandardMaterial color="#1a1c20" />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "canards" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.85, 0.95, 2.0]} castShadow>
              <boxGeometry args={[0.2, 0.12, 0.15]} />
              <meshStandardMaterial color="#f5f0d8" emissive="#ffe8a0" emissiveIntensity={0.5} />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "roof" ? (
        <mesh position={[0, 1.78, -0.2]} castShadow>
          <boxGeometry args={[1.6, 0.06, 2.0]} />
          <meshStandardMaterial color="#2a2e32" />
        </mesh>
      ) : null}
      {kit === "lights" ? (
        <mesh position={[0, 1.85, 0.9]}>
          <boxGeometry args={[1.2, 0.1, 0.12]} />
          <meshStandardMaterial color="#fff4d0" emissive="#ffe8a0" emissiveIntensity={1.8} />
        </mesh>
      ) : null}
    </group>
  );
}

function HatchAero({
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
        <mesh position={[0, 0.16, 1.9]} castShadow>
          <boxGeometry args={[1.45, 0.05, 0.22]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {bumper === "aggressive" ? (
        <mesh position={[0, 0.15, 1.95]} castShadow>
          <boxGeometry args={[1.55, 0.08, 0.28]} />
          <meshStandardMaterial color={paint} />
        </mesh>
      ) : null}
      {bumper === "track" ? (
        <mesh position={[0, 0.12, 2.0]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[1.6, 0.05, 0.35]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ) : null}

      {wing === "lip" ? (
        <mesh position={[0, 1.05, -1.65]} castShadow>
          <boxGeometry args={[1.2, 0.04, 0.18]} />
          <meshStandardMaterial color={paintDark} />
        </mesh>
      ) : null}
      {wing === "gt" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.35, 1.1, -1.6]} castShadow>
              <boxGeometry args={[0.05, 0.22, 0.06]} />
              <meshStandardMaterial color="#bbb" metalness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, 1.24, -1.62]} castShadow>
            <boxGeometry args={[1.25, 0.04, 0.22]} />
            <meshStandardMaterial color={paintDark} />
          </mesh>
        </group>
      ) : null}
      {wing === "swan" ? (
        <group>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.32, 1.05, -1.45]} rotation={[0.35, 0, 0]} castShadow>
              <boxGeometry args={[0.04, 0.4, 0.06]} />
              <meshStandardMaterial color="#aaa" metalness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 1.3, -1.7]} castShadow>
            <boxGeometry args={[1.2, 0.04, 0.26]} />
            <meshStandardMaterial color={paint} />
          </mesh>
        </group>
      ) : null}

      {kit === "skirts" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.9, 0.2, 0]} castShadow>
              <boxGeometry args={[0.07, 0.08, 2.2]} />
              <meshStandardMaterial color={paintDark} />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "canards" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.82, 0.28, 1.55]} rotation={[0, side * 0.3, 0]} castShadow>
              <boxGeometry args={[0.22, 0.03, 0.18]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
        </>
      ) : null}
      {kit === "roof" ? (
        <mesh position={[0, 1.2, -0.35]} castShadow>
          <boxGeometry args={[0.15, 0.2, 0.15]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ) : null}
      {kit === "lights" ? (
        <>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.5, 0.35, 1.9]}>
              <boxGeometry args={[0.22, 0.08, 0.05]} />
              <meshStandardMaterial color="#9fd4ff" emissive="#7ec8ff" emissiveIntensity={1.2} />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  );
}
