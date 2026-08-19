export type ControlAction =
  | "accelerate"
  | "brake"
  | "steerLeft"
  | "steerRight"
  | "handbrake"
  | "reset"
  | "pause"
  | "camera";

export interface ControlState {
  accelerate: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  resetPressed: boolean;
  pausePressed: boolean;
  cameraPressed: boolean;
}

const KEY_BINDINGS: Record<string, ControlAction> = {
  KeyW: "accelerate",
  ArrowUp: "accelerate",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "steerLeft",
  ArrowLeft: "steerLeft",
  KeyD: "steerRight",
  ArrowRight: "steerRight",
  Space: "handbrake",
  KeyR: "reset",
  Escape: "pause",
  KeyC: "camera",
};

export function createControlState(): ControlState {
  return {
    accelerate: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    resetPressed: false,
    pausePressed: false,
    cameraPressed: false,
  };
}

/**
 * Keyboard + gamepad sampler kept outside React.
 * Call sample() once per physics/frame tick.
 */
export class InputSampler {
  private keys = new Set<string>();
  private smoothedSteer = 0;
  private edge = {
    reset: false,
    pause: false,
    camera: false,
  };

  attach(): () => void {
    const onDown = (event: KeyboardEvent) => {
      if (event.code in KEY_BINDINGS) {
        event.preventDefault();
      }
      this.keys.add(event.code);
      const action = KEY_BINDINGS[event.code];
      if (action === "reset") this.edge.reset = true;
      if (action === "pause") this.edge.pause = true;
      if (action === "camera") this.edge.camera = true;
    };
    const onUp = (event: KeyboardEvent) => {
      this.keys.delete(event.code);
    };
    const clearInput = () => {
      this.keys.clear();
      this.smoothedSteer = 0;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", clearInput);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", clearInput);
    };
  }

  sample(): ControlState {
    let accelerate = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;

    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) accelerate = 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) brake = 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer += 1;
    if (this.keys.has("Space")) handbrake = true;

    const pad = typeof navigator !== "undefined" ? navigator.getGamepads?.()[0] : null;
    if (pad) {
      const axisX = Math.abs(pad.axes[0] ?? 0) > 0.15 ? pad.axes[0] : 0;
      steer += axisX;
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      accelerate = Math.max(accelerate, rt);
      brake = Math.max(brake, lt);
      if (pad.buttons[1]?.pressed) handbrake = true;
      // Do not bind face button 0 (A/X) to reset — ghost pads and bumper
      // chatter were teleporting the car back to the last gate.
      if (pad.buttons[9]?.pressed) this.edge.pause = true;
      if (pad.buttons[8]?.pressed) this.edge.camera = true;
    }

    const targetSteer = Math.min(1, Math.max(-1, steer));
    const steerStep = 0.22;
    this.smoothedSteer += Math.min(
      steerStep,
      Math.max(-steerStep, targetSteer - this.smoothedSteer),
    );

    const state: ControlState = {
      accelerate: Math.min(1, Math.max(0, accelerate)),
      brake: Math.min(1, Math.max(0, brake)),
      steer: this.smoothedSteer,
      handbrake,
      resetPressed: this.edge.reset,
      pausePressed: this.edge.pause,
      cameraPressed: this.edge.camera,
    };

    this.edge.reset = false;
    this.edge.pause = false;
    this.edge.camera = false;

    return state;
  }
}
