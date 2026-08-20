import { describe, it, expect } from 'vitest';
import { arrange, autoColumns, fitCamera, Box } from './layout';
import { worldToScreen } from './camera';

const boxes: Box[] = [
  { id: 'b', x: 900, y: 0, width: 200, height: 100 },
  { id: 'a', x: 0, y: 0, width: 300, height: 200 },
  { id: 'c', x: 0, y: 700, width: 300, height: 100 },
];

// Wide window, like the canvas area on a normal display.
const area = { width: 1400, height: 900 };

/** Boxes with their arranged position and size applied, ready to measure. */
function placed(input: Box[], ...args: [] | [typeof area, 'grid' | 'cascade', number?]) {
  const placements = arrange(input, args[0] ?? area, args[1], args[2]);
  return input.map((box) => ({ id: box.id, ...placements[box.id] }));
}

describe('arrange', () => {
  it('grid lays boxes out in reading order, not input order', () => {
    // Boxes are centred in their cells, so compare rows and columns, not exact px.
    const [b, a, c] = placed(boxes, area, 'grid', 2);
    expect(a.x).toBeLessThan(b.x); // a is first in reading order → column 0
    expect(b.y).toBeLessThan(a.y + a.height); // b shares a's row
    expect(c.y).toBeGreaterThan(a.y + a.height); // c is on the next row
  });

  it('grid fills the area: the block spans it and nothing spills out', () => {
    const out = placed(boxes, area, 'grid', 2);
    const right = Math.max(...out.map((p) => p.x + p.width));
    const bottom = Math.max(...out.map((p) => p.y + p.height));
    expect(right).toBeLessThanOrEqual(area.width);
    expect(bottom).toBeLessThanOrEqual(area.height);
    // At least one axis is used up to the padding the fit leaves.
    expect(Math.max(right / area.width, bottom / area.height)).toBeGreaterThan(0.9);
  });

  it('grid grows small boxes but keeps each aspect ratio', () => {
    for (const p of placed(boxes, area, 'grid', 2)) {
      const box = boxes.find((b) => b.id === p.id)!;
      expect(p.width).toBeGreaterThan(box.width);
      expect(p.width / p.height).toBeCloseTo(box.width / box.height, 1);
    }
  });

  it('a tall, narrow area is filled with one column', () => {
    expect(autoColumns(boxes, { width: 500, height: 1600 })).toBe(1);
  });

  it('a wide, short area is filled with one row', () => {
    expect(autoColumns(boxes, { width: 2400, height: 400 })).toBe(3);
  });

  it('one column stacks every box vertically', () => {
    const out = placed(boxes, area, 'grid', 1);
    const ys = out.map((p) => p.y).sort((m, n) => m - n);
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });

  it('a column count at or above the box count puts them all in one row', () => {
    const out = placed(boxes, area, 'grid', 5);
    expect(new Set(out.map((p) => p.y + p.height / 2)).size).toBe(1);
  });

  it('cascade staggers boxes diagonally and leaves their sizes alone', () => {
    const out = placed(boxes, area, 'cascade');
    const a = out.find((p) => p.id === 'a')!;
    const b = out.find((p) => p.id === 'b')!;
    expect(a.x).toBe(0);
    expect(b.x).toBe(b.y);
    expect(b.width).toBe(200);
  });

  it('returns an empty map for no boxes', () => {
    expect(arrange([], area)).toEqual({});
  });
});

describe('fitCamera', () => {
  const area = { y: 0, width: 1400, height: 900 };

  it('frames all boxes inside the area', () => {
    const camera = fitCamera(boxes, area)!;
    for (const box of boxes) {
      const topLeft = worldToScreen(camera, { x: box.x, y: box.y });
      const bottomRight = worldToScreen(camera, { x: box.x + box.width, y: box.y + box.height });
      expect(topLeft.x).toBeGreaterThanOrEqual(0);
      expect(topLeft.y).toBeGreaterThanOrEqual(0);
      expect(bottomRight.x).toBeLessThanOrEqual(1400);
      expect(bottomRight.y).toBeLessThanOrEqual(900);
    }
  });

  it('centres the content in the area', () => {
    const camera = fitCamera(boxes, area)!;
    const centre = worldToScreen(camera, { x: 550, y: 400 }); // bbox centre
    expect(centre.x).toBeCloseTo(700);
    expect(centre.y).toBeCloseTo(450);
  });

  it('keeps the content below a top-inset area, not under the chrome', () => {
    const inset = fitCamera(boxes, { y: 84, width: 1400, height: 816 })!;
    // Every box starts below the chrome, and the content is centred in what is left.
    for (const box of boxes) {
      expect(worldToScreen(inset, { x: box.x, y: box.y }).y).toBeGreaterThanOrEqual(84);
    }
    expect(worldToScreen(inset, { x: 550, y: 400 }).y).toBeCloseTo(84 + 816 / 2);
  });

  it('returns null when there is nothing to frame', () => {
    expect(fitCamera([], area)).toBeNull();
  });
});

