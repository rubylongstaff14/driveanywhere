/**
 * Continuous drive ambience — tire scrub from lateral slip + wind rush from speed.
 */
export class DriveAmbienceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private scrubGain: GainNode | null = null;
  private scrubFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private kerbGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private scrubSrc: AudioBufferSourceNode | null = null;
  private windSrc: AudioBufferSourceNode | null = null;
  private kerbSrc: OscillatorNode | null = null;
  private started = false;
  private volume = 0.5;

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  private makeNoiseBuffer(ctx: AudioContext, seconds: number, brown = false) {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < n; i += 1) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        prev = (prev + 0.02 * white) / 1.02;
        data[i] = prev * 3.5;
      } else {
        data[i] = white * 0.55;
      }
    }
    return buffer;
  }

  async ensureStarted() {
    if (this.started) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    // Tire scrub — mid bandpass noise that opens with slip
    this.scrubFilter = ctx.createBiquadFilter();
    this.scrubFilter.type = "bandpass";
    this.scrubFilter.frequency.value = 900;
    this.scrubFilter.Q.value = 0.9;
    this.scrubGain = ctx.createGain();
    this.scrubGain.gain.value = 0;
    this.scrubSrc = ctx.createBufferSource();
    this.scrubSrc.buffer = this.makeNoiseBuffer(ctx, 2.5, false);
    this.scrubSrc.loop = true;
    this.scrubSrc.connect(this.scrubFilter);
    this.scrubFilter.connect(this.scrubGain);
    this.scrubGain.connect(this.master);
    this.scrubSrc.start();

    // Wind — darker noise that rises with road speed
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.5;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = this.makeNoiseBuffer(ctx, 3, true);
    this.windSrc.loop = true;
    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSrc.start();

    this.kerbGain = ctx.createGain();
    this.kerbGain.gain.value = 0;
    this.kerbSrc = ctx.createOscillator();
    this.kerbSrc.type = "square";
    this.kerbSrc.frequency.value = 48;
    this.kerbSrc.connect(this.kerbGain);
    this.kerbGain.connect(this.master);
    this.kerbSrc.start();

    this.started = true;
    if (ctx.state === "suspended") await ctx.resume();
  }

  update(opts: {
    /** Absolute lateral tyre velocity (m/s). */
    lateralSpeed: number;
    /** Absolute forward speed (m/s). */
    forwardSpeed: number;
    handbrake: boolean;
    offRoad: boolean;
    onKerb?: boolean;
    drafting?: boolean;
    paused: boolean;
  }) {
    if (!this.started || !this.ctx || !this.scrubGain || !this.windGain) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const t = this.ctx.currentTime;

    if (opts.paused) {
      this.scrubGain.gain.setTargetAtTime(0, t, 0.08);
      this.windGain.gain.setTargetAtTime(0, t, 0.1);
      this.kerbGain?.gain.setTargetAtTime(0, t, 0.05);
      return;
    }

    const slip = Math.abs(opts.lateralSpeed);
    // Audible from ~1.2 m/s slip; strong by ~8 m/s or handbrake.
    let scrub = Math.max(0, (slip - 1.1) / 7);
    if (opts.handbrake) scrub = Math.min(1, scrub + 0.35 + slip * 0.04);
    if (opts.offRoad) scrub *= 1.25;
    scrub = Math.min(1, scrub);

    const speed = Math.abs(opts.forwardSpeed);
    const wind = Math.min(1, Math.max(0, (speed - 8) / 28));
    const draftRush = opts.drafting ? 0.035 : 0;

    if (this.scrubFilter) {
      this.scrubFilter.frequency.setTargetAtTime(
        650 + scrub * 1400 + (opts.handbrake ? 200 : 0),
        t,
        0.05,
      );
    }
    this.scrubGain.gain.setTargetAtTime(
      scrub * scrub * 0.22 * this.volume,
      t,
      0.04,
    );

    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(280 + wind * 900, t, 0.08);
    }
    this.windGain.gain.setTargetAtTime(
      (wind * 0.1 + draftRush) * this.volume,
      t,
      0.1,
    );
    this.kerbGain?.gain.setTargetAtTime(
      opts.onKerb ? Math.min(0.045, speed * 0.0015) * this.volume : 0,
      t,
      0.025,
    );
  }

  dispose() {
    try {
      this.scrubSrc?.stop();
      this.windSrc?.stop();
      this.kerbSrc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.master = null;
    this.scrubGain = null;
    this.windGain = null;
    this.kerbGain = null;
    this.scrubFilter = null;
    this.windFilter = null;
    this.scrubSrc = null;
    this.windSrc = null;
    this.kerbSrc = null;
    this.started = false;
  }
}
