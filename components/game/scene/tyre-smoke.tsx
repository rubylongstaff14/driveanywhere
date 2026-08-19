"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carTelemetry } from "@/lib/game/telemetry";

interface SmokeInput {
  slip: number;
  handbrake: boolean;
  brake: number;
}

interface TyreSmokeProps {
  input: MutableRefObject<SmokeInput>;
}

const COUNT = 56;

/** Rear-tyre smoke when sliding, locking, or trail-braking hard. */
export function TyreSmoke({ input }: TyreSmokeProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < COUNT; i += 1) {
      list.push({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        size: 0.2,
        side: i % 2 === 0 ? -1 : 1,
      });
    }
    return list;
  }, []);
  const emitAcc = useRef(0);

  useFrame((_, rawDelta) => {
    const inst = mesh.current;
    if (!inst) return;
    const dt = Math.min(0.05, rawDelta);
    const slip = input.current.slip;
    const sliding =
      input.current.handbrake || slip > 2.8 || input.current.brake > 0.85;
    const speed = carTelemetry.speedKph;
    const intensity = sliding
      ? Math.min(
          1,
          (input.current.handbrake ? 0.7 : 0) +
            Math.max(0, slip - 2.2) * 0.16 +
            (input.current.brake > 0.85 ? 0.35 : 0),
        )
      : 0;

    emitAcc.current += dt * (intensity > 0.12 && speed > 22 ? 28 * intensity : 0);
    while (emitAcc.current >= 1) {
      emitAcc.current -= 1;
      const p = particles.reduce((oldest, cur) =>
        cur.life < oldest.life ? cur : oldest,
      );
      const side = Math.random() > 0.5 ? -1 : 1;
      p.x = side * (0.82 + Math.random() * 0.18);
      p.y = 0.08;
      p.z = -1.28 - Math.random() * 0.22;
      p.vx = side * (0.15 + Math.random() * 0.35);
      p.vy = 0.55 + Math.random() * 0.7;
      p.vz = -0.8 - Math.random() * 1.1;
      p.life = 0.55 + Math.random() * 0.45;
      p.size = 0.18 + intensity * 0.28;
      p.side = side;
    }

    for (let i = 0; i < COUNT; i += 1) {
      const p = particles[i];
      if (p.life <= 0) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -4, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy += 0.35 * dt;
      const fade = Math.max(0, p.life);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.size * (0.45 + (1 - fade) * 1.6));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, COUNT]}
      frustumCulled={false}
      renderOrder={6}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#d8d4cc"
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
