import type { VehicleId } from "@/lib/game/vehicles";

export interface GearboxProfile {
  /** Forward gear ratios (index 0 = 1st). */
  ratios: number[];
  finalDrive: number;
  wheelRadius: number;
  idleRpm: number;
  redlineRpm: number;
  shiftUpRpm: number;
  shiftDownRpm: number;
  /** Seconds of torque cut while auto-shifting. */
  shiftDuration: number;
  /**
   * Road speed (m/s) where top gear should be engaged. Arcade top speeds are
   * too narrow for a full F1 stack on RPM alone, so we also ladder by speed.
   */
  cruiseSpeedMs: number;
}

export interface GearboxState {
  gear: number; // 1..N, or 0 for N
  rpm: number;
  /** 0 at idle → 1 at redline. */
  rpmNorm: number;
  /** Torque multiplier for longitudinal accel (power band). */
  torqueMul: number;
  shifting: boolean;
}

const PROFILES: Record<VehicleId, GearboxProfile> = {
  sports: {
    ratios: [3.8, 2.4, 1.68, 1.28, 1.02, 0.86],
    finalDrive: 3.5,
    wheelRadius: 0.33,
    idleRpm: 850,
    redlineRpm: 7400,
    shiftUpRpm: 6200,
    shiftDownRpm: 2300,
    shiftDuration: 0.2,
    cruiseSpeedMs: 40,
  },
  f1: {
    // 8-speed race stack
    ratios: [3.55, 2.75, 2.2, 1.82, 1.52, 1.3, 1.12, 0.98],
    finalDrive: 3.15,
    wheelRadius: 0.33,
    idleRpm: 5200,
    redlineRpm: 14000,
    shiftUpRpm: 11800,
    shiftDownRpm: 7800,
    shiftDuration: 0.06,
    cruiseSpeedMs: 48,
  },
  corsa: {
    // 6-speed hatch
    ratios: [3.95, 2.35, 1.62, 1.22, 0.98, 0.82],
    finalDrive: 3.75,
    wheelRadius: 0.3,
    idleRpm: 800,
    redlineRpm: 6400,
    shiftUpRpm: 5400,
    shiftDownRpm: 2000,
    shiftDuration: 0.26,
    cruiseSpeedMs: 30,
  },
  gwagon: {
    // 6-speed auto
    ratios: [4.4, 2.55, 1.65, 1.2, 0.95, 0.78],
    finalDrive: 3.3,
    wheelRadius: 0.4,
    idleRpm: 700,
    redlineRpm: 5200,
    shiftUpRpm: 4200,
    shiftDownRpm: 1600,
    shiftDuration: 0.3,
    cruiseSpeedMs: 32,
  },
};

export function getGearboxProfile(id: VehicleId): GearboxProfile {
  return PROFILES[id];
}

/** RPM for a given road speed (m/s) in a given forward gear. */
export function rpmAtSpeed(
  speedMs: number,
  gear: number,
  profile: GearboxProfile,
): number {
  if (gear < 1) return profile.idleRpm;
  const ratio = profile.ratios[gear - 1] ?? profile.ratios.at(-1)!;
  const wheelRps = Math.abs(speedMs) / (2 * Math.PI * profile.wheelRadius);
  const rpm = wheelRps * ratio * profile.finalDrive * 60;
  return Math.max(profile.idleRpm, rpm);
}

/**
 * Torque curve — strong mid-band, soft near idle / redline so accel isn't linear.
 */
export function torqueCurve(rpmNorm: number, throttle: number): number {
  const n = Math.max(0, Math.min(1, rpmNorm));
  const band = Math.sin(Math.PI * Math.pow(n, 0.88));
  const peak = 0.32 + band * 0.88;
  const redlineCut = n > 0.88 ? 1 - (n - 0.88) * 1.6 : 1;
  const throttleLoad = 0.28 + throttle * 0.72;
  return Math.max(0.14, peak * throttleLoad * Math.max(0.45, redlineCut));
}

/** Gear the auto box should be climbing toward at this road speed. */
export function gearForSpeed(speedMs: number, profile: GearboxProfile): number {
  const maxGear = profile.ratios.length;
  const t = Math.max(0, Math.min(0.99, Math.abs(speedMs) / profile.cruiseSpeedMs));
  return Math.min(maxGear, 1 + Math.floor(t * maxGear));
}

export class AutoGearbox {
  gear = 1;
  private shiftTimer = 0;
  private profile: GearboxProfile;

  constructor(vehicleId: VehicleId) {
    this.profile = getGearboxProfile(vehicleId);
  }

  setVehicle(vehicleId: VehicleId) {
    this.profile = getGearboxProfile(vehicleId);
    this.gear = 1;
    this.shiftTimer = 0;
  }

  step(
    speedMs: number,
    throttle: number,
    braking: boolean,
    delta: number,
  ): GearboxState {
    const p = this.profile;
    const maxGear = p.ratios.length;

    if (this.shiftTimer > 0) {
      this.shiftTimer = Math.max(0, this.shiftTimer - delta);
    }

    let rpm = rpmAtSpeed(speedMs, this.gear, p);
    if (Math.abs(speedMs) < 1.2 && throttle > 0.05) {
      rpm = Math.max(
        rpm,
        p.idleRpm + throttle * (p.shiftUpRpm - p.idleRpm) * 0.45,
      );
    }

    const desired = gearForSpeed(speedMs, p);

    if (this.shiftTimer <= 0) {
      const rpmUp =
        throttle > 0.12 &&
        !braking &&
        rpm >= p.shiftUpRpm &&
        this.gear < maxGear;
      // Speed ladder — ensures F1's 8 / hatch 6 are actually used in arcade range.
      const speedUp =
        throttle > 0.12 &&
        !braking &&
        desired > this.gear &&
        rpm > p.idleRpm * 1.05 &&
        this.gear < maxGear;

      if (rpmUp || speedUp) {
        this.gear += 1;
        this.shiftTimer = p.shiftDuration;
        rpm = rpmAtSpeed(speedMs, this.gear, p);
      } else if (this.gear > 1) {
        const lowThrottle = braking || throttle < 0.08;
        const rpmDown = lowThrottle && rpm <= p.shiftDownRpm;
        const speedDown = desired + 1 < this.gear;
        if (rpmDown || speedDown) {
          this.gear -= 1;
          this.shiftTimer = p.shiftDuration * 0.65;
          rpm = rpmAtSpeed(speedMs, this.gear, p);
        } else if (Math.abs(speedMs) < 0.4 && throttle < 0.02) {
          this.gear = 1;
          rpm = p.idleRpm;
        }
      } else if (Math.abs(speedMs) < 0.4 && throttle < 0.02) {
        this.gear = 1;
        rpm = p.idleRpm;
      }
    }

    rpm = Math.min(p.redlineRpm * 0.98, Math.max(p.idleRpm * 0.9, rpm));
    const rpmNorm =
      (rpm - p.idleRpm) / Math.max(500, p.redlineRpm - p.idleRpm);
    const shifting = this.shiftTimer > 0;
    let torqueMul = torqueCurve(rpmNorm, throttle);
    if (shifting) torqueMul *= 0.18;
    if (this.gear >= maxGear && rpmNorm > 0.82 && throttle > 0.5) {
      torqueMul *= 0.55;
    } else if (rpmNorm > 0.92 && throttle > 0.5) {
      torqueMul *= 0.6;
    }

    return {
      gear: Math.abs(speedMs) < 0.35 && throttle < 0.02 ? 0 : this.gear,
      rpm,
      rpmNorm: Math.max(0, Math.min(1, rpmNorm)),
      torqueMul,
      shifting,
    };
  }
}
