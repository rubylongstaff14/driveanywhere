import type { VehicleId } from "@/lib/game/vehicles";

export interface EngineProfile {
  /** Fundamental Hz at idle. */
  idleHz: number;
  /** Fundamental Hz at redline. */
  redlineHz: number;
  harmonics: { type: OscillatorType; mul: number; gain: number; detune?: number }[];
  noiseGain: number;
  noiseFreq: number;
  filterIdle: number;
  filterRedline: number;
  /** How much volume opens with throttle vs rpm. */
  growl: number;
  /** Quieter cruise when rpm is mid and throttle is held. */
  cruiseQuiet: number;
}

const PROFILES: Record<VehicleId, EngineProfile> = {
  sports: {
    idleHz: 55,
    redlineHz: 245,
    harmonics: [
      { type: "sawtooth", mul: 1, gain: 0.14, detune: 0 },
      { type: "triangle", mul: 2.005, gain: 0.07, detune: 6 },
      { type: "sine", mul: 3.01, gain: 0.04, detune: -4 },
      { type: "triangle", mul: 0.5, gain: 0.06 },
    ],
    noiseGain: 0.07,
    noiseFreq: 420,
    filterIdle: 520,
    filterRedline: 2800,
    growl: 0.95,
    cruiseQuiet: 0.55,
  },
  f1: {
    idleHz: 110,
    redlineHz: 480,
    harmonics: [
      { type: "triangle", mul: 1, gain: 0.11 },
      { type: "sawtooth", mul: 2.02, gain: 0.05, detune: 8 },
      { type: "sine", mul: 3.05, gain: 0.035 },
      { type: "triangle", mul: 4.08, gain: 0.025, detune: -6 },
    ],
    noiseGain: 0.045,
    noiseFreq: 1100,
    filterIdle: 1400,
    filterRedline: 5800,
    growl: 0.65,
    cruiseQuiet: 0.45,
  },
  corsa: {
    idleHz: 48,
    redlineHz: 195,
    harmonics: [
      { type: "triangle", mul: 1, gain: 0.13 },
      { type: "sine", mul: 2, gain: 0.06 },
      { type: "triangle", mul: 3.02, gain: 0.035, detune: 5 },
    ],
    noiseGain: 0.055,
    noiseFreq: 300,
    filterIdle: 420,
    filterRedline: 2100,
    growl: 0.8,
    cruiseQuiet: 0.6,
  },
  gwagon: {
    idleHz: 36,
    redlineHz: 135,
    harmonics: [
      { type: "sawtooth", mul: 1, gain: 0.16 },
      { type: "triangle", mul: 0.5, gain: 0.11 },
      { type: "sine", mul: 1.5, gain: 0.06 },
      { type: "triangle", mul: 2.01, gain: 0.04, detune: -8 },
    ],
    noiseGain: 0.09,
    noiseFreq: 190,
    filterIdle: 300,
    filterRedline: 1400,
    growl: 1.15,
    cruiseQuiet: 0.5,
  },
};

/**
 * Procedural engine — pitch follows RPM, character follows vehicle profile.
 * Softer harmonics + load-aware gain so cruise isn't a constant scream.
 */
export class EngineAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: {
    osc: OscillatorNode;
    gain: GainNode;
    mul: number;
    baseGain: number;
  }[] = [];
  private noise: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private started = false;
  private volume = 0.5;
  private profile: EngineProfile = PROFILES.sports;
  private vehicleId: VehicleId = "sports";

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  setVehicle(id: VehicleId) {
    if (this.vehicleId === id) return;
    this.vehicleId = id;
    this.profile = PROFILES[id];
    if (this.started) {
      this.disposeGraph();
      this.started = false;
      void this.ensureStarted();
    }
  }

  private disposeGraph() {
    try {
      for (const { osc } of this.oscillators) osc.stop();
      this.noise?.stop();
    } catch {
      // ignore
    }
    this.oscillators = [];
    this.noise = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.filter = null;
    this.engineGain = null;
  }

  async ensureStarted() {
    if (this.started) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioCtx();
    }
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    this.master = master;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineGain.connect(master);
    this.engineGain = engineGain;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.profile.filterIdle;
    filter.Q.value = 0.7;
    filter.connect(engineGain);
    this.filter = filter;

    this.oscillators = [];
    for (const h of this.profile.harmonics) {
      const osc = ctx.createOscillator();
      osc.type = h.type;
      osc.frequency.value = this.profile.idleHz * h.mul;
      if (h.detune) osc.detune.value = h.detune;
      const gain = ctx.createGain();
      gain.gain.value = h.gain;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.oscillators.push({
        osc,
        gain,
        mul: h.mul,
        baseGain: h.gain,
      });
    }

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Soft noise (less harsh white hash)
    let prev = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      prev = (prev + 0.02 * white) / 1.02;
      data[i] = prev * 2.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = this.profile.noiseFreq;
    noiseFilter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = this.profile.noiseGain * 0.5;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(filter);
    noise.start();
    this.noise = noise;
    this.noiseGain = noiseGain;
    this.noiseFilter = noiseFilter;

    this.started = true;
    if (ctx.state === "suspended") await ctx.resume();
  }

  update(opts: {
    rpmNorm: number;
    throttle: number;
    shifting: boolean;
    paused: boolean;
  }) {
    if (!this.started || !this.ctx || !this.engineGain) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();

    const t = this.ctx.currentTime;
    if (opts.paused) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }

    const rpmNorm = Math.max(0, Math.min(1, opts.rpmNorm));
    const throttle = Math.max(0, Math.min(1, opts.throttle));
    const p = this.profile;
    // Slight ease so pitch rises more in the upper half of the rev range.
    const pitchN = Math.pow(rpmNorm, 0.92);
    const baseHz = p.idleHz + pitchN * (p.redlineHz - p.idleHz);

    for (const { osc, gain, mul, baseGain } of this.oscillators) {
      osc.frequency.setTargetAtTime(baseHz * mul, t, 0.045);
      // Harmonics bloom a bit under load, stay quieter at idle.
      const harm =
        baseGain *
        (0.55 + throttle * 0.55 + rpmNorm * 0.25) *
        (opts.shifting ? 0.55 : 1);
      gain.gain.setTargetAtTime(harm, t, 0.06);
    }
    if (this.filter) {
      this.filter.frequency.setTargetAtTime(
        p.filterIdle +
          rpmNorm * (p.filterRedline - p.filterIdle) * (0.55 + throttle * 0.45) +
          throttle * 120 * p.growl,
        t,
        0.07,
      );
    }
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(
        p.noiseGain *
          (0.25 + rpmNorm * 0.45 + throttle * 0.55) *
          (opts.shifting ? 0.4 : 1),
        t,
        0.06,
      );
    }
    if (this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(
        p.noiseFreq * (0.85 + rpmNorm * 0.5 + throttle * 0.25),
        t,
        0.08,
      );
    }

    // Idle murmur + load shout; cruise (high throttle, mid rpm) stays calmer.
    const idleBed = 0.04 + (1 - Math.min(1, rpmNorm * 3)) * 0.03;
    const load = throttle * (0.18 + rpmNorm * 0.38) * p.growl;
    const rpmBody = rpmNorm * 0.22 * p.growl;
    const cruise =
      throttle > 0.55 && rpmNorm > 0.35 && rpmNorm < 0.72
        ? p.cruiseQuiet
        : 1;
    let level = (idleBed + load + rpmBody) * cruise;
    if (opts.shifting) level *= 0.4;
    // Soft limiter bark near redline under throttle — short of a constant scream.
    if (rpmNorm > 0.88 && throttle > 0.6) {
      level *= 1.08;
    }
    this.engineGain.gain.setTargetAtTime(
      Math.min(0.72, level) * this.volume,
      t,
      0.06,
    );
  }

  dispose() {
    this.disposeGraph();
    try {
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.master = null;
    this.started = false;
  }
}
