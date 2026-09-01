import type { Box } from './layout';

/**
 * Where a column's children sit. The column is an ordinary widget that owns a
 * list of other widgets' ids: it does not hold them in the React tree, it only
 * decides where they go. Everything else about a child — its own frame, its
 * body, its drag, its place in the saved document — is unchanged, which is why
 * a column costs so little to add.
 */

/** The frame's own header, above the column's title strip. Matches `HEADER_HEIGHT` in WidgetFrame. */
const WIDGET_HEADER = 40;
/** The strip holding the column's name and how many cards are in it. */
export const COLUMN_TITLE_HEIGHT = 44;
const COLUMN_PAD = 10;
const COLUMN_GAP = 8;
/** An empty column still has to be a target big enough to drop something on. */
const COLUMN_EMPTY_BODY = 120;

/** What a page becomes when it joins a column: a card, tall enough for its icon and title. */
export const COLUMN_CARD_HEIGHT = 170;

export interface ColumnPlacement {
  x: number;
  y: number;
  width: number;
}

/**
 * The children stacked down the column, and the height the column needs to hold
 * them. A column's height is never the user's to set — it is whatever its
 * contents come to.
 */
export function layOutColumn(
  column: { x: number; y: number; width: number },
  children: { id: string; height: number }[]
): { placements: Record<string, ColumnPlacement>; height: number } {
  const top = column.y + WIDGET_HEADER + COLUMN_TITLE_HEIGHT;
  const placements: Record<string, ColumnPlacement> = {};

  let y = top + COLUMN_PAD;
  for (const child of children) {
    placements[child.id] = { x: column.x + COLUMN_PAD, y, width: column.width - COLUMN_PAD * 2 };
    y += child.height + COLUMN_GAP;
  }

  const body = children.length ? y - COLUMN_GAP + COLUMN_PAD - top : COLUMN_EMPTY_BODY;
  return { placements, height: WIDGET_HEADER + COLUMN_TITLE_HEIGHT + body };
}

/** The column a point lands in, nearest the viewer first. Ids in `ignore` are the ones being dragged. */
export function columnAt(
  columns: Box[],
  point: { x: number; y: number },
  ignore: string[] = []
): string | null {
  const hit = columns.filter(
    (c) =>
      !ignore.includes(c.id) &&
      point.x >= c.x &&
      point.x <= c.x + c.width &&
      point.y >= c.y &&
      point.y <= c.y + c.height
  );
  return hit.length ? hit[hit.length - 1].id : null;
}

/**
 * Where in the stack a drop at this height belongs — by the middle of each card,
 * so a card dropped on the top half of another goes above it.
 */
export function dropIndex(children: { y: number; height: number }[], pointY: number): number {
  const above = children.filter((child) => pointY > child.y + child.height / 2);
  return above.length;
}
