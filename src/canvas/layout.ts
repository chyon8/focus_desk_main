import { Camera, MAX_ZOOM, MIN_ZOOM } from './camera';

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

/** One cell of a `cols`-wide grid holding `count` boxes. */
function cellSize(count: number, cols: number, area: Area) {
  const rows = Math.ceil(count / cols);
  return {
    width: Math.max(1, (area.width - ARRANGE_GAP * (cols - 1)) / cols),
    height: Math.max(1, (area.height - ARRANGE_GAP * (rows - 1)) / rows),
  };
}

/** How much of the area the boxes would actually cover in cells of this size. */
function covered(boxes: Box[], cell: Area) {
  return boxes.reduce((sum, box) => {
    const scale = Math.min(cell.width / box.width, cell.height / box.height);
    return sum + box.width * box.height * scale * scale;
  }, 0);
}

/**
 * Column count that wastes the least space. A wide window wants wide rows and a
 * tall one wants columns, and the boxes' own shapes tip the balance too — so try
 * every count and keep the one that covers the most.
 */
function bestColumns(boxes: Box[], inner: Area): number {
  let best = 1;
  let bestCover = -1;
  for (let cols = 1; cols <= boxes.length; cols++) {
    const cover = covered(boxes, cellSize(boxes.length, cols, inner));
    if (cover > bestCover) {
      bestCover = cover;
      best = cols;
    }
  }
  return best;
}

export function autoColumns(boxes: Box[], area: Area): number {
  return bestColumns(boxes, innerArea(area));
}

/**
 * A grid that fills the area rather than one that merely tidies: the cells are as
 * big as the space allows, and every box grows (or shrinks) into its own cell.
 * Each box keeps its aspect ratio, so it is centred in whatever the cell leaves over.
 */
function fillInto(
  boxes: Box[],
  inner: Area,
  cols: number,
  top: number
): Record<string, Placement> {
  const cell = cellSize(boxes.length, cols, inner);

  const placements: Record<string, Placement> = {};
  boxes.forEach((box, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // The last row is often short; centring it keeps the block from looking torn off.
    const inRow = Math.min(cols, boxes.length - row * cols);
    const rowInset = ((cols - inRow) * (cell.width + ARRANGE_GAP)) / 2;
    const scale = Math.min(cell.width / box.width, cell.height / box.height);
    const width = Math.round(box.width * scale);
    const height = Math.round(box.height * scale);
    placements[box.id] = {
      x: Math.round(rowInset + col * (cell.width + ARRANGE_GAP) + (cell.width - width) / 2),
      y: Math.round(top + row * (cell.height + ARRANGE_GAP) + (cell.height - height) / 2),
      width,
      height,
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
  if (boxes.length <= FOCUS_COUNT) return fillGrid(boxes, area);

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
      const tile = tileSize(cell, spans[i]);
      const scale = Math.min(tile.width / box.width, tile.height / box.height);
      return sum + box.width * box.height * scale * scale;
    }, 0);
    if (!best || covers > best.covers) best = { cells, cell, covers };
  }
  if (!best) return fillGrid(boxes, area);

  const placements: Record<string, Placement> = {};
  boxes.forEach((box, i) => {
    const { row, col } = best.cells[i];
    const tile = tileSize(best.cell, spans[i]);
    const scale = Math.min(tile.width / box.width, tile.height / box.height);
    const width = Math.round(box.width * scale);
    const height = Math.round(box.height * scale);
    placements[box.id] = {
      x: Math.round(col * (best.cell.width + ARRANGE_GAP) + (tile.width - width) / 2),
      y: Math.round(row * (best.cell.height + ARRANGE_GAP) + (tile.height - height) / 2),
      width,
      height,
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
