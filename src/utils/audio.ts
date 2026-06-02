/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Read initial mute state from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('migoyugo_muted');
      this.muted = stored === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    // Resume context if suspended (common browser security behavior)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('migoyugo_muted', this.muted ? 'true' : 'false');
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // 1. Traditional Wood Mahjong Clack
  playClack() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Main wood impact frequency
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // High frequency clack noise (plastic/bone surface)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.03);

    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    // Connect them
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.1);

    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  // 2. Pure Chime Ring for Yugo Creation
  playYugoChime() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Two frequencies forming a pleasant major triad chord segment (e.g. E5 and G#5)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now); // G#5

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.9);

    osc2.start(now);
    osc2.stop(now + 0.9);
  }

  // 3. Deep Resonating Chinese Gong
  playGong() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    gainNode.connect(this.ctx.destination);

    // Fundamental low tone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(110, now); // A2
    osc1.frequency.linearRampToValueAtTime(105, now + 1.2);
    osc1.connect(gainNode);

    // Mid gong resonance
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(165, now); // E3 overtone
    osc2.frequency.linearRampToValueAtTime(160, now + 1.5);
    
    // Lowpass filter to keep it rich and deep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.Q.setValueAtTime(4, now);

    osc2.connect(filter);
    filter.connect(gainNode);

    osc1.start(now);
    osc1.stop(now + 2.1);

    osc2.start(now);
    osc2.stop(now + 2.1);
  }

  // 4. Traditional Pentatonic Victory Fanfare (C-D-E-G-A)
  playVictory() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
    ];

    const tempo = 0.12; // time between notes

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = now + idx * tempo;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Volume envelope for each note
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });

    // Deep supporting gong hit at the peak
    setTimeout(() => {
      this.playGong();
    }, (notes.length - 1) * tempo * 1000);
  }

  // 5. Standard UI Click
  playClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const sounds = new SoundEffectsEngine();
export default sounds;
