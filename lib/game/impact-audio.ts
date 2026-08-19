/**
 * One-shot collision thud — short noise burst, not a looping engine voice.
 */
export class ImpactAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.7;
  private lastAt = 0;

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    }
  }

  private async ensure() {
    if (this.ctx && this.master) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  async play(strength: number) {
    const now = performance.now();
    if (now - this.lastAt < 90) return;
    this.lastAt = now;
    await this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const amp = 0.08 + Math.min(1, strength) * 0.28;

    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(
      1,
      Math.floor(this.ctx.sampleRate * 0.12),
      this.ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280 + strength * 420;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.13);
  }

  dispose() {
    try {
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.master = null;
  }
}
