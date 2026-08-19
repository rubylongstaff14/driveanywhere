"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { wgs84ToLocal } from "@/lib/geo/coordinate-projection";
import type { RouteData } from "@/lib/validation/route-data";

function roadWidth(highway: string): number {
  if (highway === "primary") return 11;
  if (highway === "secondary") return 9;
  if (highway === "tertiary") return 8;
  if (highway.endsWith("_link")) return 7;
  if (highway === "residential" || highway === "unclassified") return 6.5;
  return 5;
}

function createContextRoadGeometry(
  route: RouteData,
): THREE.BufferGeometry | null {
  const realWorld = route.realWorld;
  const roads = realWorld?.contextGeometry?.roads;
  if (!realWorld || !roads?.length) return null;

  const positions: number[] = [];
  const indices: number[] = [];
  let vertex = 0;

  for (const road of roads) {
    const points = road.points.map((point) =>
      wgs84ToLocal(point, realWorld.projection),
    );
    const halfWidth = roadWidth(road.highway) / 2;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) continue;
      const nx = (-dz / length) * halfWidth;
      const nz = (dx / length) * halfWidth;
      positions.push(
        a.x - nx, 0.022, a.z - nz,
        a.x + nx, 0.022, a.z + nz,
        b.x - nx, 0.022, b.z - nz,
        b.x + nx, 0.022, b.z + nz,
      );
      indices.push(
        vertex, vertex + 2, vertex + 1,
        vertex + 1, vertex + 2, vertex + 3,
      );
      vertex += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createAreaGeometry(
  points: Array<{ latitude: number; longitude: number; elevationMetres?: number }>,
  route: RouteData,
): THREE.ShapeGeometry | null {
  const realWorld = route.realWorld;
  if (!realWorld || points.length < 3) return null;
  const local = points.map((point) =>
    wgs84ToLocal(point, realWorld.projection),
  );
  const shape = new THREE.Shape();
  local.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, -point.z);
    else shape.lineTo(point.x, -point.z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function RealWorldContext({ route }: { route: RouteData }) {
  const context = route.realWorld?.contextGeometry;
  const roads = useMemo(() => createContextRoadGeometry(route), [route]);
  const water = useMemo(
    () =>
      (context?.waterAreas ?? [])
        .map((area) => createAreaGeometry(area.points, route))
        .filter((geometry): geometry is THREE.ShapeGeometry => geometry !== null),
    [context?.waterAreas, route],
  );
  const green = useMemo(
    () =>
      (context?.greenAreas ?? [])
        .map((area) => createAreaGeometry(area.points, route))
        .filter((geometry): geometry is THREE.ShapeGeometry => geometry !== null),
    [context?.greenAreas, route],
  );

  useEffect(
    () => () => {
      roads?.dispose();
      water.forEach((geometry) => geometry.dispose());
      green.forEach((geometry) => geometry.dispose());
    },
    [green, roads, water],
  );

  if (!context) return null;

  return (
    <group name="real-world-context">
      {water.map((geometry, index) => (
        <mesh key={`water-${index}`} geometry={geometry} position-y={0.015}>
          <meshStandardMaterial
            color="#173b55"
            roughness={0.16}
            metalness={0.35}
            envMapIntensity={1.2}
          />
        </mesh>
      ))}
      {green.map((geometry, index) => (
        <mesh key={`green-${index}`} geometry={geometry} position-y={0.018}>
          <meshStandardMaterial color="#294736" roughness={0.96} />
        </mesh>
      ))}
      {roads ? (
        <mesh geometry={roads} receiveShadow>
          <meshStandardMaterial color="#252c34" roughness={0.94} />
        </mesh>
      ) : null}
    </group>
  );
}
