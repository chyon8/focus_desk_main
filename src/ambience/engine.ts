export type AmbienceLayer = 'rain' | 'fire' | 'cafe';

export interface AmbienceLevels {
  rain: number; // 0-100
  fire: number;
  cafe: number;
}

export const SILENT_AMBIENCE: AmbienceLevels = { rain: 0, fire: 0, cafe: 0 };

const NOISE_SECONDS = 4;

/** White noise, or brown noise (integrated white) which sounds deeper and warmer. */
function makeNoiseBuffer(ctx: AudioContext, brown: boolean) {
  const length = ctx.sampleRate * NOISE_SECONDS;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

interface Layer {
  gain: GainNode;
  /** Extra work per layer, e.g. the fire's crackle scheduler. */
  stop?: () => void;
}

/**
 * Ambient sound synthesised in the browser — no audio files, so it works offline
 * and has no licensing or CDN reliability problems.
 */
export class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private layers = new Map<AmbienceLayer, Layer>();
  private levels: AmbienceLevels = { ...SILENT_AMBIENCE };

  /** Must be called from a user gesture the first time, per browser autoplay rules. */
  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.build();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private build() {
    const ctx = this.ctx!;
    const white = makeNoiseBuffer(ctx, false);
    const brown = makeNoiseBuffer(ctx, true);

    const start = (buffer: AudioBuffer, filter: BiquadFilterNode) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      return gain;
    };

    // Rain: hiss with the lowest rumble filtered out.
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1400;
    rainFilter.Q.value = 0.5;
    this.layers.set('rain', { gain: start(white, rainFilter) });

    // Fire: warm bed of brown noise plus randomly scheduled crackles.
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.value = 700;
    const fireGain = start(brown, fireFilter);

    let crackleTimer: ReturnType<typeof setTimeout>;
    const crackle = () => {
      const level = this.levels.fire / 100;
      if (level > 0) {
        const source = ctx.createBufferSource();
        source.buffer = white;
        const pop = ctx.createGain();
        const now = ctx.currentTime;
        pop.gain.setValueAtTime(0, now);
        pop.gain.linearRampToValueAtTime(level * 0.35, now + 0.005);
        pop.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 900 + Math.random() * 1600;
        source.connect(band).connect(pop).connect(ctx.destination);
        source.start(now, Math.random() * (NOISE_SECONDS - 0.2), 0.12);
      }
      crackleTimer = setTimeout(crackle, 120 + Math.random() * 700);
    };
    crackle();
    this.layers.set('fire', { gain: fireGain, stop: () => clearTimeout(crackleTimer) });

    // Cafe: muffled murmur — brown noise rolled off hard.
    const cafeFilter = ctx.createBiquadFilter();
    cafeFilter.type = 'lowpass';
    cafeFilter.frequency.value = 380;
    this.layers.set('cafe', { gain: start(brown, cafeFilter) });
  }

  setLevels(levels: AmbienceLevels) {
    const isSilent = levels.rain === 0 && levels.fire === 0 && levels.cafe === 0;
    // Don't spin up an AudioContext just to set everything to zero.
    if (isSilent && !this.ctx) {
      this.levels = levels;
      return;
    }

    const ctx = this.ensureContext();
    this.levels = levels;

    for (const [name, layer] of this.layers) {
      // A gentle ramp keeps slider drags from clicking.
      layer.gain.gain.setTargetAtTime((levels[name] / 100) * 0.25, ctx.currentTime, 0.05);
    }
  }

  dispose() {
    for (const layer of this.layers.values()) layer.stop?.();
    this.layers.clear();
    void this.ctx?.close();
    this.ctx = null;
  }
}
