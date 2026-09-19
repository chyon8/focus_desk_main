import { describe, it, expect } from 'vitest';
import {
  arrange,
  autoColumns,
  centreCamera,
  clampCamera,
  findFreeSpot,
  fitCamera,
  inLaneOrder,
  minZoomFor,
  orderFor,
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
function placed(input: Box[], ...args: [] | [typeof area, 'grid' | 'stack', number?]) {
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

  it('returns an empty map for no boxes', () => {
    expect(arrange([], area)).toEqual({});
  });
});

describe('arrange stack', () => {
  // A tall photo among short widgets: the case a grid handles badly, because the
  // whole row grows to the photo's height.
  const mixed: Box[] = [
    { id: 'photo', x: 0, y: 0, width: 280, height: 640, natural: { width: 280, height: 640 } },
    { id: 'memo', x: 0, y: 0, width: 420, height: 300, natural: { width: 420, height: 300 } },
    { id: 'todo', x: 0, y: 0, width: 320, height: 280, natural: { width: 320, height: 280 } },
    { id: 'clock', x: 0, y: 0, width: 320, height: 300, natural: { width: 320, height: 300 } },
  ];

  it('puts boxes on a lane directly under one another', () => {
    const out = placed(mixed, area, 'stack', 2);
    const lanes = new Map<number, typeof out>();
    for (const p of out) lanes.set(p.x, [...(lanes.get(p.x) ?? []), p]);
    for (const lane of lanes.values()) {
      const sorted = [...lane].sort((a, b) => a.y - b.y);
      sorted.slice(1).forEach((p, i) => {
        const above = sorted[i];
        expect(p.y).toBe(above.y + above.height + 32); // ARRANGE_GAP, nothing more
      });
    }
  });

  it('leaves a tall box tall instead of fitting it to a row', () => {
    const [photo] = placed(mixed, area, 'stack', 2);
    expect(photo.height / photo.width).toBeCloseTo(640 / 280, 1);
  });

  it('never overlaps two boxes', () => {
    const out = placed(mixed, area, 'stack', 2);
    for (const a of out) {
      for (const b of out) {
        if (a.id === b.id) continue;
        const apart =
          a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('makes every card as wide as its lane, and every lane the same width', () => {
    const withPage: Box[] = [
      ...mixed,
      { id: 'page', x: 0, y: 0, width: 900, height: 620 },
    ];
    const out = placed(withPage, area, 'stack', 3);
    expect(new Set(out.map((p) => p.width))).toEqual(new Set([300]));
    const page = out.find((p) => p.id === 'page')!;
    expect(page.height).toBe(Math.round((620 * 300) / 900));
  });

  it('deals cards out row by row, in the order given', () => {
    const [photo, memo, todo, clock] = placed(mixed, area, 'stack', 3);
    // First three make the top row, left to right.
    expect([photo.y, memo.y, todo.y]).toEqual([0, 0, 0]);
    expect(photo.x).toBeLessThan(memo.x);
    expect(memo.x).toBeLessThan(todo.x);
    // The fourth goes under the first, whatever the lane heights.
    expect(clock.x).toBe(photo.x);
    expect(clock.y).toBe(photo.y + photo.height + 32);
  });

  it('reads a stack back in the order it was made from', () => {
    const cards: Box[] = Array.from({ length: 7 }, (_, i) => ({
      id: String(i), x: 0, y: 0, width: 300, height: 200 + ((i * 37) % 150),
    }));
    const out = arrange(cards, area, 'stack', 3);
    const laid = cards.map((box) => ({ ...box, ...out[box.id] }));
    const shuffled = [laid[4], laid[0], laid[6], laid[2], laid[1], laid[5], laid[3]];
    expect(inLaneOrder(shuffled).map((b) => b.id)).toEqual(cards.map((b) => b.id));
  });

  it('keeps a card in the lane it was dragged to', () => {
    const lane = (x: number, y: number, id: string): Box => ({ id, x, y, width: 300, height: 200 });
    // a and b on the left, c on the right; b dragged to the top of the right lane.
    const order = inLaneOrder([lane(0, 0, 'a'), lane(340, -40, 'b'), lane(332, 0, 'c')]);
    expect(order.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves a column at the size it owns', () => {
    const withColumn: Box[] = [
      ...mixed,
      { id: 'col', x: 0, y: 0, width: 300, height: 900, fixed: true },
    ];
    const col = placed(withColumn, area, 'stack', 2).find((p) => p.id === 'col')!;
    expect(col.width).toBe(300);
    expect(col.height).toBe(900);
  });
});

describe('arrange masonry', () => {
  const cards: Box[] = [300, 180, 420, 240, 260, 500, 200].map((height, i) => ({
    id: String(i), x: 0, y: 0, width: 300, height,
  }));

  it('puts each card on the shortest lane so far', () => {
    const out = arrange(cards, area, 'masonry', 3);
    // 0,1,2 make the top row; lane 1 (180) is shortest, so 3 goes under 1.
    expect(out['3'].x).toBe(out['1'].x);
    expect(out['3'].y).toBe(180 + 32);
    // Then lane 0 (300) is shortest.
    expect(out['4'].x).toBe(out['0'].x);
  });

  it('gives every lane the same width', () => {
    const out = Object.values(arrange(cards, area, 'masonry', 3));
    expect(new Set(out.map((p) => p.width))).toEqual(new Set([300]));
  });
});

describe('arranging twice', () => {
  // Scattered, the way a desk looks before anything is arranged.
  const desk: Box[] = [
    { id: 'photo', x: 900, y: 40, width: 280, height: 420, natural: { width: 280, height: 320 } },
    { id: 'memo', x: 100, y: 700, width: 420, height: 460, natural: { width: 420, height: 460 } },
    { id: 'page', x: 50, y: 20, width: 900, height: 620, natural: { width: 900, height: 620 } },
    { id: 'todo', x: 1400, y: 300, width: 320, height: 420, natural: { width: 320, height: 420 } },
    { id: 'clock', x: 700, y: 900, width: 320, height: 400, natural: { width: 320, height: 400 } },
    { id: 'col', x: 1200, y: 1000, width: 300, height: 900, fixed: true },
    { id: 'timer', x: 300, y: 1500, width: 340, height: 340, natural: { width: 340, height: 340 } },
  ];

  for (const mode of ['grid', 'stack', 'masonry'] as const) {
    for (const columns of [undefined, 3]) {
      it(`gives the same desk in ${mode} (${columns ?? 'auto'} columns)`, () => {
        const once = (boxes: Box[]) => {
          const out = arrange(orderFor(mode, boxes), area, mode, columns);
          return boxes.map((box) => ({ ...box, ...out[box.id] }));
        };
        const first = once(desk);
        const second = once(first);
        const third = once(second);
        for (const [i, box] of second.entries()) {
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(box[key] - first[i][key])).toBeLessThanOrEqual(2);
            expect(Math.abs(third[i][key] - first[i][key])).toBeLessThanOrEqual(2);
          }
        }
      });
    }
  }
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
