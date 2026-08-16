import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld, panCamera, zoomCameraAt, MIN_ZOOM, MAX_ZOOM, Camera } from './camera';

const cam: Camera = { x: 100, y: 50, zoom: 2 };

describe('camera math', () => {
  it('worldToScreen and screenToWorld are inverses', () => {
    const p = { x: 340, y: -120 };
    const round = screenToWorld(cam, worldToScreen(cam, p));
    expect(round.x).toBeCloseTo(p.x);
    expect(round.y).toBeCloseTo(p.y);
  });

  it('pan moves the world opposite to screen drag', () => {
    const panned = panCamera(cam, 40, -20);
    // dragging screen right by 40px at zoom 2 moves camera left by 20 world units
    expect(panned.x).toBe(80);
    expect(panned.y).toBe(60);
  });

  it('zoomCameraAt keeps the cursor point fixed on screen', () => {
    const cursor = { x: 500, y: 300 };
    const worldBefore = screenToWorld(cam, cursor);
    const zoomed = zoomCameraAt(cam, cursor, 3.5);
    const screenAfter = worldToScreen(zoomed, worldBefore);
    expect(screenAfter.x).toBeCloseTo(cursor.x);
    expect(screenAfter.y).toBeCloseTo(cursor.y);
  });

  it('zoom is clamped to [MIN_ZOOM, MAX_ZOOM]', () => {
    expect(zoomCameraAt(cam, { x: 0, y: 0 }, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomCameraAt(cam, { x: 0, y: 0 }, 0.001).zoom).toBe(MIN_ZOOM);
  });
});
