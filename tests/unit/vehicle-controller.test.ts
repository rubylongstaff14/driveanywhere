import { describe, expect, it } from "vitest";
import type { RapierRigidBody } from "@react-three/rapier";
import { GAME_CONSTANTS as C } from "@/lib/game/constants";
import { createControlState } from "@/lib/game/controls";
import { applyArcadeDriving } from "@/lib/game/vehicle-controller";

/** Minimal stand-in for the Rapier body surface the controller touches. */
function createFakeBody(yaw = 0) {
  const state = {
    linvel: { x: 0, y: 0, z: 0 },
    angvel: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
  };

  const body = {
    rotation: () => state.rotation,
    linvel: () => state.linvel,
    angvel: () => state.angvel,
    setLinvel: (value: { x: number; y: number; z: number }) => {
      state.linvel = value;
    },
    setAngvel: (value: { x: number; y: number; z: number }) => {
      state.angvel = value;
    },
  } as unknown as RapierRigidBody;

  return { body, state };
}

function simulate(
  seconds: number,
  controls: ReturnType<typeof createControlState>,
  onRoad = true,
) {
  const { body, state } = createFakeBody();
  const step = 1 / 60;
  let last = { speed: 0, forwardSpeed: 0 };
  for (let t = 0; t < seconds; t += step) {
    last = applyArcadeDriving(body, controls, onRoad, step);
  }
  return { ...last, state };
}

describe("arcade vehicle controller", () => {
  it("accelerates to a usable speed within a few seconds", () => {
    const controls = { ...createControlState(), accelerate: 1 };
    const { forwardSpeed } = simulate(3, controls);

    // Roughly 3s of throttle should be well past walking pace.
    expect(forwardSpeed).toBeGreaterThan(14);
  });

  it("never exceeds the on-road speed limit", () => {
    const controls = { ...createControlState(), accelerate: 1 };
    const { forwardSpeed } = simulate(30, controls);
    expect(forwardSpeed).toBeLessThanOrEqual(C.maxSpeedMs + 0.001);
  });

  it("caps speed harder when off the road", () => {
    const controls = { ...createControlState(), accelerate: 1 };
    const offRoad = simulate(30, controls, false);
    expect(offRoad.forwardSpeed).toBeLessThanOrEqual(
      C.offRoadMaxSpeedMs + 0.001,
    );
  });

  it("brakes then reverses when holding brake from a standstill", () => {
    const controls = { ...createControlState(), brake: 1 };
    const { forwardSpeed } = simulate(3, controls);
    expect(forwardSpeed).toBeLessThan(0);
    expect(forwardSpeed).toBeGreaterThanOrEqual(-C.maxReverseMs - 0.001);
  });

  it("builds usable reverse speed within a second", () => {
    const controls = { ...createControlState(), brake: 1 };
    const { forwardSpeed } = simulate(1, controls);
    // Reverse has to beat tyre friction, so it needs real authority.
    expect(forwardSpeed).toBeLessThan(-6);
  });

  it("decays reverse speed once the brake is released", () => {
    const { body } = createFakeBody();
    const step = 1 / 60;
    let atRelease = { speed: 0, forwardSpeed: 0 };
    for (let t = 0; t < 1.5; t += step) {
      atRelease = applyArcadeDriving(
        body,
        { ...createControlState(), brake: 1 },
        true,
        step,
      );
    }

    let coasting = atRelease;
    for (let t = 0; t < 4; t += step) {
      coasting = applyArcadeDriving(body, createControlState(), true, step);
    }

    expect(atRelease.forwardSpeed).toBeLessThan(-6);
    expect(Math.abs(coasting.forwardSpeed)).toBeLessThan(
      Math.abs(atRelease.forwardSpeed) * 0.3,
    );
  });

  it("steers only once the car is moving", () => {
    const stationary = createFakeBody();
    applyArcadeDriving(
      stationary.body,
      { ...createControlState(), steer: 1 },
      true,
      1 / 60,
    );
    expect(Math.abs(stationary.state.angvel.y)).toBeLessThan(0.001);

    const moving = createFakeBody();
    moving.state.linvel = { x: 0, y: 0, z: 20 };
    applyArcadeDriving(
      moving.body,
      { ...createControlState(), steer: 1 },
      true,
      1 / 60,
    );
    expect(Math.abs(moving.state.angvel.y)).toBeGreaterThan(0.1);
  });

  it("uses a wider turning radius at high speed", () => {
    const lowSpeed = createFakeBody();
    lowSpeed.state.linvel = { x: 0, y: 0, z: 8 };
    applyArcadeDriving(
      lowSpeed.body,
      { ...createControlState(), steer: 1 },
      true,
      1 / 60,
    );

    const highSpeed = createFakeBody();
    highSpeed.state.linvel = { x: 0, y: 0, z: 35 };
    applyArcadeDriving(
      highSpeed.body,
      { ...createControlState(), steer: 1 },
      true,
      1 / 60,
    );

    const lowRadius = 8 / Math.abs(lowSpeed.state.angvel.y);
    const highRadius = 35 / Math.abs(highSpeed.state.angvel.y);
    expect(highRadius).toBeGreaterThan(lowRadius * 1.5);
  });

  it("understeers at the limiter instead of rotating a hairpin flat-out", () => {
    const highSpeed = createFakeBody();
    highSpeed.state.linvel = { x: 0, y: 0, z: 38 };
    for (let i = 0; i < 20; i += 1) {
      applyArcadeDriving(
        highSpeed.body,
        { ...createControlState(), accelerate: 1, steer: 1 },
        true,
        1 / 60,
      );
    }
    expect(Math.abs(highSpeed.state.angvel.y)).toBeGreaterThan(0.25);
    expect(Math.abs(highSpeed.state.angvel.y)).toBeLessThan(1.6);
  });

  it("carries most of its speed through a brief turn", () => {
    const straight = createFakeBody();
    straight.state.linvel = { x: 0, y: 0, z: 28 };
    const turning = createFakeBody();
    turning.state.linvel = { x: 0, y: 0, z: 28 };
    let straightLast = { forwardSpeed: 28 };
    let turnLast = { forwardSpeed: 28 };
    for (let i = 0; i < 24; i += 1) {
      straightLast = applyArcadeDriving(
        straight.body,
        { ...createControlState(), accelerate: 1 },
        true,
        1 / 60,
      );
      turnLast = applyArcadeDriving(
        turning.body,
        { ...createControlState(), accelerate: 1, steer: 0.45 },
        true,
        1 / 60,
      );
    }
    expect(turnLast.forwardSpeed).toBeLessThan(straightLast.forwardSpeed);
    expect(turnLast.forwardSpeed).toBeGreaterThan(24);
  });

  it("builds yaw when turning at a grip-legal pace", () => {
    const { body, state } = createFakeBody();
    state.linvel = { x: 0, y: 0, z: 16 };
    for (let i = 0; i < 20; i += 1) {
      applyArcadeDriving(
        body,
        { ...createControlState(), steer: 1 },
        true,
        1 / 60,
      );
    }
    expect(Math.abs(state.angvel.y)).toBeGreaterThan(0.35);
  });

  it("rotates a heavy car slower than a light one", () => {
    const light = createFakeBody();
    light.state.linvel = { x: 0, y: 0, z: 16 };
    const heavy = createFakeBody();
    heavy.state.linvel = { x: 0, y: 0, z: 16 };
    const steer = { ...createControlState(), steer: 1 };
    for (let i = 0; i < 24; i += 1) {
      applyArcadeDriving(light.body, steer, true, 1 / 60, undefined, 1, 180);
      applyArcadeDriving(heavy.body, steer, true, 1 / 60, undefined, 1, 520);
    }
    expect(Math.abs(light.state.angvel.y)).toBeGreaterThan(
      Math.abs(heavy.state.angvel.y) * 1.04,
    );
  });

  it("trail-brakes more rotation than throttle-on at the same speed", () => {
    const throttle = createFakeBody();
    throttle.state.linvel = { x: 0, y: 0, z: 18 };
    const braking = createFakeBody();
    braking.state.linvel = { x: 0, y: 0, z: 18 };
    for (let i = 0; i < 18; i += 1) {
      applyArcadeDriving(
        throttle.body,
        { ...createControlState(), accelerate: 1, steer: 1 },
        true,
        1 / 60,
      );
      applyArcadeDriving(
        braking.body,
        { ...createControlState(), brake: 1, steer: 1 },
        true,
        1 / 60,
      );
    }
    expect(Math.abs(braking.state.angvel.y)).toBeGreaterThan(
      Math.abs(throttle.state.angvel.y),
    );
  });

  it("handbrake dumps speed and adds yaw for a drift", () => {
    const grip = createFakeBody();
    grip.state.linvel = { x: 0, y: 0, z: 28 };
    applyArcadeDriving(
      grip.body,
      { ...createControlState(), steer: 1 },
      true,
      1 / 60,
    );

    const drift = createFakeBody();
    drift.state.linvel = { x: 0, y: 0, z: 28 };
    applyArcadeDriving(
      drift.body,
      { ...createControlState(), steer: 1, handbrake: true },
      true,
      1 / 60,
    );

    expect(Math.abs(drift.state.angvel.y)).toBeGreaterThan(
      Math.abs(grip.state.angvel.y) * 1.12,
    );
    expect(drift.state.linvel.z).toBeLessThan(grip.state.linvel.z);
  });

  it("scrubs off sideways velocity through tyre grip", () => {
    const { body, state } = createFakeBody();
    state.linvel = { x: 12, y: 0, z: 0 };
    for (let i = 0; i < 60; i += 1) {
      applyArcadeDriving(body, createControlState(), true, 1 / 60);
    }
    expect(Math.abs(state.linvel.x)).toBeLessThan(1);
  });
});
