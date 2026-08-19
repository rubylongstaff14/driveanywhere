"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import type { CarState } from "@/lib/multiplayer/protocol";

interface RemoteCarProps {
  playerId: string;
  color: string;
}

const COLORS = ["#38bdf8", "#f472b6", "#a78bfa", "#34d399", "#fbbf24"];

function RemoteCar({ playerId, color }: RemoteCarProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const prevState = useRef<CarState | null>(null);

  useFrame((_, delta) => {
    const states = useMultiplayerStore.getState().remoteCarStates;
    const state = states[playerId];
    if (!state || !meshRef.current) return;

    targetPos.current.set(state.x, state.y, state.z);
    targetQuat.current.set(state.qx, state.qy, state.qz, state.qw);

    const rate = 1 - Math.exp(-12 * delta);
    meshRef.current.position.lerp(targetPos.current, rate);
    meshRef.current.quaternion.slerp(targetQuat.current, rate);

    prevState.current = state;
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
  const remoteCarStates = useMultiplayerStore((s) => s.remoteCarStates);

  if (!currentRoom || !myId) return null;

  const remotePlayers = currentRoom.players.filter(
    (p) => p.id !== myId && remoteCarStates[p.id],
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
