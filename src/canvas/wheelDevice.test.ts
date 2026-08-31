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

  // Recorded from a real trackpad pinch on 2026-09-01. deltaX is always 0 and
  // wheelDeltaY is always exactly ±120 whatever the fingers did, so this test
  // cannot tell a pinch from a wheel — 133 of 142 events passed it. The caller
  // keeps ctrl events away from it for that reason; this is here so the shape of
  // a pinch is on the record rather than rediscovered.
  it('cannot tell a pinch from a wheel, which is why the caller must', () => {
    const PINCH = [
      { deltaX: 0, deltaY: 3.21, wheelDeltaY: -120 },
      { deltaX: 0, deltaY: -13.05, wheelDeltaY: 120 },
      { deltaX: 0, deltaY: 22.61, wheelDeltaY: -120 },
    ];
    for (const e of PINCH) expect(looksLikeMouse(e)).toBe(true);
  });
});
