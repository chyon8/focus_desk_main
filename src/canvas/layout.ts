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
const FIT_PADDING = 48;

/** Reading order, so an arrange feels like tidying rather than reshuffling. */
function inReadingOrder(boxes: Box[]) {
  return [...boxes].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

function packGrid(boxes: Box[], cols: number): Record<string, { x: number; y: number }> {
  const cellWidth = Math.max(...boxes.map((b) => b.width));

  // Row height is the tallest box in that row, so short rows stay compact.
  const rowHeights: number[] = [];
  boxes.forEach((box, i) => {
    const row = Math.floor(i / cols);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, box.height);
  });

  const rowOffsets: number[] = [];
  let y = 0;
  for (let row = 0; row < rowHeights.length; row++) {
    rowOffsets[row] = y;
    y += rowHeights[row] + ARRANGE_GAP;
  }

  const positions: Record<string, { x: number; y: number }> = {};
  boxes.forEach((box, i) => {
    positions[box.id] = {
      x: (i % cols) * (cellWidth + ARRANGE_GAP),
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

export type StackedBox = Box & { z: number };

/**
 * True when any widget stacked above `target` overlaps it.
 *
 * Only browser widgets care: their native view paints above all HTML and ignores
 * z-index, so the widget in front — its header included — would be swallowed.
 * A covered view hides itself and shows a snapshot, which stacks like any HTML.
 */
export function isCovered(target: StackedBox, boxes: StackedBox[]): boolean {
  return boxes.some(
    (box) =>
      box.id !== target.id &&
      box.z > target.z &&
      box.x < target.x + target.width &&
      box.x + box.width > target.x &&
      box.y < target.y + target.height &&
      box.y + box.height > target.y
  );
}

/**
 * Camera that frames every box inside the given area.
 * `area` is the canvas region in window coordinates — the world container starts
 * at its origin, so only its size matters for the zoom, but the camera must also
 * account for the area being inset from the window.
 */
export function fitCamera(boxes: Box[], areaWidth: number, areaHeight: number): Camera | null {
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
        (areaWidth - FIT_PADDING * 2) / contentWidth,
        (areaHeight - FIT_PADDING * 2) / contentHeight
      )
    )
  );

  // Put the content's centre at the area's centre.
  return {
    zoom,
    x: (minX + maxX) / 2 - areaWidth / (2 * zoom),
    y: (minY + maxY) / 2 - areaHeight / (2 * zoom),
  };
}
