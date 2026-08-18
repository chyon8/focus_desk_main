import { describe, it, expect } from 'vitest';
import { arrange, fitCamera, ARRANGE_GAP, Box } from './layout';
import { worldToScreen } from './camera';

const boxes: Box[] = [
  { id: 'b', x: 900, y: 0, width: 200, height: 100 },
  { id: 'a', x: 0, y: 0, width: 300, height: 200 },
  { id: 'c', x: 0, y: 700, width: 300, height: 100 },
];

describe('arrange', () => {
  it('grid lays boxes out in reading order, not input order', () => {
    const pos = arrange(boxes, 'grid', 2);
    expect(pos['a']).toEqual({ x: 0, y: 0 });
    expect(pos['b']).toEqual({ x: 300 + ARRANGE_GAP, y: 0 });
    expect(pos['c']).toEqual({ x: 0, y: 200 + ARRANGE_GAP });
  });

  it('grid uses the tallest box in a row for the next row offset', () => {
    // Row 0 holds a (200 tall) and b (100 tall), so row 1 starts below 200.
    expect(arrange(boxes, 'grid', 2)['c'].y).toBe(232);
  });

  it('one column stacks every box vertically', () => {
    const pos = arrange(boxes, 'grid', 1);
    expect(new Set(Object.values(pos).map((p) => p.x)).size).toBe(1);
    expect(pos['a'].y).toBe(0);
    expect(pos['b'].y).toBe(200 + ARRANGE_GAP);
  });

  it('a column count at or above the box count puts them all in one row', () => {
    const pos = arrange(boxes, 'grid', 5);
    expect(new Set(Object.values(pos).map((p) => p.y)).size).toBe(1);
    expect(new Set(Object.values(pos).map((p) => p.x)).size).toBe(3);
  });

  it('picks a roughly square column count when none is given', () => {
    // 3 boxes → ceil(sqrt(3)) = 2 columns.
    const pos = arrange(boxes, 'grid');
    expect(new Set(Object.values(pos).map((p) => p.y)).size).toBe(2);
  });

  it('sizes each column by its own widest box, not the widest overall', () => {
    // Column 0 holds a (300) and c (300); b's 200 width sits in column 1, so the
    // 300-wide column decides the second column's x — not some global maximum.
    const wide: Box[] = [
      { id: 'a', x: 0, y: 0, width: 300, height: 200 },
      { id: 'b', x: 400, y: 0, width: 900, height: 200 },
      { id: 'c', x: 0, y: 300, width: 300, height: 200 },
    ];
    const pos = arrange(wide, 'grid', 2);
    expect(pos['b'].x).toBe(300 + ARRANGE_GAP);
    expect(pos['c'].x).toBe(0);
  });

  it('cascade staggers boxes diagonally', () => {
    const pos = arrange(boxes, 'cascade');
    expect(pos['a']).toEqual({ x: 0, y: 0 });
    expect(pos['b'].x).toBeGreaterThan(0);
    expect(pos['b'].x).toBe(pos['b'].y);
  });

  it('returns an empty map for no boxes', () => {
    expect(arrange([])).toEqual({});
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

