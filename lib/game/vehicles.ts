export type VehicleId = "sports" | "f1" | "corsa" | "gwagon";

export interface VehicleDef {
  id: VehicleId;
  name: string;
  tagline: string;
  /** Body paint hex. */
  paint: string;
  paintDark: string;
  /** 0–100 UI bars. */
  stats: {
    speed: number;
    accel: number;
    grip: number;
    weight: number;
  };
  /** Multipliers applied to arcade drive constants. */
  tuning: {
    maxSpeedMul: number;
    accelMul: number;
    brakeMul: number;
    gripMul: number;
    steerMul: number;
  };
  mass: number;
  collider: {
    halfWidth: number;
    halfHeight: number;
    halfLength: number;
    offsetY: number;
  };
}

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  sports: {
    id: "sports",
    name: "Sports GT",
    tagline: "Balanced street racer — quick, planted, forgiving.",
    paint: "#c8102e",
    paintDark: "#8f0c20",
    stats: { speed: 82, accel: 78, grip: 74, weight: 55 },
    tuning: {
      maxSpeedMul: 1.04,
      accelMul: 1.06,
      brakeMul: 1,
      gripMul: 1,
      steerMul: 1,
    },
    mass: 320,
    collider: {
      halfWidth: 0.88,
      halfHeight: 0.32,
      halfLength: 2.05,
      offsetY: 0.38,
    },
  },
  f1: {
    id: "f1",
    name: "Open-Wheel",
    tagline: "Peak pace and bite — rewards clean lines.",
    paint: "#e8eef4",
    paintDark: "#c8102e",
    stats: { speed: 98, accel: 96, grip: 92, weight: 28 },
    tuning: {
      maxSpeedMul: 1.22,
      accelMul: 1.32,
      brakeMul: 1.25,
      gripMul: 1.2,
      steerMul: 1.15,
    },
    mass: 180,
    collider: {
      halfWidth: 0.72,
      halfHeight: 0.24,
      halfLength: 2.05,
      offsetY: 0.3,
    },
  },
  corsa: {
    id: "corsa",
    name: "Vauxhall Corsa",
    tagline: "Silver hatch — modest pace, easy to place.",
    paint: "#c5cad0",
    paintDark: "#8a9098",
    stats: { speed: 52, accel: 48, grip: 58, weight: 48 },
    tuning: {
      maxSpeedMul: 0.74,
      accelMul: 0.75,
      brakeMul: 0.85,
      gripMul: 0.88,
      steerMul: 1.05,
    },
    mass: 280,
    collider: {
      halfWidth: 0.82,
      halfHeight: 0.34,
      halfLength: 1.72,
      offsetY: 0.36,
    },
  },
  gwagon: {
    id: "gwagon",
    name: "G-Wagon",
    tagline: "Heavy box — stable, slower on top end.",
    paint: "#1a1c20",
    paintDark: "#0c0e10",
    stats: { speed: 58, accel: 42, grip: 62, weight: 92 },
    tuning: {
      maxSpeedMul: 0.8,
      accelMul: 0.68,
      brakeMul: 0.9,
      gripMul: 0.82,
      steerMul: 0.85,
    },
    mass: 520,
    collider: {
      halfWidth: 1.0,
      halfHeight: 0.5,
      halfLength: 2.05,
      offsetY: 0.58,
    },
  },
};

export const VEHICLE_LIST: VehicleDef[] = [
  VEHICLES.sports,
  VEHICLES.f1,
  VEHICLES.corsa,
  VEHICLES.gwagon,
];

export function getVehicle(id: string | null | undefined): VehicleDef {
  if (id && id in VEHICLES) return VEHICLES[id as VehicleId];
  return VEHICLES.sports;
}
