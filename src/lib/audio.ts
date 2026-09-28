// Tactical Web Audio Synthesizer for Project Blackwatch
export type SoundProfile = 'relay' | 'cyber' | 'stealth';

class TacticalAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.8;
  private profile: SoundProfile = 'cyber';
  private cueSettings = {
    radar: true,
    clues: true,
    warning: true,
    mission: true
  };

  constructor() {
    // Lazy AudioContext initialization upon first user gesture
    try {
      const savedMuted = localStorage.getItem('blackwatch_audio_muted');
      if (savedMuted !== null) this.isMuted = savedMuted === 'true';
      const savedMaster = localStorage.getItem('blackwatch_audio_master');
      if (savedMaster !== null) this.masterVolume = Math.max(0, Math.min(1, Number(savedMaster) / 100));
      const savedSfx = localStorage.getItem('blackwatch_audio_sfx');
      if (savedSfx !== null) this.sfxVolume = Math.max(0, Math.min(1, Number(savedSfx) / 100));
      const savedProfile = localStorage.getItem('blackwatch_audio_profile') as SoundProfile;
      if (savedProfile) this.profile = savedProfile;
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('blackwatch_audio_muted', muted ? 'true' : 'false');
    } catch {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(pct: number) {
    this.masterVolume = Math.max(0, Math.min(1, pct / 100));
    try {
      localStorage.setItem('blackwatch_audio_master', pct.toString());
    } catch {}
  }

  public setSfxVolume(pct: number) {
    this.sfxVolume = Math.max(0, Math.min(1, pct / 100));
    try {
      localStorage.setItem('blackwatch_audio_sfx', pct.toString());
    } catch {}
  }

  public setProfile(profile: SoundProfile) {
    this.profile = profile;
    try {
      localStorage.setItem('blackwatch_audio_profile', profile);
    } catch {}
  }

  public getProfile(): SoundProfile {
    return this.profile;
  }

  public setCueEnabled(cue: 'radar' | 'clues' | 'warning' | 'mission', enabled: boolean) {
    this.cueSettings[cue] = enabled;
  }

  private getEffectiveGain(baseGain: number): number {
    return baseGain * this.masterVolume * this.sfxVolume;
  }

  // Tactical subtle click for button presses
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const effGain = this.getEffectiveGain(0.08);

      if (this.profile === 'relay') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.025);
      } else if (this.profile === 'stealth') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);
      }

      gain.gain.setValueAtTime(effGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {}
  }

  // Teletype keystroke for terminal CLI & text streams
  public playTeletype() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const effGain = this.getEffectiveGain(0.03);

      if (this.profile === 'relay') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900 + Math.random() * 300, ctx.currentTime);
      } else if (this.profile === 'stealth') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500 + Math.random() * 150, ctx.currentTime);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime);
      }

      gain.gain.setValueAtTime(effGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {}
  }

  // Radio dispatch chirp / squelch
  public playDispatchRadio() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const effGain = this.getEffectiveGain(0.07);

      osc.type = this.profile === 'stealth' ? 'triangle' : 'sawtooth';
      const baseFreq = this.profile === 'stealth' ? 1400 : 2400;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.setValueAtTime(baseFreq * 0.75, now + 0.05);
      osc.frequency.setValueAtTime(baseFreq * 0.9, now + 0.09);
      gain.gain.setValueAtTime(effGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // Radar ping / Scan sector
  public playRadarPing() {
    if (!this.cueSettings.radar) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const effGain = this.getEffectiveGain(0.1);

      osc.type = this.profile === 'relay' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(this.profile === 'stealth' ? 880 : 1500, now);
      osc.frequency.exponentialRampToValueAtTime(this.profile === 'stealth' ? 220 : 440, now + 0.35);
      gain.gain.setValueAtTime(effGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  // Clue unlocked / Evidence discovered
  public playClueUnlocked() {
    if (!this.cueSettings.clues) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.08);
      const chord = this.profile === 'relay' ? [440, 554, 659] : [587.33, 739.99, 880];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = this.profile === 'relay' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(effGain, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {}
  }

  // Deduction solved & Warrant Granted chord
  public playDeductionSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.12);
      [330, 440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(effGain, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.6);
      });
    } catch {}
  }

  // Alert / Threat elevated warning
  public playAlertWarning() {
    if (!this.cueSettings.warning) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const effGain = this.getEffectiveGain(0.08);

      osc.type = this.profile === 'stealth' ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(480, now + 0.1);
      gain.gain.setValueAtTime(effGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // Forensic Evidence Analysis Completed Trigger
  public playEvidenceAnalyzed() {
    if (!this.cueSettings.clues) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.09);
      const freqs = [784, 987.77, 1318.51, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(effGain, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } catch {}
  }

  // Advocate Formal Statutory Objection (Gavel/Table Tap)
  public playObjection() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.14);

      // Low table thump / gavel hit
      const thump = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(140, now);
      thump.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      thumpGain.gain.setValueAtTime(effGain * 1.2, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      thump.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thump.start(now);
      thump.stop(now + 0.13);

      // Sharp wood strike resonance
      const strike = ctx.createOscillator();
      const strikeGain = ctx.createGain();
      strike.type = 'sawtooth';
      strike.frequency.setValueAtTime(650, now + 0.01);
      strike.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      strikeGain.gain.setValueAtTime(effGain, now + 0.01);
      strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      strike.connect(strikeGain);
      strikeGain.connect(ctx.destination);
      strike.start(now + 0.01);
      strike.stop(now + 0.09);
    } catch {}
  }

  // Advocate Private Advisory / Soft Pen-Tap Chime
  public playAdvisory() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.08);

      [880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(effGain, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.16);
      });
    } catch {}
  }

  // Case Diary Official Legal Stamp / Stenographer Chime
  public playStenographerChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.07);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.04);
      gain.gain.setValueAtTime(effGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  // Tactical Mission Completed / Field Recon Milestone Alert
  public playMissionCompleted() {
    if (!this.cueSettings.mission) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const effGain = this.getEffectiveGain(0.12);
      const chord = [440, 554.37, 659.25, 880];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(effGain, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.7);
      });
    } catch {}
  }
}

export const sound = new TacticalAudioEngine();
