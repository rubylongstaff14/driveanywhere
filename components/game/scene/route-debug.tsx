"use client";

import { Line } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { wgs84ToLocal } from "@/lib/geo/coordinate-projection";
import type { RouteData } from "@/lib/validation/route-data";

interface RouteDebugProps {
  route: RouteData;
}

/**
 * Development-only source-data visualisation. F3 toggles raw OSM road and
 * footprint outlines over the generated playable route, making any smoothing
 * or placement drift inspectable before publishing a route.
 */
export function RouteDebug({ route }: RouteDebugProps) {
  const [enabled, setEnabled] = useState(false);
  const realWorld = route.realWorld;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "F3") return;
      event.preventDefault();
      setEnabled((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const sourceRoads = useMemo(() => {
    if (!realWorld) return [];
    return realWorld.sourceGeometry.roads.map((road) =>
      road.points.map((point) => {
        const local = wgs84ToLocal(point, realWorld.projection);
        return [local.x, local.y + 0.35, local.z] as [number, number, number];
      }),
    );
  }, [realWorld]);

  const footprints = useMemo(() => {
    if (!realWorld) return [];
    return realWorld.sourceGeometry.buildings.map((building) =>
      building.footprint
        .map((point) => {
          const local = wgs84ToLocal(point, realWorld.projection);
          return [local.x, local.y + 0.45, local.z] as [number, number, number];
        })
        .concat(
          (() => {
            const first = building.footprint[0];
            const local = wgs84ToLocal(first, realWorld.projection);
            return [[local.x, local.y + 0.45, local.z] as [number, number, number]];
          })(),
        ),
    );
  }, [realWorld]);

  if (process.env.NODE_ENV !== "development" || !enabled || !realWorld) {
    return null;
  }

  return (
    <group name="route-debug">
      {sourceRoads.map((points, index) => (
        <Line
          key={`source-road-${realWorld.sourceGeometry.roads[index].osmWayId}`}
          points={points}
          color="#ff3b81"
          lineWidth={2.5}
          depthTest={false}
        />
      ))}
      <Line
        points={route.roadPoints.map((point) => [point.x, point.y + 0.55, point.z])}
        color="#42f5c5"
        lineWidth={1.6}
        depthTest={false}
      />
      {footprints.map((points, index) => (
        <Line
          key={`source-building-${realWorld.sourceGeometry.buildings[index].osmWayId}`}
          points={points}
          color="#f8d85c"
          lineWidth={0.8}
          depthTest={false}
        />
      ))}
    </group>
  );
}
