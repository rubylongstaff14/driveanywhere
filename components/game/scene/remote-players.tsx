"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { VehicleBody } from "@/components/game/scene/vehicle-body";
import { getVehicle } from "@/lib/game/vehicles";
import {
  remoteCarBuffer,
  remoteInterpDelayMs,
  type RemoteSample,
} from "@/lib/multiplayer/remote-car-buffer";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

interface RemoteCarProps {
  playerId: string;
  playerName: string;
  color: string;
  vehicleId: string;
  ghost?: boolean;
}

const FALLBACK_COLORS = [
  "#38bdf8",
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f59e0b",
];

function sampleAt(
  history: RemoteSample[],
  renderTime: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
  qA: THREE.Quaternion,
  qB: THREE.Quaternion,
  qTmp: THREE.Quaternion,
): void {
  const newest = history[history.length - 1];
  const oldest = history[0];

  if (renderTime >= newest.timestamp) {
    const prev = history[history.length - 2] ?? newest;
    const dtSec = Math.max(0.012, (newest.timestamp - prev.timestamp) / 1000);
    const vx = newest.state.vx ?? (newest.state.x - prev.state.x) / dtSec;
    const vz = newest.state.vz ?? (newest.state.z - prev.state.z) / dtSec;
    const vy = (newest.state.y - prev.state.y) / dtSec;
    const extraSec = Math.min(0.18, (renderTime - newest.timestamp) / 1000);
    outPos.set(
      newest.state.x + vx * extraSec,
      newest.state.y + vy * extraSec,
      newest.state.z + vz * extraSec,
    );
    outQuat.set(newest.state.qx, newest.state.qy, newest.state.qz, newest.state.qw);
    return;
  }

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
  const vx0 = a.state.vx;
  const vz0 = a.state.vz;
  const vx1 = b.state.vx;
  const vz1 = b.state.vz;
  if (vx0 != null && vz0 != null && vx1 != null && vz1 != null && denom > 0) {
    const t = u;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const dt = denom / 1000;
    outPos.set(
      h00 * a.state.x + h10 * vx0 * dt + h01 * b.state.x + h11 * vx1 * dt,
      a.state.y + (b.state.y - a.state.y) * u,
      h00 * a.state.z + h10 * vz0 * dt + h01 * b.state.z + h11 * vz1 * dt,
    );
  } else {
    outPos.set(
      a.state.x + (b.state.x - a.state.x) * u,
      a.state.y + (b.state.y - a.state.y) * u,
      a.state.z + (b.state.z - a.state.z) * u,
    );
  }
  qA.set(a.state.qx, a.state.qy, a.state.qz, a.state.qw);
  qB.set(b.state.qx, b.state.qy, b.state.qz, b.state.qw);
  qTmp.slerpQuaternions(qA, qB, u);
  outQuat.copy(qTmp);
}

function RemoteCar({
  playerId,
  playerName,
  color,
  vehicleId,
  ghost = false,
}: RemoteCarProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const qA = useRef(new THREE.Quaternion());
  const qB = useRef(new THREE.Quaternion());
  const qTmp = useRef(new THREE.Quaternion());
  const paintRef = useRef(color);
  const [paint, setPaint] = useState(color);
  const ready = useRef(false);

  useEffect(() => {
    if (color && color !== paintRef.current) {
      paintRef.current = color;
      setPaint(color);
    }
  }, [color]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const history = remoteCarBuffer.history[playerId];
    const delay = remoteInterpDelayMs();
    const renderTime = Date.now() - delay;

    const applyPaint = (hex?: string) => {
      if (!hex || hex === paintRef.current) return;
      paintRef.current = hex;
      setPaint(hex);
    };

    if (!history || history.length < 2) {
      const state = remoteCarBuffer.states[playerId];
      if (!state) return;
      applyPaint(state.paint);
      targetPos.current.set(state.x, state.y, state.z);
      targetQuat.current.set(state.qx, state.qy, state.qz, state.qw);
    } else {
      applyPaint(history[history.length - 1].state.paint);
      sampleAt(
        history,
        renderTime,
        targetPos.current,
        targetQuat.current,
        qA.current,
        qB.current,
        qTmp.current,
      );
    }

    const err = meshRef.current.position.distanceToSquared(targetPos.current);
    if (!ready.current || err > 324) {
      meshRef.current.position.copy(targetPos.current);
      meshRef.current.quaternion.copy(targetQuat.current);
      ready.current = true;
      return;
    }
    // Light smoothing only — most motion comes from the interpolated target
    const rate = 1 - Math.exp(-(err > 16 ? 48 : 28) * delta);
    meshRef.current.position.lerp(targetPos.current, rate);
    meshRef.current.quaternion.slerp(targetQuat.current, rate);
  });

  const vehicle = getVehicle(vehicleId);

  return (
    <group ref={meshRef}>
      <VehicleBody
        id={vehicle.id}
        paint={paint}
        paintDark={paint}
        simple
        ghost={ghost}
      />
      <Html
        position={[0, 2.15, 0]}
        center
        distanceFactor={18}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/70 shadow"
            style={{ backgroundColor: paint }}
          />
          <span className="whitespace-nowrap rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white/95">
            {playerName}
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Chase camera when you join mid-race as a spectator. */
export function SpectatorCamera() {
  const { camera } = useThree();
  const spectating = useMultiplayerStore((s) => s.spectating);
  const remotePlayerIdKey = useMultiplayerStore((s) => s.remotePlayerIdKey);
  const [targetIdx, setTargetIdx] = useState(0);
  const look = useRef(new THREE.Vector3());
  const cam = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!spectating) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "BracketRight" || e.code === "KeyE") {
        setTargetIdx((i) => i + 1);
      } else if (e.code === "BracketLeft" || e.code === "KeyQ") {
        setTargetIdx((i) => i - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spectating]);

  const ids = useMemo(
    () => (remotePlayerIdKey ? remotePlayerIdKey.split(",") : []),
    [remotePlayerIdKey],
  );

  useFrame((_, delta) => {
    if (!spectating || ids.length === 0) return;
    const idx = ((targetIdx % ids.length) + ids.length) % ids.length;
    const id = ids[idx];
    const state = remoteCarBuffer.states[id];
    if (!state) return;
    const yaw = Math.atan2(
      2 * state.qw * state.qy,
      1 - 2 * state.qy * state.qy,
    );
    const back = 11;
    const height = 4.2;
    cam.current.set(
      state.x - Math.sin(yaw) * back,
      state.y + height,
      state.z - Math.cos(yaw) * back,
    );
    look.current.set(state.x, state.y + 1.1, state.z);
    const rate = 1 - Math.exp(-6 * delta);
    camera.position.lerp(cam.current, rate);
    camera.lookAt(look.current);
  });

  return null;
}

export function RemotePlayers() {
  const myId = useMultiplayerStore((s) => s.myId);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const remotePlayerIdKey = useMultiplayerStore((s) => s.remotePlayerIdKey);
  const spectating = useMultiplayerStore((s) => s.spectating);

  const ids = useMemo(
    () => (remotePlayerIdKey ? remotePlayerIdKey.split(",") : []),
    [remotePlayerIdKey],
  );

  if (!currentRoom || !myId) return null;

  const remotePlayers = currentRoom.players.filter(
    (p) => p.id !== myId && ids.includes(p.id),
  );

  return (
    <>
      {spectating ? <SpectatorCamera /> : null}
      {remotePlayers.map((p, i) => {
        const live = remoteCarBuffer.states[p.id];
        const color =
          live?.paint ||
          p.paint ||
          FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        return (
          <RemoteCar
            key={p.id}
            playerId={p.id}
            playerName={p.name}
            color={color}
            vehicleId={p.vehicleId || currentRoom.vehicleId}
            ghost={spectating}
          />
        );
      })}
    </>
  );
}
