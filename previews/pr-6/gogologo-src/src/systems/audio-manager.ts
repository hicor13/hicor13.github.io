// Procedural 8-bit/chiptune-style audio via the raw Web Audio API -- no
// external asset files exist (or can be sourced) for this project, so every
// sound here is synthesized on the fly with oscillators + gain envelopes.
//
// AudioContext construction/resume is wrapped in try/catch the same
// defensive way save-manager.ts and settings-manager.ts guard localStorage --
// Safari/iOS refuses to start a context outside a user gesture, some
// browsers block it entirely, and none of that should ever throw into
// gameplay code.
import Phaser from 'phaser';

const AUDIO_ENABLED_KEY = 'gogologo-audio-enabled';

export function getAudioEnabled(): boolean {
  try {
    const stored = localStorage.getItem(AUDIO_ENABLED_KEY);
    // Default to ON when nothing has been persisted yet.
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function setAudioEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore -- persistence is a nice-to-have, not core functionality.
  }
  audioManager.setMuted(!enabled);
}

type OscType = OscillatorType;

interface Note {
  freq: number;
  startOffset: number; // seconds from the loop's start
  duration: number; // seconds
}

// A short, repeating 4-note bassline/arpeggio loop -- simple root/fifth/
// octave movement in a minor key, in the spirit of this game's Peruvian/
// 16-bit theme without needing real instrument samples.
const LOOP_BEAT = 0.28; // seconds per step
const LOOP_NOTES: Note[] = [
  { freq: 220.0, startOffset: 0 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // A3
  { freq: 261.63, startOffset: 1 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // C4
  { freq: 329.63, startOffset: 2 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // E4
  { freq: 261.63, startOffset: 3 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // C4
  { freq: 220.0, startOffset: 4 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // A3
  { freq: 174.61, startOffset: 5 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // F3
  { freq: 196.0, startOffset: 6 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // G3
  { freq: 220.0, startOffset: 7 * LOOP_BEAT, duration: LOOP_BEAT * 0.8 }, // A3
];
const LOOP_LENGTH = LOOP_NOTES.length * LOOP_BEAT;
const LOOP_GAIN = 0.05; // low volume -- background texture, not the focus

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = !getAudioEnabled();
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicRunning = false;
  private resumeListenersAttached = false;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = LOOP_GAIN;
      this.musicGain.connect(this.masterGain);
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Safari/iOS (and Chrome's autoplay policy) require the context to be
  // created or resumed from within a real user gesture. Call this once
  // from the game's first pointerdown/keydown.
  attachResumeOnFirstGesture(game: Phaser.Game): void {
    if (this.resumeListenersAttached) return;
    this.resumeListenersAttached = true;
    const resume = (): void => {
      try {
        const ctx = this.ensureContext();
        if (ctx && ctx.state === 'suspended') {
          void ctx.resume();
        }
      } catch {
        // Ignore -- audio is a nice-to-have, never allowed to block input.
      }
    };
    try {
      game.events.once('pointerdown', resume);
    } catch {
      // Ignore.
    }
    try {
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    } catch {
      // Ignore -- some environments (SSR-ish test harnesses) lack window.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private playTone(freq: number, duration: number, type: OscType, startAt = 0, peakGain = 0.15): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + startAt;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.02, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // Ignore -- never let a sound effect throw into gameplay code.
    }
  }

  private playSweep(freqFrom: number, freqTo: number, duration: number, type: OscType, peakGain = 0.15): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      const t0 = ctx.currentTime;
      osc.frequency.setValueAtTime(freqFrom, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), t0 + duration);
      gain.gain.setValueAtTime(peakGain, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // Ignore.
    }
  }

  // Short high blip -- player fire.
  playFire(): void {
    this.playSweep(880, 1400, 0.08, 'square', 0.08);
  }

  // Short descending tone -- enemy hit / explosion.
  playHit(): void {
    this.playSweep(500, 90, 0.15, 'sawtooth', 0.12);
  }

  // Short descending arpeggio -- game over.
  playGameOver(): void {
    const notes = [392.0, 329.63, 261.63, 196.0]; // G4 F#... simple descent
    notes.forEach((freq, i) => this.playTone(freq, 0.18, 'triangle', i * 0.15, 0.12));
  }

  private scheduleMusicLoop(): void {
    if (!this.musicRunning) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.musicGain) return;
      LOOP_NOTES.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = note.freq;
        const t0 = ctx.currentTime + note.startOffset;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(1, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.duration);
        osc.connect(gain);
        gain.connect(this.musicGain as GainNode);
        osc.start(t0);
        osc.stop(t0 + note.duration + 0.02);
      });
    } catch {
      // Ignore -- background music is decorative, never gameplay-critical.
    }
    this.musicTimer = setTimeout(() => this.scheduleMusicLoop(), LOOP_LENGTH * 1000);
  }

  startMusic(): void {
    if (this.musicRunning) return;
    this.musicRunning = true;
    this.scheduleMusicLoop();
  }

  stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Single shared instance -- this game has no need for a full audio-scene
// graph, just one music loop and a handful of one-shot SFX.
export const audioManager = new AudioManager();
