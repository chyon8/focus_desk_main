import { Camera, MAX_ZOOM, MIN_ZOOM } from './camera';

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * A box that owns its size: an arrange places it and leaves its width and
   * height alone. A column is one — its height is its card count, so a grid
   * that resized it would have its answer overwritten and read the overwritten
   * box the next time round.
   */
  fixed?: boolean;
  /**
   * The size this box was designed at, which is the size an arrange measures
   * growth against. Without it a grid has nothing to say how big is too big and
   * scales every box to fill its cell.
   */
  natural?: { width: number; height: number };
}

/** Where a box ends up after an arrange — grid mode resizes as well as moves. */
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A column count covers rows (1) and a single row (n), so those need no own mode.
export type ArrangeMode = 'grid' | 'cascade' | 'focus';

export const ARRANGE_GAP = 32;
const CASCADE_STEP = 36;
const FIT_PADDING = 20;

export interface Area {
  width: number;
  height: number;
}

/** Reading order: top-left first, for callers that want tidying over reordering. */
export function inReadingOrder(boxes: Box[]) {
  return [...boxes].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

/** The area a grid may use: the same inset `fitCamera` leaves, so the fit lands at zoom 1. */
function innerArea(area: Area): Area {
  return {
    width: Math.max(1, area.width - FIT_PADDING * 2),
    height: Math.max(1, area.height - FIT_PADDING * 2),
  };
}

/**
 * One cell of a `cols`-wide grid holding `count` boxes, never narrower than a
 * box that owns its width.
 *
 * Only the width has a floor. A column is as tall as its cards — over a
 * thousand pixels is ordinary — and making every cell in the grid that tall
 * collapses the whole layout into one long strip of tiny widgets. Height is
 * handled per row instead, where only the row the column is in grows.
 */
function cellSize(count: number, cols: number, area: Area, floorWidth = 1) {
  const rows = Math.ceil(count / cols);
  return {
    width: Math.max(floorWidth, (area.width - ARRANGE_GAP * (cols - 1)) / cols),
    height: Math.max(1, (area.height - ARRANGE_GAP * (rows - 1)) / rows),
  };
}

/** The widest of the boxes that own their size, which every cell has to clear. */
function fixedWidth(boxes: Box[]): number {
  return Math.max(1, ...boxes.filter((box) => box.fixed).map((box) => box.width));
}

/**
 * How much bigger than its designed size an arrange may draw a widget.
 *
 * There was no ceiling at all, and a grid scales every box to fill its cell — so
 * a space holding one clock gave that clock half the screen, because the cell
 * was the screen. Past half again its designed size a clock face or a timer is
 * not more readable, only bigger. The same number holds for every type, so the
 * result still reads as one grid rather than as each widget having its own idea
 * of how much room it deserves.
 */
const MAX_GROWTH = 1.5;

/**
 * The size a box is drawn at in a cell this big: as large as the cell allows,
 * but never past `growth` times what the box was designed at. Aspect is kept, so
 * the box is centred in whatever the cell has left over.
 *
 * `growth` is raised for a mosaic's front tiles. Holding every tile to the same
 * ceiling flattened the mosaic — the big tile hit the ceiling while the small
 * ones were still under it, so "twice the size" came out as 1.57 and the mode
 * stopped saying anything. A front tile spans two cells, so it is allowed twice
 * the ceiling, and the multiple between the two sizes survives.
 */
function sizeIn(box: Box, cell: Area, growth = MAX_GROWTH): { width: number; height: number } {
  if (box.fixed) return { width: box.width, height: box.height };
  const fit = Math.min(cell.width / box.width, cell.height / box.height);
  const natural = box.natural ?? box;
  const ceiling = Math.min(
    (natural.width * growth) / box.width,
    (natural.height * growth) / box.height
  );
  const scale = Math.min(fit, ceiling);
  return { width: Math.round(box.width * scale), height: Math.round(box.height * scale) };
}

/**
 * How well a `cols`-wide grid uses the screen: the area its boxes cover once the
 * camera frames the block, which is what an arrange is followed by.
 *
 * Covered area on its own stopped telling the two apart once growth was capped —
 * every column count fits everything at full size, so they all scored the same
 * and the first one won, which is a single tall stack. Weighting by the zoom the
 * fit would land at is what puts a block shaped like the screen in front.
 */
function gridScore(boxes: Box[], inner: Area, cols: number): number {
  const placed = Object.values(fillInto(boxes, inner, cols, 0));
  if (placed.length === 0) return 0;
  const width = Math.max(1, Math.max(...placed.map((p) => p.x + p.width)));
  const height = Math.max(1, Math.max(...placed.map((p) => p.y + p.height)));
  const zoom = Math.min(inner.width / width, inner.height / height);
  return placed.reduce((sum, p) => sum + p.width * p.height, 0) * zoom * zoom;
}

/**
 * Column count that uses the screen best. A wide window wants wide rows and a
 * tall one wants columns, and the boxes' own shapes tip the balance too — so try
 * every count and keep the one that scores highest.
 */
function bestColumns(boxes: Box[], inner: Area): number {
  let best = 1;
  let bestScore = -1;
  for (let cols = 1; cols <= boxes.length; cols++) {
    const score = gridScore(boxes, inner, cols);
    if (score > bestScore) {
      bestScore = score;
      best = cols;
    }
  }
  return best;
}

export function autoColumns(boxes: Box[], area: Area): number {
  return bestColumns(boxes, innerArea(area));
}

/**
 * A `cols`-wide grid: every box takes as much of its cell as it may, and the
 * grid is then pulled in to exactly what the boxes turned out to need.
 *
 * The two steps are separate on purpose. The cell decides how big a box is
 * allowed to be; the column widths and row heights are read back off the sizes
 * that came out of that. Before the growth ceiling those were the same number,
 * so leaving the cells at their original size was harmless — now a cell is
 * routinely wider than anything in it, and a grid built on cell size would space
 * the widgets out with gaps nothing sits in. The fit that follows an arrange
 * would then zoom out to frame all that empty room.
 *
 * Because a column's width is shared down the whole grid, the left and right
 * edges of the widgets line up column by column however different their sizes.
 */
function fillInto(
  boxes: Box[],
  inner: Area,
  cols: number,
  top: number
): Record<string, Placement> {
  const cell = cellSize(boxes.length, cols, inner, fixedWidth(boxes));
  const rowOf = (i: number) => Math.floor(i / cols);
  const sizes = boxes.map((box) => sizeIn(box, cell));

  // Each column is as wide as its widest box, each row as tall as its tallest. A
  // row holding a column widget — as tall as its cards, and never scaled — grows
  // to clear it, and the rows above and below keep the height they needed.
  const colWidths: number[] = [];
  const rowHeights: number[] = [];
  sizes.forEach((size, i) => {
    const col = i % cols;
    const row = rowOf(i);
    colWidths[col] = Math.max(colWidths[col] ?? 0, size.width);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, size.height);
  });
  const track = (lengths: number[], start: number) =>
    lengths.reduce<number[]>((offsets, _, i) => {
      offsets.push(i === 0 ? start : offsets[i - 1] + lengths[i - 1] + ARRANGE_GAP);
      return offsets;
    }, []);
  const colXs = track(colWidths, 0);
  const rowYs = track(rowHeights, top);
  const gridWidth = colXs[colWidths.length - 1] + colWidths[colWidths.length - 1];

  const placements: Record<string, Placement> = {};
  boxes.forEach((box, i) => {
    const col = i % cols;
    const row = rowOf(i);
    const size = sizes[i];
    // The last row is often short; centring it keeps the block from looking torn off.
    const inRow = Math.min(colWidths.length, boxes.length - row * cols);
    const rowWidth = colXs[inRow - 1] + colWidths[inRow - 1];
    placements[box.id] = {
      x: Math.round(
        (gridWidth - rowWidth) / 2 + colXs[col] + (colWidths[col] - size.width) / 2
      ),
      y: Math.round(rowYs[row] + (rowHeights[row] - size.height) / 2),
      width: size.width,
      height: size.height,
    };
  });
  return placements;
}

function fillGrid(boxes: Box[], area: Area, columns?: number): Record<string, Placement> {
  const inner = innerArea(area);
  const cols = Math.max(1, Math.min(boxes.length, columns ?? bestColumns(boxes, inner)));
  return fillInto(boxes, inner, cols, 0);
}

/** How many boxes get the bigger tile, and how many cells across one of those is. */
const FOCUS_COUNT = 2;
const LEAD_SPAN = 2;

/**
 * Where each tile sits on a `cols`-wide cell grid, and how many rows that took.
 *
 * Plain row-scan packing: each tile goes in the first place it fits, reading
 * order. That is what keeps the result looking deliberate — every tile, big or
 * small, lands on the same column rhythm, so the edges line up down the whole
 * layout instead of each band having its own spacing.
 */
function packTiles(spans: number[], cols: number) {
  const taken: boolean[][] = [];
  const isTaken = (row: number, col: number) => taken[row]?.[col] ?? false;
  const fits = (row: number, col: number, span: number) => {
    if (col + span > cols) return false;
    for (let r = 0; r < span; r++) {
      for (let c = 0; c < span; c++) if (isTaken(row + r, col + c)) return false;
    }
    return true;
  };

  const cells: { row: number; col: number }[] = [];
  let rows = 0;
  for (const span of spans) {
    let row = 0;
    for (;;) {
      const col = [...Array(cols).keys()].find((c) => fits(row, c, span));
      if (col === undefined) {
        row++;
        continue;
      }
      for (let r = 0; r < span; r++) {
        for (let c = 0; c < span; c++) (taken[row + r] ??= [])[col + c] = true;
      }
      cells.push({ row, col });
      rows = Math.max(rows, row + span);
      break;
    }
  }
  return { cells, rows };
}

/**
 * A mosaic: the first boxes get a tile twice as wide and twice as tall, the rest
 * get one cell each, and everything sits on one grid.
 *
 * The caller decides what "first" means — `arrangeWidgets` hands them over most
 * recently used first, so what the user was last working on comes back big. An
 * even grid says everything on the desk matters the same, which is never true of
 * a desk somebody has been working at.
 *
 * The big tile is exactly two cells, not a share of the height. Sizing the front
 * row as a fraction — which is what this did first — left the bands unrelated to
 * each other: two enormous tiles over a strip of small ones, at whatever ratio
 * the numbers happened to give. A whole multiple of the same cell keeps the
 * difference readable and the layout tidy.
 *
 * The column count is the one whose cells the boxes fill best, so a row of
 * landscape browser widgets does not get packed into tall thin cells.
 *
 * With two or fewer boxes there is no mosaic to make, so it is an even grid.
 */
function focusGrid(boxes: Box[], area: Area): Record<string, Placement> {
  // A mosaic is built out of tiles that take the size they are given. A column
  // does not, so a space holding one gets the even grid, which does have a way
  // to make room for it.
  if (boxes.length <= FOCUS_COUNT || boxes.some((box) => box.fixed)) return fillGrid(boxes, area);

  const inner = innerArea(area);
  const spans = boxes.map((_, i) => (i < FOCUS_COUNT ? LEAD_SPAN : 1));
  const tileSize = (cell: Area, span: number) => ({
    width: cell.width * span + ARRANGE_GAP * (span - 1),
    height: cell.height * span + ARRANGE_GAP * (span - 1),
  });

  let best: { cells: { row: number; col: number }[]; cell: Area; covers: number } | null = null;
  for (let cols = LEAD_SPAN + 1; cols <= boxes.length; cols++) {
    const { cells, rows } = packTiles(spans, cols);
    const cell = {
      width: (inner.width - ARRANGE_GAP * (cols - 1)) / cols,
      height: (inner.height - ARRANGE_GAP * (rows - 1)) / rows,
    };
    if (cell.width < 1 || cell.height < 1) continue;
    const covers = boxes.reduce((sum, box, i) => {
      const size = sizeIn(box, tileSize(cell, spans[i]), MAX_GROWTH * spans[i]);
      return sum + size.width * size.height;
    }, 0);
    if (!best || covers > best.covers) best = { cells, cell, covers };
  }
  if (!best) return fillGrid(boxes, area);

  const placements: Record<string, Placement> = {};
  boxes.forEach((box, i) => {
    const { row, col } = best.cells[i];
    const tile = tileSize(best.cell, spans[i]);
    // A front tile spans two cells, so its ceiling is twice the even grid's —
    // that is what keeps the front row twice the size rather than merely bigger.
    const size = sizeIn(box, tile, MAX_GROWTH * spans[i]);
    placements[box.id] = {
      x: Math.round(col * (best.cell.width + ARRANGE_GAP) + (tile.width - size.width) / 2),
      y: Math.round(row * (best.cell.height + ARRANGE_GAP) + (tile.height - size.height) / 2),
      width: size.width,
      height: size.height,
    };
  });
  return placements;
}

/**
 * Lays boxes out in world space, relative to the origin, **in the order given** —
 * the first box takes the first cell. The caller decides what that order means.
 * - grid: fills `area` — `columns` per row, or the count that wastes the least
 *   space when omitted. Boxes are resized to their cells (aspect kept).
 * - focus: a mosaic — the first two get a tile twice the size, on the same grid.
 * - cascade: overlapping stagger, like a deck of windows. Sizes are left alone.
 */
export function arrange(
  boxes: Box[],
  area: Area,
  mode: ArrangeMode = 'grid',
  columns?: number
): Record<string, Placement> {
  if (boxes.length === 0) return {};
  const ordered = boxes;

  if (mode === 'cascade') {
    const placements: Record<string, Placement> = {};
    ordered.forEach((box, i) => {
      placements[box.id] = {
        x: i * CASCADE_STEP,
        y: i * CASCADE_STEP,
        width: box.width,
        height: box.height,
      };
    });
    return placements;
  }

  if (mode === 'focus') return focusGrid(ordered, area);

  return fillGrid(ordered, area, columns);
}

/** Do these two boxes touch, with `gap` of clear space counted as touching? */
function overlaps(a: Placement, b: Box, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/**
 * The nearest spot to `wanted` where `size` sits clear of `taken`.
 *
 * Searched in rings outward from where the caller asked for, so a widget put
 * down beside the thing it came out of stays beside it and only steps aside as
 * far as it has to. Nothing is ever placed on top of something else, which is
 * what made taking a card out of a column look like it had done nothing at all:
 * it landed under the next column along.
 */
export function findFreeSpot(
  wanted: { x: number; y: number },
  size: { width: number; height: number },
  taken: Box[],
  gap = ARRANGE_GAP
): { x: number; y: number } {
  const step = size.width + gap;
  const drop = size.height + gap;
  // 0, 1, -1, 2, -2 … so a ring is tried down and to the right before up and to
  // the left. Straight outward order took the first free cell it found, which was
  // the one above — and a widget that steps up out of the top of the window is
  // the same "nothing happened" the free spot exists to prevent. Down and right
  // is where the rest of the app puts things, so it is also where the eye goes.
  const outward = (ring: number) => {
    const offsets = [0];
    for (let i = 1; i <= ring; i++) offsets.push(i, -i);
    return offsets;
  };
  for (let ring = 0; ring <= 6; ring++) {
    for (const dy of outward(ring)) {
      for (const dx of outward(ring)) {
        // Only the ring's own edge: the inside of it was tried on an earlier pass.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const at = { ...size, x: wanted.x + dx * step, y: wanted.y + dy * drop };
        if (!taken.some((box) => overlaps(at, box, gap))) return { x: at.x, y: at.y };
      }
    }
  }
  return wanted;
}

/**
 * Camera that frames every box inside the given area.
 * The world container starts at the area's left edge, so `area.x` doesn't enter
 * the maths — but it hangs below the top chrome, so `area.y` does: without it the
 * top row of a fit lands underneath the drag strip and looks cut off.
 */
export function fitCamera(
  boxes: Box[],
  area: { y: number; width: number; height: number }
): Camera | null {
  if (boxes.length === 0) return null;

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      Math.min(
        (area.width - FIT_PADDING * 2) / contentWidth,
        (area.height - FIT_PADDING * 2) / contentHeight
      )
    )
  );

  // Put the content's centre at the area's centre.
  return {
    zoom,
    x: (minX + maxX) / 2 - area.width / (2 * zoom),
    y: (minY + maxY) / 2 - (area.y + area.height / 2) / zoom,
  };
}

/**
 * How far out the space may be drawn before there is nothing left to look at:
 * two fifths of a screen across. Smaller than that the widgets are specks and
 * the screen is mostly empty, which is what the limit exists to stop. The fit
 * itself is not the floor — a space is worked on from further out than that,
 * to see where things sit and to have somewhere to put the next one.
 */
const MAX_SHRINK = 2.5;

/**
 * The rect the camera is held to: the widgets' bounding box, never smaller than
 * one screenful. The floor is what keeps a space holding a single small widget
 * from freezing the canvas — the box would be a few hundred pixels across, and
 * both limits below are read off it, so there would be nowhere to zoom out to
 * and nowhere to pan to before the next widget goes down.
 */
function spaceBounds(boxes: Box[], area: Area): Box | null {
  if (boxes.length === 0) return null;

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  const width = Math.max(maxX - minX, area.width);
  const height = Math.max(maxY - minY, area.height);
  return {
    id: 'bounds',
    x: (minX + maxX) / 2 - width / 2,
    y: (minY + maxY) / 2 - height / 2,
    width,
    height,
  };
}

/** How far out this space may be zoomed: `MAX_SHRINK` past the point where it fills the screen, and never past the old `MIN_ZOOM` floor. */
export function minZoomFor(boxes: Box[], area: { y: number; width: number; height: number }) {
  const bounds = spaceBounds(boxes, area);
  if (!bounds) return MIN_ZOOM;
  return Math.max(MIN_ZOOM, fitCamera([bounds], area)!.zoom / MAX_SHRINK);
}

/**
 * Holds the camera on the space: no further out than `minZoomFor`, and never
 * so far across that the middle of the screen leaves `spaceBounds`.
 *
 * The pan limit is on the middle of the view rather than its edge so that one
 * rule holds at every zoom — an edge limit has to swap round once the view
 * grows wider than the space, and the middle does not.
 */
export function clampCamera(
  cam: Camera,
  boxes: Box[],
  area: { y: number; width: number; height: number }
): Camera {
  const bounds = spaceBounds(boxes, area);
  if (!bounds) return cam;

  const zoom = Math.min(MAX_ZOOM, Math.max(minZoomFor(boxes, area), cam.zoom));
  const halfW = area.width / (2 * zoom);
  // `cam.y` is the world at the top of the window, and the canvas area starts
  // below the top chrome — so the middle being held is that area's, not the
  // window's.
  const offsetY = (area.y + area.height / 2) / zoom;

  return {
    zoom,
    x: Math.min(Math.max(cam.x + halfW, bounds.x), bounds.x + bounds.width) - halfW,
    y: Math.min(Math.max(cam.y + offsetY, bounds.y), bounds.y + bounds.height) - offsetY,
  };
}

/**
 * Camera that puts one box in the middle of the area, at the zoom already in
 * use. Unlike `fitCamera` this does not change how far in the user is — it is
 * for going to look at something, not for reframing the whole space.
 */
export function centreCamera(
  cam: Camera,
  box: Box,
  area: { y: number; width: number; height: number }
): Camera {
  return {
    zoom: cam.zoom,
    x: box.x + box.width / 2 - area.width / (2 * cam.zoom),
    y: box.y + box.height / 2 - (area.y + area.height / 2) / cam.zoom,
  };
}

/** Whether the whole box is on screen — so the app can tell when it has put something where the user cannot see it. */
export function isFullyVisible(
  cam: Camera,
  box: Box,
  area: { y: number; width: number; height: number }
): boolean {
  const left = (box.x - cam.x) * cam.zoom;
  const top = (box.y - cam.y) * cam.zoom;
  return (
    left >= 0 &&
    top >= area.y &&
    left + box.width * cam.zoom <= area.width &&
    top + box.height * cam.zoom <= area.y + area.height
  );
}
