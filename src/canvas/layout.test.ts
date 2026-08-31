import { describe, it, expect } from 'vitest';
import {
  arrange,
  autoColumns,
  centreCamera,
  fitCamera,
  inReadingOrder,
  isFullyVisible,
  Box,
} from './layout';
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
  it('grid fills the cells in the order it is given', () => {
    // Boxes are centred in their cells, so compare rows and columns, not exact px.
    const [b, a, c] = placed(boxes, area, 'grid', 2);
    expect(b.x).toBeLessThan(a.x); // b is first in input order → column 0
    expect(a.y).toBeLessThan(b.y + b.height); // a shares b's row
    expect(c.y).toBeGreaterThan(b.y + b.height); // c is on the next row
  });

  it('reading order puts the top-left box first', () => {
    expect(inReadingOrder(boxes).map((box) => box.id)).toEqual(['a', 'b', 'c']);
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
    expect(b.x).toBe(0); // b is first in input order → the front of the deck
    expect(a.x).toBe(a.y);
    expect(b.width).toBe(200);
  });

  it('returns an empty map for no boxes', () => {
    expect(arrange([], area)).toEqual({});
  });
});

describe('arrange focus', () => {
  const many: Box[] = Array.from({ length: 8 }, (_, i) => ({
    id: String(i),
    x: 0,
    y: 0,
    width: 300,
    height: 200,
  }));

  it('makes the first two about twice the size, not many times it', () => {
    const places = arrange(many, area, 'focus');
    const ratio = places['0'].width / places['2'].width;
    expect(ratio).toBeGreaterThan(1.6);
    expect(ratio).toBeLessThan(2.5);
    // The same multiple both ways, so a big tile is the small one scaled up.
    expect(places['0'].width / places['0'].height).toBeCloseTo(
      places['2'].width / places['2'].height,
      1
    );
  });

  it('lines every tile up on one grid', () => {
    const places = arrange(many, area, 'focus');
    // Tiles share edges when they share a column, which is what stops the layout
    // reading as unrelated bands stacked on each other.
    const lefts = new Set(Object.values(places).map((p) => Math.round(p.x)));
    expect(lefts.size).toBeLessThan(many.length);
  });

  it('never overlaps two tiles', () => {
    const places = Object.values(arrange(many, area, 'focus'));
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const a = places[i];
        const b = places[j];
        const apart =
          a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('keeps everything inside the area it was given', () => {
    const places = arrange(many, area, 'focus');
    for (const place of Object.values(places)) {
      expect(place.x).toBeGreaterThanOrEqual(0);
      expect(place.y).toBeGreaterThanOrEqual(0);
      expect(place.x + place.width).toBeLessThanOrEqual(area.width);
      expect(place.y + place.height).toBeLessThanOrEqual(area.height);
    }
  });

  it('is an even grid when there is no front row to make', () => {
    const two = many.slice(0, 2);
    expect(arrange(two, area, 'focus')).toEqual(arrange(two, area, 'grid'));
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


describe('centreCamera', () => {
  const inset = { y: 84, width: 1400, height: 900 };
  const box: Box = { id: 'a', x: 2000, y: 1200, width: 400, height: 300 };

  it('keeps the zoom and puts the box in the middle of the area', () => {
    const cam = centreCamera({ x: 0, y: 0, zoom: 0.5 }, box, inset);
    expect(cam.zoom).toBe(0.5);
    const centre = worldToScreen(cam, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    expect(centre.x).toBeCloseTo(inset.width / 2);
    expect(centre.y).toBeCloseTo(inset.y + inset.height / 2);
  });

  it('leaves the box fully visible', () => {
    const cam = centreCamera({ x: 0, y: 0, zoom: 1 }, box, inset);
    expect(isFullyVisible(cam, box, inset)).toBe(true);
  });
});

describe('isFullyVisible', () => {
  const inset = { y: 84, width: 1400, height: 900 };

  it('is false for a box off to the right', () => {
    const box: Box = { id: 'a', x: 1300, y: 100, width: 400, height: 300 };
    expect(isFullyVisible({ x: 0, y: 0, zoom: 1 }, box, inset)).toBe(false);
  });

  it('is false for a box hidden under the top chrome', () => {
    const box: Box = { id: 'a', x: 100, y: 40, width: 200, height: 200 };
    expect(isFullyVisible({ x: 0, y: 0, zoom: 1 }, box, inset)).toBe(false);
  });
});
