import { describe, expect, it } from 'vitest';
import { looksLikeMouse } from './useCameraControls';

// Recorded from the real devices on 2026-08-29 (first events of each scroll).
const MOUSE = [
  { deltaX: 0, wheelDeltaY: -120 },
  { deltaX: 0, wheelDeltaY: -480 },
  { deltaX: 0, wheelDeltaY: -360 },
  { deltaX: 0, wheelDeltaY: -720 },
  { deltaX: 0, wheelDeltaY: 120 },
  { deltaX: 0, wheelDeltaY: 600 },
];

const TRACKPAD = [
  { deltaX: -1, wheelDeltaY: -3 },
  { deltaX: -4, wheelDeltaY: -39 },
  { deltaX: -9, wheelDeltaY: -80 },
  { deltaX: -21, wheelDeltaY: -246 },
  { deltaX: 3, wheelDeltaY: -116 },
  { deltaX: 0, wheelDeltaY: -42 },
];

describe('looksLikeMouse', () => {
  it('reads every recorded mouse event as a mouse', () => {
    for (const e of MOUSE) expect(looksLikeMouse(e)).toBe(true);
  });

  it('reads the recorded trackpad events as not a mouse', () => {
    for (const e of TRACKPAD) expect(looksLikeMouse(e)).toBe(false);
  });

  // The trackpad rests between flicks, and a zero would otherwise pass the
  // multiple-of-120 test and turn a pan into a zoom.
  it('does not call a still wheel a mouse', () => {
    expect(looksLikeMouse({ deltaX: 0, wheelDeltaY: 0 })).toBe(false);
    expect(looksLikeMouse({ deltaX: 0 })).toBe(false);
  });
});
