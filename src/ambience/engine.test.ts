import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmbienceEngine, SILENT_AMBIENCE } from './engine';

// Minimal Web Audio stand-in: records the gain each layer is driven to.
const gains: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> }[] = [];
let contextCount = 0;

function makeParam() {
  const param = {
    value: 0,
    setTargetAtTime: vi.fn((target: number) => {
      param.value = target;
    }),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  return param;
}

class FakeAudioContext {
  sampleRate = 8000;
  currentTime = 0;
  state = 'running';
  destination = {};

  constructor() {
    contextCount++;
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data, length };
  }
  createBufferSource() {
    return { buffer: null, loop: false, connect: () => connectable(), start: vi.fn() };
  }
  createGain() {
    const gain = makeParam();
    gains.push(gain);
    return { gain, connect: () => connectable() };
  }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: () => connectable() };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

// connect() returns whatever it was given in the real API; a chainable stub is enough.
function connectable(): any {
  return { connect: (next: any) => next ?? connectable() };
}

beforeEach(() => {
  gains.length = 0;
  contextCount = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AmbienceEngine', () => {
  it('does not open an AudioContext while everything is silent', () => {
    const engine = new AmbienceEngine();
    engine.setLevels(SILENT_AMBIENCE);
    expect(contextCount).toBe(0);
  });

  it('opens one AudioContext on first audible level and reuses it', () => {
    const engine = new AmbienceEngine();
    engine.setLevels({ rain: 50, fire: 0, cafe: 0 });
    engine.setLevels({ rain: 80, fire: 20, cafe: 0 });
    expect(contextCount).toBe(1);
  });

  it('ramps layer gains proportionally to the levels', () => {
    const engine = new AmbienceEngine();
    engine.setLevels({ rain: 100, fire: 0, cafe: 50 });

    // Three layer gains are created during build(), in rain/fire/cafe order.
    const [rain, fire, cafe] = gains;
    expect(rain.value).toBeCloseTo(0.25);
    expect(fire.value).toBeCloseTo(0);
    expect(cafe.value).toBeCloseTo(0.125);
  });

  it('stops its crackle timer on dispose', () => {
    const engine = new AmbienceEngine();
    engine.setLevels({ rain: 0, fire: 40, cafe: 0 });
    const pending = vi.getTimerCount();
    engine.dispose();
    expect(vi.getTimerCount()).toBeLessThan(pending);
  });
});
