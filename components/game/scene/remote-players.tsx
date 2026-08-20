"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import { getVehicle } from "@/lib/game/vehicles";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

interface RemoteCarProps {
  playerId: string;
  color: string;
  vehicleId: string;
}

const COLORS = ["#38bdf8", "#f472b6", "#a78bfa", "#34d399", "#fbbf24"];

function RemoteCar({ playerId, color, vehicleId }: RemoteCarProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const qA = useRef(new THREE.Quaternion());
  const qB = useRef(new THREE.Quaternion());
  const qTmp = useRef(new THREE.Quaternion());
  const vTmp = useRef(new THREE.Vector3());

  // Small interpolation delay to allow smoothing between received states.
  const INTERP_DELAY_MS = 55;

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
      const newest = history[history.length - 1];
      const oldest = history[0];
      if (renderTime >= newest.timestamp && history.length >= 2) {
        const prev = history[history.length - 2];
        const dt = Math.max(1, newest.timestamp - prev.timestamp);
        const extra = Math.min(80, renderTime - newest.timestamp) / dt;
        vTmp.current.set(
          newest.state.x + (newest.state.x - prev.state.x) * extra,
          newest.state.y + (newest.state.y - prev.state.y) * extra,
          newest.state.z + (newest.state.z - prev.state.z) * extra,
        );
        targetPos.current.copy(vTmp.current);
        qB.current.set(newest.state.qx, newest.state.qy, newest.state.qz, newest.state.qw);
        targetQuat.current.copy(qB.current);
      } else {
        let a = oldest;
        let b = newest;
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
        vTmp.current.set(
          a.state.x + (b.state.x - a.state.x) * u,
          a.state.y + (b.state.y - a.state.y) * u,
          a.state.z + (b.state.z - a.state.z) * u,
        );
        targetPos.current.copy(vTmp.current);
        qA.current.set(a.state.qx, a.state.qy, a.state.qz, a.state.qw);
        qB.current.set(b.state.qx, b.state.qy, b.state.qz, b.state.qw);
        qTmp.current.slerpQuaternions(qA.current, qB.current, u);
        targetQuat.current.copy(qTmp.current);
      }
    }

    // Apply a final smoothing step to eliminate tiny jitter even after buffering.
    const rate = 1 - Math.exp(-35 * delta);
    meshRef.current.position.lerp(targetPos.current, rate);
    meshRef.current.quaternion.slerp(targetQuat.current, rate);
  });

  const vehicle = getVehicle(vehicleId);
  return (
    <group ref={meshRef}>
      <VehicleBody
        id={vehicle.id}
        paint={color}
        paintDark={vehicle.paintDark}
        simple
      />
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
          vehicleId={currentRoom.vehicleId}
        />
      ))}
    </>
  );
}
