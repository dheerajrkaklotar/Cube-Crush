class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicVolume: number = 0.5; // 0.0 to 1.0
  private musicSpeed: number = 1.0;  // 0.6 (Slow) to 1.5 (Fast)
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmPlaying: boolean = false;

  constructor() {
    try {
      const savedMute = localStorage.getItem('block_blast_muted');
      if (savedMute === 'true') this.muted = true;

      const savedVol = localStorage.getItem('block_blast_bgm_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!Number.isNaN(parsed)) {
          this.musicVolume = Math.max(0, Math.min(1, parsed));
        }
      }

      const savedSpeed = localStorage.getItem('block_blast_bgm_speed');
      if (savedSpeed !== null) {
        const parsed = parseFloat(savedSpeed);
        if (!Number.isNaN(parsed)) {
          this.musicSpeed = Math.max(0.5, Math.min(1.75, parsed));
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.muted ? 0 : this.musicVolume * 0.28;
      this.bgmGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('block_blast_muted', String(this.muted));
    } catch {
      // ignore
    }
    this.syncBgmGain();
    if (!this.muted) {
      this.playPickup();
      if (this.bgmPlaying) {
        this.scheduleNextBgmBeat();
      }
    }
    return this.muted;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicVolume > 0 && this.muted) {
      this.muted = false;
      try {
        localStorage.setItem('block_blast_muted', 'false');
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem('block_blast_bgm_volume', String(this.musicVolume));
    } catch {
      // ignore
    }
    this.syncBgmGain();
  }

  public getMusicSpeed(): number {
    return this.musicSpeed;
  }

  public setMusicSpeed(speed: number): void {
    this.musicSpeed = Math.max(0.5, Math.min(1.75, speed));
    try {
      localStorage.setItem('block_blast_bgm_speed', String(this.musicSpeed));
    } catch {
      // ignore
    }
  }

  private syncBgmGain(): void {
    if (!this.ctx || !this.bgmGain) return;
    const target = this.muted ? 0 : this.musicVolume * 0.28;
    this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  /**
   * Starts copyright-free procedural slow ambient puzzle background music
   */
  public startBackgroundMusic(): void {
    if (this.bgmPlaying) {
      this. getContext();
      this.syncBgmGain();
      return;
    }
    this.bgmPlaying = true;
    this.getContext();
    this.syncBgmGain();
    this.scheduleNextBgmBeat();
  }

  public stopBackgroundMusic(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleNextBgmBeat(): void {
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (!this.bgmPlaying) return;

    this.playBgmNoteStep(this.bgmStep);
    this.bgmStep = (this.bgmStep + 1) % 32;

    // Slow, relaxing base tempo (~520ms per eighth-note step at 1.0x speed)
    const stepMs = Math.round(520 / this.musicSpeed);
    this.bgmTimer = window.setTimeout(() => {
      this.scheduleNextBgmBeat();
    }, stepMs);
  }

  private playBgmNoteStep(step: number): void {
    if (this.muted || this.musicVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const now = ctx.currentTime;

    // 4-bar relaxing chord progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    const chords = [
      { root: 174.61, pad: [349.23, 440.0, 523.25, 659.25] }, // Fmaj7
      { root: 164.81, pad: [329.63, 392.0, 493.88, 587.33] }, // Em7
      { root: 146.83, pad: [293.66, 349.23, 440.0, 523.25] }, // Dm7
      { root: 130.81, pad: [261.63, 329.63, 392.0, 493.88] }, // Cmaj7
    ];

    const barIdx = Math.floor(step / 8) % 4;
    const stepInBar = step % 8;
    const currentChord = chords[barIdx];

    // 1. Warm sustained sub-bass & soft pad on beat 0 of each bar
    if (stepInBar === 0) {
      const bassDuration = (4.0 / this.musicSpeed);
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(currentChord.root, now);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.38, now + 0.18);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + bassDuration);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(now);
      bassOsc.stop(now + bassDuration + 0.05);

      // Gentle airy pad triad
      currentChord.pad.slice(0, 3).forEach((freq) => {
        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(freq * 0.5, now);

        padGain.gain.setValueAtTime(0.001, now);
        padGain.gain.linearRampToValueAtTime(0.11, now + 0.45);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + bassDuration);

        padOsc.connect(padGain);
        padGain.connect(this.bgmGain!);
        padOsc.start(now);
        padOsc.stop(now + bassDuration + 0.05);
      });
    }

    // 2. Dreamy kalimba / electric piano melody notes
    const melodyPattern: (number | null)[] = [0, 1, 2, 3, 2, 1, 3, null];
    const noteIdx = melodyPattern[stepInBar];
    if (noteIdx !== null) {
      const freq = currentChord.pad[noteIdx];
      const noteDur = 1.25 / this.musicSpeed;

      const melOsc = ctx.createOscillator();
      const melGain = ctx.createGain();
      melOsc.type = 'triangle';
      melOsc.frequency.setValueAtTime(freq, now);

      melGain.gain.setValueAtTime(0.001, now);
      melGain.gain.linearRampToValueAtTime(0.24, now + 0.025);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + noteDur);

      melOsc.connect(melGain);
      melGain.connect(this.bgmGain);
      melOsc.start(now);
      melOsc.stop(now + noteDur + 0.04);
    }
  }

  public playPickup(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.065);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playHoverSnap(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.025);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.032);
  }

  public playPlace(cellCount: number = 4): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Warm tactile thud
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    const baseFreq = Math.max(120, 195 - cellCount * 6);
    sub.frequency.setValueAtTime(baseFreq, now);
    sub.frequency.exponentialRampToValueAtTime(68, now + 0.095);

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.115);

    // Crisp wooden/acrylic snap overtone
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(520, now);
    snap.frequency.exponentialRampToValueAtTime(840, now + 0.045);

    snapGain.gain.setValueAtTime(0.14, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.06);
  }

  public playInvalidDrop(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(135, now + 0.11);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.125);
  }

  public playLineClear(lines: number, combo: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const comboSemitones = Math.min(combo - 1, 10);
    const pitchMultiplier = Math.pow(2, comboSemitones / 12);

    const baseNotes = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51, 1567.98];
    const noteCount = Math.min(baseNotes.length, 3 + lines);

    for (let i = 0; i < noteCount; i++) {
      const start = now + i * 0.042;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const freq = baseNotes[i] * pitchMultiplier;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, start + 0.24);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    }

    if (lines >= 2 || combo >= 2) {
      const punch = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punch.type = 'sine';
      punch.frequency.setValueAtTime(160, now);
      punch.frequency.exponentialRampToValueAtTime(42, now + 0.22);

      punchGain.gain.setValueAtTime(0.32, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      punch.connect(punchGain);
      punchGain.connect(ctx.destination);
      punch.start(now);
      punch.stop(now + 0.25);
    }
  }

  public playCollectible(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [987.77, 1318.51, 1975.53];
    freqs.forEach((f, idx) => {
      const start = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }

  public playPowerup(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.14);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playVictory(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      const start = now + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  public playGameOver(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playIntroFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(110, now);
    sweep.frequency.exponentialRampToValueAtTime(660, now + 0.55);
    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.14, now + 0.25);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(now);
    sweep.stop(now + 0.62);

    const impactTime = now + 0.58;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, impactTime);
    sub.frequency.exponentialRampToValueAtTime(42, impactTime + 0.38);
    subGain.gain.setValueAtTime(0.34, impactTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.4);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(impactTime);
    sub.stop(impactTime + 0.42);

    const melody = [
      { freq: 523.25, delay: 0.62, dur: 0.22 },
      { freq: 659.25, delay: 0.74, dur: 0.22 },
      { freq: 783.99, delay: 0.86, dur: 0.22 },
      { freq: 1046.5, delay: 0.98, dur: 0.45 },
      { freq: 1318.51, delay: 1.18, dur: 0.55 },
      { freq: 1567.98, delay: 1.36, dur: 0.75 },
    ];

    melody.forEach(({ freq, delay, dur }) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t + dur);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }
}

export const sound = new SoundEngine();
