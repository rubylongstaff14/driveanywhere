/**
 * Short procedural race cues — checkpoint beep + finish sting.
 * Kept separate from EngineAudio so volume can stay independent later.
 */
export class RaceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.55;

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
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

  private tone(
    freq: number,
    duration: number,
    when: number,
    type: OscillatorType = "sine",
    gain = 0.2,
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  async playCheckpoint(index: number) {
    await this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 660 + (index % 5) * 40;
    this.tone(base, 0.09, t, "triangle", 0.18);
    this.tone(base * 1.5, 0.12, t + 0.05, "sine", 0.12);
  }

  async playLights(count: number) {
    await this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (count <= 1) {
      this.tone(880, 0.18, t, "triangle", 0.22);
      this.tone(1320, 0.22, t + 0.04, "sine", 0.16);
      return;
    }
    this.tone(220 + count * 80, 0.08, t, "square", 0.08);
  }

  async playFinish() {
    await this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(523, 0.14, t, "triangle", 0.2);
    this.tone(659, 0.16, t + 0.12, "triangle", 0.18);
    this.tone(784, 0.28, t + 0.26, "sine", 0.22);
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
