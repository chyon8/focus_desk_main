import { describe, expect, it } from 'vitest';
import { panelPosition } from './QuickAdd';

const size = { width: 304, height: 260 };
const view = { width: 1440, height: 900 };

describe('quick add panel position', () => {
  it('opens with its corner at the pointer', () => {
    expect(panelPosition({ x: 500, y: 300 }, size, view)).toEqual({ left: 504, top: 304 });
  });

  it('flips to the left of the pointer near the right edge', () => {
    const { left } = panelPosition({ x: 1400, y: 300 }, size, view);
    expect(left + size.width).toBe(1396);
  });

  it('flips above the pointer near the bottom edge', () => {
    const { top } = panelPosition({ x: 500, y: 880 }, size, view);
    expect(top + size.height).toBe(876);
  });

  it('stays inside a window too short for either side', () => {
    const { top } = panelPosition({ x: 500, y: 150 }, size, { width: 1440, height: 300 });
    expect(top).toBe(12);
  });
});
