"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carTelemetry } from "@/lib/game/telemetry";

/** Cheap rain streaks that follow the car — no physics, no shadows. */
export function RainField({ wet }: { wet: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    const count = 220;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 48;
      data[i * 3 + 1] = Math.random() * 22;
      data[i * 3 + 2] = (Math.random() - 0.5) * 48;
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    const inst = mesh.current;
    if (!inst || !wet) return;
    const dt = Math.min(0.05, delta);
    for (let i = 0; i < 220; i += 1) {
      drops[i * 3 + 1] -= 28 * dt;
      if (drops[i * 3 + 1] < 0) drops[i * 3 + 1] = 18 + Math.random() * 6;
      dummy.position.set(
        carTelemetry.x + drops[i * 3],
        drops[i * 3 + 1],
        carTelemetry.z + drops[i * 3 + 2],
      );
      dummy.rotation.set(-0.45, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  if (!wet) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 220]} frustumCulled={false}>
      <cylinderGeometry args={[0.012, 0.012, 0.55, 3]} />
      <meshBasicMaterial color="#c5d4e4" transparent opacity={0.45} />
    </instancedMesh>
  );
}
