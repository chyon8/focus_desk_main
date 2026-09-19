import { describe, it, expect } from 'vitest';
import {
  arrange,
  centreCamera,
  clampCamera,
  findFreeSpot,
  fitCamera,
  minZoomFor,
  inReadingOrder,
  isFullyVisible,
  placeInView,
  Box,
} from './layout';
import { MIN_ZOOM, worldToScreen } from './camera';

const boxes: Box[] = [
  { id: 'b', x: 900, y: 0, width: 200, height: 100 },
  { id: 'a', x: 0, y: 0, width: 300, height: 200 },
  { id: 'c', x: 0, y: 700, width: 300, height: 100 },
];

// Wide window, like the canvas area on a normal display.
const area = { width: 1400, height: 900 };

/** Boxes with their arranged position and size applied, ready to measure. */
function placed(input: Box[], ...args: [] | [typeof area, 'grid', number?]) {
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

  it('grid stays inside the area', () => {
    const out = placed(boxes, area, 'grid', 2);
    expect(Math.max(...out.map((p) => p.x + p.width))).toBeLessThanOrEqual(area.width);
    expect(Math.max(...out.map((p) => p.y + p.height))).toBeLessThanOrEqual(area.height);
  });

  it('grid grows small boxes but keeps each aspect ratio', () => {
    for (const p of placed(boxes, area, 'grid', 2)) {
      const box = boxes.find((b) => b.id === p.id)!;
      expect(p.width).toBeGreaterThan(box.width);
      expect(p.width / p.height).toBeCloseTo(box.width / box.height, 1);
    }
  });

  it('never blows a box up past half again the size it was designed at', () => {
    // A clock alone in a space used to be given half the screen, because the one
    // cell was the screen. The ceiling is read off `natural`, not off the box.
    const clock: Box[] = [
      { id: 'clock', x: 0, y: 0, width: 320, height: 400, natural: { width: 320, height: 400 } },
    ];
    const [p] = placed(clock, area, 'grid');
    expect(p.width).toBeLessThanOrEqual(320 * 1.5);
    expect(p.height).toBeLessThanOrEqual(400 * 1.5);
  });

  it('leaves no gap between what a box was given and what it takes', () => {
    // The grid is pulled in to the sizes that came out of the cells, so the block
    // is what the widgets need — a fit after this must not frame empty room.
    const small: Box[] = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      natural: { width: 300, height: 200 },
    }));
    const out = placed(small, area, 'grid', 2);
    const width = Math.max(...out.map((p) => p.x + p.width)) - Math.min(...out.map((p) => p.x));
    // Two columns of 450 with one gap between them, and nothing else.
    expect(width).toBe(450 * 2 + 32);
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

describe('minZoomFor', () => {
  const area = { y: 84, width: 1400, height: 816 };

  it('lets the space shrink well past the point where it all fits', () => {
    const fit = fitCamera(boxes, area)!.zoom;
    const floor = minZoomFor(boxes, area);
    expect(floor).toBeLessThan(fit / 2);
    expect(floor).toBeGreaterThan(fit / 4);
  });

  it('gives a space smaller than the screen the same room to zoom out', () => {
    const one: Box[] = [{ id: 'a', x: 0, y: 0, width: 200, height: 100 }];
    // Not locked at 1 by its own size: the floor is read off a screenful, not off
    // the one widget.
    expect(minZoomFor(one, area)).toBeLessThan(0.5);
    expect(minZoomFor(one, area)).toBeGreaterThan(0.2);
  });

  it('keeps the old floor for a space far too big to fit', () => {
    const huge: Box[] = [{ id: 'a', x: 0, y: 0, width: 100000, height: 100000 }];
    expect(minZoomFor(huge, area)).toBe(MIN_ZOOM);
  });

  it('has no floor to read off an empty space', () => {
    expect(minZoomFor([], area)).toBe(MIN_ZOOM);
  });
});

describe('clampCamera', () => {
  const area = { y: 84, width: 1400, height: 816 };
  // `boxes` spans 1100x800, so the bounds are widened to the 1400x816 screen and
  // sit centred on the widgets: x -150..1250, y -8..808.

  it('will not zoom out past the floor', () => {
    const floor = minZoomFor(boxes, area);
    expect(clampCamera({ x: 0, y: 0, zoom: 0.01 }, boxes, area).zoom).toBeCloseTo(floor);
  });

  it('leaves a camera that is already inside the limits alone', () => {
    const fit = fitCamera(boxes, area)!;
    const held = clampCamera(fit, boxes, area);
    expect(held.zoom).toBeCloseTo(fit.zoom);
    expect(held.x).toBeCloseTo(fit.x);
    expect(held.y).toBeCloseTo(fit.y);
  });

  it('lets a pan run until the edge of the bounds reaches the middle of the screen', () => {
    const right = clampCamera({ x: 90000, y: 0, zoom: 1 }, boxes, area);
    expect(worldToScreen(right, { x: 1250, y: 0 }).x).toBeCloseTo(area.width / 2);

    const down = clampCamera({ x: 0, y: 90000, zoom: 1 }, boxes, area);
    expect(worldToScreen(down, { x: 0, y: 808 }).y).toBeCloseTo(area.y + area.height / 2);
  });

  it('keeps the space in view when it is pushed the other way', () => {
    const left = clampCamera({ x: -90000, y: 0, zoom: 1 }, boxes, area);
    expect(worldToScreen(left, { x: -150, y: 0 }).x).toBeCloseTo(area.width / 2);
  });

  it('holds the space near the middle at the zoom floor', () => {
    const floor = minZoomFor(boxes, area);
    const pushed = clampCamera({ x: 90000, y: 90000, zoom: floor }, boxes, area);
    const centre = worldToScreen(pushed, { x: 550, y: 400 }); // widget bbox centre
    expect(centre.x).toBeGreaterThan(0);
    expect(centre.x).toBeLessThan(area.width);
    expect(centre.y).toBeGreaterThan(area.y);
    expect(centre.y).toBeLessThan(area.y + area.height);
  });

  it('has nothing to hold an empty space to', () => {
    const cam = { x: 9000, y: 9000, zoom: 0.02 };
    expect(clampCamera(cam, [], area)).toBe(cam);
  });
});

describe('placeInView', () => {
  const inset = { y: 84, width: 1400, height: 900 };
  const browser = { width: 900, height: 620 };

  it('puts the top-left on the point when the widget fits there', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    expect(placeInView(cam, browser, { x: 200, y: 150 }, inset)).toEqual({ x: 200, y: 150 });
  });

  it('keeps the whole widget on screen near the bottom-right corner', () => {
    const cam = { x: 100, y: 50, zoom: 0.5 };
    const at = { x: cam.x + 1350 / cam.zoom, y: cam.y + 950 / cam.zoom };
    const placed = placeInView(cam, browser, at, inset);
    expect(isFullyVisible(cam, { id: 'w', ...browser, ...placed }, inset)).toBe(true);
  });

  it('never goes above the top chrome', () => {
    const cam = { x: 0, y: 0, zoom: 1.5 };
    const placed = placeInView(cam, browser, { x: 10, y: 0 }, inset);
    expect(worldToScreen(cam, placed).y).toBeGreaterThanOrEqual(inset.y);
  });

  it('aligns a widget bigger than the view to the top-left', () => {
    const cam = { x: 0, y: 0, zoom: 3 };
    const placed = placeInView(cam, browser, { x: 300, y: 300 }, inset);
    const screen = worldToScreen(cam, placed);
    expect(screen.x).toBeCloseTo(16);
    expect(screen.y).toBeCloseTo(inset.y + 16);
  });
});

describe('findFreeSpot', () => {
  const memo = { width: 420, height: 460 };
  // The view a widget made from the launcher has to land in.
  const bounds = { left: 0, top: 0, right: 1400, bottom: 900 };

  it('leaves an empty spot where it was asked for', () => {
    expect(findFreeSpot({ x: 100, y: 100 }, memo, [], bounds)).toEqual({ x: 100, y: 100 });
  });

  it('steps aside when something is already there', () => {
    const taken: Box[] = [{ id: 'a', x: 100, y: 100, ...memo }];
    const spot = findFreeSpot({ x: 100, y: 100 }, memo, taken, bounds)!;
    expect(spot).not.toEqual({ x: 100, y: 100 });
    expect(
      spot.x < 100 + memo.width && spot.x + memo.width > 100 &&
        spot.y < 100 + memo.height && spot.y + memo.height > 100
    ).toBe(false);
  });

  it('keeps the whole widget inside the bounds', () => {
    // A row across the top, with room for one more widget below it and nowhere else.
    const tall = { ...bounds, bottom: 1500 };
    const taken: Box[] = [0, 1, 2].map((i) => ({ id: `a${i}`, x: i * 452, y: 0, ...memo }));
    const spot = findFreeSpot({ x: 452, y: 0 }, memo, taken, tall)!;
    expect(spot.x).toBeGreaterThanOrEqual(tall.left);
    expect(spot.y).toBeGreaterThanOrEqual(tall.top);
    expect(spot.x + memo.width).toBeLessThanOrEqual(tall.right);
    expect(spot.y + memo.height).toBeLessThanOrEqual(tall.bottom);
  });

  it('finds nothing when the bounds have no room left, so the caller can look wider', () => {
    const wall: Box[] = [];
    for (let x = -1000; x < 2400; x += 452)
      for (let y = -1000; y < 1900; y += 492) wall.push({ id: `${x},${y}`, x, y, ...memo });
    expect(findFreeSpot({ x: 300, y: 300 }, memo, wall, bounds)).toBeNull();
  });

  it('still ranges free without bounds, for a card taken out of a column', () => {
    const taken: Box[] = [{ id: 'a', x: 0, y: 0, ...memo }];
    const spot = findFreeSpot({ x: 0, y: 0 }, memo, taken);
    expect(spot).not.toEqual({ x: 0, y: 0 });
  });
});
