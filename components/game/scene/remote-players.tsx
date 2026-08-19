"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

interface RemoteCarProps {
  playerId: string;
  color: string;
}

const COLORS = ["#38bdf8", "#f472b6", "#a78bfa", "#34d399", "#fbbf24"];

function RemoteCar({ playerId, color }: RemoteCarProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const qA = useRef(new THREE.Quaternion());
  const qB = useRef(new THREE.Quaternion());
  const qTmp = useRef(new THREE.Quaternion());
  const vTmp = useRef(new THREE.Vector3());

  // Small interpolation delay to allow smoothing between received states.
  const INTERP_DELAY_MS = 110;

  useFrame((_, delta) => {
    const { remoteCarStates, remoteCarStateHistory } = useMultiplayerStore.getState();
    if (!meshRef.current) return;

    const history = remoteCarStateHistory[playerId];
    const now = Date.now();
    const renderTime = now - INTERP_DELAY_MS;

    // If we don't have enough history yet, fall back to the latest state.
    if (!history || history.length < 2) {
      const state = remoteCarStates[playerId];
      if (!state) return;
      targetPos.current.set(state.x, state.y, state.z);
      targetQuat.current.set(state.qx, state.qy, state.qz, state.qw);
    } else {
      // Find 2 history samples around our render time.
      let a = history[0];
      let b = history[history.length - 1];
      for (let i = 0; i < history.length - 1; i += 1) {
        const cur = history[i];
        const nxt = history[i + 1];
        if (cur.timestamp <= renderTime && renderTime <= nxt.timestamp) {
          a = cur;
          b = nxt;
          break;
        }
      }

      const denom = b.timestamp - a.timestamp;
      const u = denom > 0 ? (renderTime - a.timestamp) / denom : 1;

      // Position: linear interpolation.
      vTmp.current.set(
        a.state.x + (b.state.x - a.state.x) * u,
        a.state.y + (b.state.y - a.state.y) * u,
        a.state.z + (b.state.z - a.state.z) * u,
      );
      targetPos.current.copy(vTmp.current);

      // Rotation: slerp between quaternion endpoints.
      qA.current.set(a.state.qx, a.state.qy, a.state.qz, a.state.qw);
      qB.current.set(b.state.qx, b.state.qy, b.state.qz, b.state.qw);
      qTmp.current.slerpQuaternions(qA.current, qB.current, u);
      targetQuat.current.copy(qTmp.current);
    }

    // Apply a final smoothing step to eliminate tiny jitter even after buffering.
    const rate = 1 - Math.exp(-35 * delta);
    meshRef.current.position.lerp(targetPos.current, rate);
    meshRef.current.quaternion.slerp(targetQuat.current, rate);
  });

  return (
    <group ref={meshRef}>
      {/* Simple car body */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.8, 0.7, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh castShadow position={[0, 0.95, -0.3]}>
        <boxGeometry args={[1.5, 0.55, 2.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {[[-0.8, 0.3, 1.3], [0.8, 0.3, 1.3], [-0.8, 0.3, -1.3], [0.8, 0.3, -1.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Name tag */}
    </group>
  );
}

export function RemotePlayers() {
  const myId = useMultiplayerStore((s) => s.myId);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const remotePlayerIds = useMultiplayerStore((s) => {
    const ids = Object.keys(s.remoteCarStates);
    return ids.sort().join(",");
  });

  if (!currentRoom || !myId) return null;

  const ids = remotePlayerIds ? remotePlayerIds.split(",") : [];
  const remotePlayers = currentRoom.players.filter(
    (p) => p.id !== myId && ids.includes(p.id),
  );

  return (
    <>
      {remotePlayers.map((p, i) => (
        <RemoteCar
          key={p.id}
          playerId={p.id}
          color={COLORS[i % COLORS.length]}
        />
      ))}
    </>
  );
}
