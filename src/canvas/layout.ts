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
export type ArrangeMode = 'grid' | 'cascade';

export const ARRANGE_GAP = 32;
const CASCADE_STEP = 36;
const FIT_PADDING = 20;

export interface Area {
  width: number;
  height: number;
}

/** Reading order, so an arrange feels like tidying rather than reshuffling. */
function inReadingOrder(boxes: Box[]) {
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
export function autoColumns(boxes: Box[], area: Area): number {
  const inner = innerArea(area);
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

/**
 * A grid that fills the area rather than one that merely tidies: the cells are as
 * big as the space allows, and every box grows (or shrinks) into its own cell.
 * Each box keeps its aspect ratio, so it is centred in whatever the cell leaves over.
 */
function fillGrid(boxes: Box[], area: Area, columns?: number): Record<string, Placement> {
  const inner = innerArea(area);
  const cols = Math.max(1, Math.min(boxes.length, columns ?? autoColumns(boxes, area)));
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
      y: Math.round(row * (cell.height + ARRANGE_GAP) + (cell.height - height) / 2),
      width,
      height,
    };
  });
  return placements;
}

/**
 * Lays boxes out in world space, relative to the origin.
 * - grid: fills `area` — `columns` per row, or the count that wastes the least
 *   space when omitted. Boxes are resized to their cells (aspect kept).
 * - cascade: overlapping stagger, like a deck of windows. Sizes are left alone.
 */
export function arrange(
  boxes: Box[],
  area: Area,
  mode: ArrangeMode = 'grid',
  columns?: number
): Record<string, Placement> {
  if (boxes.length === 0) return {};
  const ordered = inReadingOrder(boxes);

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
