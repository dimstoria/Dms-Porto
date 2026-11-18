import type {AgentId} from '../data/theAgents';

export type WhooshDirection = 'in' | 'out' | 'sweep';
export type ClickStrength = 'soft' | 'crisp';

const HOVER_COOLDOWN_MS = 65;
const WHOOSH_COOLDOWN_MS = 55;
const NOISE_DURATION_SEC = 0.45;

/**
 * Controlled Web Audio feedback manager for 'The Agent' studio.
 * Routes all clicks, filtered noise whooshes, and subtle agent cues through a
 * single master GainNode so toggling mute silences in-flight sounds cleanly.
 */
export class AgentAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private unlocked = false;
  private lastHoverMs = 0;
  private lastWhooshMs = 0;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(nextMuted ? 0 : 1, now + 0.015);
  }

  /**
   * Unlocks the underlying AudioContext on an explicit user gesture
   * (pointer click / key press) so later hover feedback avoids autoplay blocks.
   */
  unlock(): void {
    this.unlocked = true;
    this.ensureContext(true);
  }

  private ensureContext(allowCreate: boolean): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;

    if (!this.ctx) {
      const hasActivation =
        allowCreate ||
        this.unlocked ||
        Boolean(
          (navigator as Navigator & {userActivation?: {hasBeenActive?: boolean}})
            .userActivation?.hasBeenActive,
        );
      if (!hasActivation) return null;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext?: typeof AudioContext})
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : 1,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended' && (allowCreate || this.unlocked)) {
      void this.ctx.resume().catch(() => undefined);
    }

    return this.ctx.state === 'running' || allowCreate ? this.ctx : null;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const frameCount = Math.floor(ctx.sampleRate * NOISE_DURATION_SEC);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let prev = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      prev = prev * 0.45 + white * 0.55;
      data[i] = prev;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startOffsetSec: number,
    durationSec: number,
    type: OscillatorType,
    peakGain: number,
  ): void {
    const master = this.masterGain;
    if (!master) return;

    const startTime = ctx.currentTime + startOffsetSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 4, 3800), startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.03);
  }

  /** Subtle tactile micro-click using a short pitch-dropped sine pop. */
  playClick(strength: ClickStrength = 'soft', allowCreate = true): void {
    if (this.muted) return;
    const ctx = this.ensureContext(allowCreate);
    const master = this.masterGain;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const startHz = strength === 'crisp' ? 1280 : 920;
    const endHz = strength === 'crisp' ? 380 : 310;
    const peakGain = strength === 'crisp' ? 0.045 : 0.024;
    const duration = strength === 'crisp' ? 0.028 : 0.02;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1050, now);
    filter.Q.setValueAtTime(1.2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /** Airy bandpass-filtered noise whoosh for hover lifts, dismissals, and waves. */
  playWhoosh(
    direction: WhooshDirection = 'in',
    peakGain = 0.026,
    allowCreate = true,
  ): void {
    if (this.muted) return;

    const nowMs = performance.now();
    if (nowMs - this.lastWhooshMs < WHOOSH_COOLDOWN_MS) return;

    const ctx = this.ensureContext(allowCreate);
    const master = this.masterGain;
    if (!ctx || !master) return;

    this.lastWhooshMs = nowMs;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(direction === 'sweep' ? 1.35 : 1.75, now);

    const gain = ctx.createGain();
    const duration =
      direction === 'sweep' ? 0.34 : direction === 'in' ? 0.13 : 0.12;

    if (direction === 'in') {
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(1550, now + duration);
    } else if (direction === 'out') {
      filter.frequency.setValueAtTime(1250, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + duration);
    } else {
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(1950, now + duration * 0.52);
      filter.frequency.exponentialRampToValueAtTime(420, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + duration * 0.32);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    src.start(now);
    src.stop(now + duration + 0.02);
  }

  /** Gentle hover micro-tick + airy lift, rate-limited against rapid cursor sweeps. */
  playHoverCue(): void {
    if (this.muted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastHoverMs < HOVER_COOLDOWN_MS) return;

    const ctx = this.ensureContext(false);
    if (!ctx) return;

    this.lastHoverMs = nowMs;
    this.playClick('soft', false);
    this.playWhoosh('in', 0.014, false);
    this.playTone(ctx, 560, 0, 0.055, 'sine', 0.012);
  }

  /** Crisp click + whoosh + agent signature chime when selecting an agent. */
  playAgentSelectCue(agentId: AgentId): void {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    this.playClick('crisp', true);
    this.playWhoosh('in', 0.024, true);

    switch (agentId) {
      case 'impeccable':
        this.playTone(ctx, 329.63, 0, 0.22, 'sine', 0.042);
        this.playTone(ctx, 415.3, 0.06, 0.26, 'sine', 0.042);
        this.playTone(ctx, 493.88, 0.12, 0.36, 'triangle', 0.036);
        break;
      case 'frontend':
        this.playTone(ctx, 293.66, 0, 0.18, 'triangle', 0.042);
        this.playTone(ctx, 440.0, 0.06, 0.22, 'sine', 0.04);
        this.playTone(ctx, 659.25, 0.12, 0.32, 'sine', 0.036);
        break;
      case 'tastes':
        this.playTone(ctx, 392.0, 0, 0.22, 'sine', 0.044);
        this.playTone(ctx, 493.88, 0.07, 0.26, 'sine', 0.04);
        this.playTone(ctx, 587.33, 0.14, 0.34, 'triangle', 0.036);
        break;
      case 'uiux':
        this.playTone(ctx, 440.0, 0, 0.18, 'sine', 0.04);
        this.playTone(ctx, 659.25, 0.08, 0.3, 'sine', 0.044);
        break;
      case 'apple':
        this.playTone(ctx, 523.25, 0, 0.34, 'sine', 0.045);
        this.playTone(ctx, 783.99, 0.05, 0.42, 'sine', 0.036);
        break;
      case 'antislop':
        this.playTone(ctx, 82.41, 0, 0.4, 'triangle', 0.08);
        this.playTone(ctx, 123.47, 0.04, 0.3, 'sawtooth', 0.025);
        this.playTone(ctx, 246.94, 0.07, 0.28, 'sine', 0.038);
        break;
      case 'design-dna':
        this.playTone(ctx, 349.23, 0, 0.2, 'sine', 0.04);
        this.playTone(ctx, 523.25, 0.06, 0.24, 'triangle', 0.038);
        this.playTone(ctx, 698.46, 0.12, 0.3, 'sine', 0.034);
        break;
      case 'motion':
        this.playTone(ctx, 369.99, 0, 0.16, 'sine', 0.04);
        this.playTone(ctx, 554.37, 0.05, 0.22, 'sine', 0.042);
        this.playTone(ctx, 739.99, 0.1, 0.28, 'triangle', 0.034);
        break;
      case 'genjutsu':
        this.playTone(ctx, 220.0, 0, 0.26, 'triangle', 0.048);
        this.playTone(ctx, 329.63, 0.05, 0.28, 'sine', 0.038);
        this.playTone(ctx, 466.16, 0.11, 0.32, 'sine', 0.032);
        break;
      case 'threejs':
        this.playTone(ctx, 261.63, 0, 0.2, 'triangle', 0.042);
        this.playTone(ctx, 392.0, 0.06, 0.26, 'sine', 0.042);
        this.playTone(ctx, 587.33, 0.12, 0.34, 'sine', 0.038);
        break;
      case 'gsap':
        this.playTone(ctx, 329.63, 0, 0.16, 'sine', 0.04);
        this.playTone(ctx, 493.88, 0.05, 0.2, 'triangle', 0.038);
        this.playTone(ctx, 659.25, 0.1, 0.24, 'sine', 0.04);
        this.playTone(ctx, 783.99, 0.15, 0.28, 'sine', 0.032);
        break;
    }
  }

  /** Directional click + whoosh + chime when toggling an agent Active <-> Idle. */
  playStateToggleCue(nextState: 'active' | 'idle'): void {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    this.playClick('crisp', true);
    this.playWhoosh(nextState === 'active' ? 'in' : 'out', 0.028, true);

    if (nextState === 'active') {
      this.playTone(ctx, 392.0, 0, 0.14, 'sine', 0.035);
      this.playTone(ctx, 587.33, 0.06, 0.24, 'sine', 0.04);
    } else {
      this.playTone(ctx, 493.88, 0, 0.14, 'sine', 0.032);
      this.playTone(ctx, 349.23, 0.06, 0.22, 'sine', 0.03);
    }
  }

  /** Broad sweep whoosh + staggered harmony for crew-wide wave actions. */
  playGroupWaveCue(
    mode: 'sync-wave' | 'toggle-all' | 'activate-all' | 'idle-all' = 'sync-wave',
  ): void {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    this.playClick('crisp', true);
    this.playWhoosh('sweep', 0.036, true);

    const chordHz =
      mode === 'idle-all'
        ? [659.25, 587.33, 493.88, 440.0, 392.0, 329.63, 293.66, 261.63, 196.0, 146.83, 130.81]
        : [196.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99];

    chordHz.forEach((hz, idx) => {
      const wave: OscillatorType = idx === 5 ? 'triangle' : 'sine';
      const gain = idx === 5 ? 0.06 : 0.03;
      this.playTone(ctx, hz, idx * 0.09, 0.5, wave, gain);
    });
  }

  /** Heavy audit stamp + whoosh for Anti-Slop repeat audit inspection. */
  playAuditStampCue(): void {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    this.playClick('crisp', true);
    this.playWhoosh('out', 0.028, true);
    this.playTone(ctx, 98.0, 0, 0.22, 'triangle', 0.09);
    this.playTone(ctx, 146.83, 0.11, 0.32, 'triangle', 0.075);
    this.playTone(ctx, 293.66, 0.14, 0.36, 'sine', 0.045);
  }

  /** Subtle click + whoosh for Mission Board, style switcher, and detail dismiss. */
  playControlCue(direction: WhooshDirection = 'in'): void {
    this.unlock();
    if (this.muted) return;
    this.playClick('soft', true);
    this.playWhoosh(direction, 0.018, true);
  }
}

export const agentAudioManager = new AgentAudioManager();

export function playHoverTick(muted: boolean): void {
  agentAudioManager.setMuted(muted);
  agentAudioManager.playHoverCue();
}

export function playAgentClickCue(agentId: AgentId, muted: boolean): void {
  agentAudioManager.setMuted(muted);
  agentAudioManager.playAgentSelectCue(agentId);
}

export function playSyncCrewChord(muted: boolean): void {
  agentAudioManager.setMuted(muted);
  agentAudioManager.playGroupWaveCue('sync-wave');
}

export function playAuditStampCue(muted: boolean): void {
  agentAudioManager.setMuted(muted);
  agentAudioManager.playAuditStampCue();
}
