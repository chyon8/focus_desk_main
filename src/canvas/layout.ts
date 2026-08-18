import { Camera, MAX_ZOOM, MIN_ZOOM } from './camera';

export interface Box {
  id: string;
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

/** Reading order, so an arrange feels like tidying rather than reshuffling. */
function inReadingOrder(boxes: Box[]) {
  return [...boxes].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

/** Running start position of each track, with a gap between them. */
function offsets(sizes: number[]): number[] {
  const out: number[] = [];
  let pos = 0;
  for (const size of sizes) {
    out.push(pos);
    pos += size + ARRANGE_GAP;
  }
  return out;
}

function packGrid(boxes: Box[], cols: number): Record<string, { x: number; y: number }> {
  // Each track is sized by its own widest/tallest box, so one browser widget
  // doesn't give a note a browser-sized cell and punch a hole in the grid.
  const colWidths: number[] = [];
  const rowHeights: number[] = [];
  boxes.forEach((box, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    colWidths[col] = Math.max(colWidths[col] ?? 0, box.width);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, box.height);
  });

  const colOffsets = offsets(colWidths);
  const rowOffsets = offsets(rowHeights);

  const positions: Record<string, { x: number; y: number }> = {};
  boxes.forEach((box, i) => {
    positions[box.id] = {
      x: colOffsets[i % cols],
      y: rowOffsets[Math.floor(i / cols)],
    };
  });
  return positions;
}

/**
 * Lays boxes out in world space, preserving each box's size.
 * - grid: `columns` per row, or roughly square when omitted
 * - cascade: overlapping stagger, like a deck of windows
 */
export function arrange(
  boxes: Box[],
  mode: ArrangeMode = 'grid',
  columns?: number
): Record<string, { x: number; y: number }> {
  if (boxes.length === 0) return {};
  const ordered = inReadingOrder(boxes);

  if (mode === 'cascade') {
    const positions: Record<string, { x: number; y: number }> = {};
    ordered.forEach((box, i) => {
      positions[box.id] = { x: i * CASCADE_STEP, y: i * CASCADE_STEP };
    });
    return positions;
  }

  return packGrid(ordered, Math.max(1, columns ?? Math.ceil(Math.sqrt(ordered.length))));
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
