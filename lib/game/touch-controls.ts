export interface TouchDriveState {
  accelerate: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  resetPressed: boolean;
  cameraPressed: boolean;
  pausePressed: boolean;
}

const touchDrive: TouchDriveState = {
  accelerate: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  resetPressed: false,
  cameraPressed: false,
  pausePressed: false,
};

export function setTouchDrive(
  control: "accelerate" | "brake" | "steerLeft" | "steerRight" | "handbrake",
  active: boolean,
): void {
  if (control === "accelerate") touchDrive.accelerate = active ? 1 : 0;
  if (control === "brake") touchDrive.brake = active ? 1 : 0;
  if (control === "handbrake") touchDrive.handbrake = active;
  if (control === "steerLeft") {
    if (active) touchDrive.steer = -1;
    else if (touchDrive.steer < 0) touchDrive.steer = 0;
  }
  if (control === "steerRight") {
    if (active) touchDrive.steer = 1;
    else if (touchDrive.steer > 0) touchDrive.steer = 0;
  }
}

export function pulseTouchDrive(control: "reset" | "camera" | "pause"): void {
  if (control === "reset") touchDrive.resetPressed = true;
  if (control === "camera") touchDrive.cameraPressed = true;
  if (control === "pause") touchDrive.pausePressed = true;
}

export function sampleTouchDrive(): TouchDriveState {
  const snapshot = { ...touchDrive };
  touchDrive.resetPressed = false;
  touchDrive.cameraPressed = false;
  touchDrive.pausePressed = false;
  return snapshot;
}

export function clearTouchDrive(): void {
  touchDrive.accelerate = 0;
  touchDrive.brake = 0;
  touchDrive.steer = 0;
  touchDrive.handbrake = false;
}
