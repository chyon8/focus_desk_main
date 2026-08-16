import { describe, it, expect } from 'vitest';
import { overlapsShell } from './overlap';

const windowSize = { width: 1440, height: 900 };
// Canvas area with a 256px sidebar on the left and a 76px control bar at the bottom.
const area = { x: 256, y: 0, width: 1184, height: 824 };

describe('overlapsShell', () => {
  it('is false for a rect fully inside the canvas area', () => {
    expect(overlapsShell({ x: 400, y: 100, width: 500, height: 400 }, area, windowSize)).toBe(false);
  });

  it('is true when the rect reaches into the sidebar', () => {
    expect(overlapsShell({ x: 100, y: 50, width: 600, height: 200 }, area, windowSize)).toBe(true);
  });

  it('is true when the rect reaches into the control bar', () => {
    expect(overlapsShell({ x: 400, y: 700, width: 300, height: 400 }, area, windowSize)).toBe(true);
  });

  it('ignores the part that hangs outside the window', () => {
    // Runs off the right edge and below the window, but touches no chrome.
    expect(overlapsShell({ x: 1200, y: 400, width: 600, height: 300 }, area, windowSize)).toBe(false);
  });

  it('is false when the rect is entirely off screen', () => {
    expect(overlapsShell({ x: 2000, y: 100, width: 400, height: 300 }, area, windowSize)).toBe(false);
  });
});
