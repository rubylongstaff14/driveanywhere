export const GAME_CONSTANTS = {
  // ---- Speed limits --------------------------------------------------------
  /** Peak on-road speed ~155 km/h — still readable, no longer feels sluggish. */
  maxSpeedMs: 43,
  offRoadMaxSpeedMs: 13,
  maxReverseMs: 11,

  // ---- Longitudinal forces -------------------------------------------------
  /** Peak acceleration in m/s² — reaches pace quickly without feeling rocket-like. */
  accelerationMs2: 15.5,
  coastDrag: 0.65,
  offRoadDrag: 3.4,
  rollingResistanceMs2: 0.22,
  aerodynamicDrag: 0.0027,
  brakeMs2: 36,
  /**
   * Reverse must overcome tyre friction and rolling resistance from a dead
   * stop, so it needs real authority rather than a token value.
   */
  reverseMs2: 16,

  // ---- Lateral grip --------------------------------------------------------
  /**
   * Time constant (seconds) for lateral velocity exponential decay.
   * Smaller = grippier.
   */
  gripTau: 0.085,
  gripTauAtTopSpeed: 0.11,
  offRoadGripTau: 0.035,
  /** Handbrake lengthens tau so the tail can rotate for hairpins. */
  handbrakeGripTau: 0.28,
  /** Extra forward dump while the rear is locked. */
  handbrakeDragMs2: 9,
  /** Yaw multiplier while Space / pad B is held. */
  handbrakeYawMul: 1.4,
  /** Extra lateral scrub while steering — higher = more planted front end. */
  frontSlipScrub: 0.45,

  // ---- Steering / cornering ------------------------------------------------
  /** How quickly yaw chases the target each second. Lower = more inertia. */
  steerResponse: 9.5,
  wheelbaseMetres: 2.62,
  steeringAngleLowSpeedDegrees: 32,
  /** Enough lock to bite at speed without kart-like snap. */
  steeringAngleHighSpeedDegrees: 10,
  maxYawRate: 1.95,
  /** Street-car peak ~1.25 g — you have to lift for real bends. */
  maxLateralAccelerationMs2: 12.2,
  /**
   * Mild aero. Not enough to take hairpins flat-out.
   */
  aeroDownforceGrip: 0.0012,
  /** Multiplier on the yaw ceiling while the front axle is loaded. */
  frontEndGripBias: 1.04,
  /** Small residual yaw at speed — not enough to rotate a 90° at the limiter. */
  minYawAtSpeed: 0.34,
  /** Linear speed bleed once the friction circle is loaded. */
  cornerDragMs2: 4.2,
  /** Extra dump when you overcook a bend. */
  cornerDumpMs2: 11,
  /**
   * How strongly ground velocity rotates with yaw.
   * Keep below 1.0 so path-follow assists turn-in without over-rotating.
   */
  pathFollowIdle: 0.18,
  pathFollowSteering: 0.82,
  /** Brake loads the nose (more rotation); throttle unloads it (understeer). */
  weightTransfer: 0.28,
  /** Reference mass for inertia — G-Wagon rotates slower, F1 faster. */
  referenceMassKg: 320,

  // ---- Camera --------------------------------------------------------------
  cameraDistance: 10.5,
  cameraHeight: 3.6,
  cameraLookAhead: 8,
  /** Keep FOV stable — big rush zoom makes the world look blurred. */
  fovRest: 58,
  fovTop: 62,

  // ---- Spawning ------------------------------------------------------------
  spawnHeight: 0.12,
  roadEdgeTolerance: 1.5,
} as const;
