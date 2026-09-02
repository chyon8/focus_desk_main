import type { Box } from './layout';

/**
 * A column is a list of cards. It is the one thing on the canvas that is not a
 * free-floating box: its width is fixed, its rows are one height, and its own
 * height is nothing but how many cards it holds.
 *
 * That is deliberate. The first version let a column be sized like any other
 * widget while still reading its height off its contents, and the two rules
 * fought each other — an arrange set a height, the layout overwrote it, the next
 * arrange read the overwritten box and scaled it again, so every press left the
 * column narrower until it was a bar. A size that is a pure function of the
 * contents cannot drift.
 *
 * The cards are drawn by the column itself, not as widgets of their own. A card
 * that keeps its own frame keeps a header, an icon and a close button with it,
 * and a stack of those is a pile of little windows rather than a list. The
 * column's name goes in the frame's own header for the same reason — a title
 * strip under it was a second row of chrome saying the same thing.
 */

/** The frame's own header, above the column's title strip. Matches `HEADER_HEIGHT` in WidgetFrame. */
const WIDGET_HEADER = 40;
export const COLUMN_PAD = 10;
export const COLUMN_GAP = 8;
/** An empty column still has to be a target big enough to drop something on. */
const COLUMN_EMPTY_BODY = 96;

/** Every column is this wide. A column is read down; a wider one shows nothing more. */
export const COLUMN_WIDTH = 300;
/** And every row in one is this tall: a list reads as a list when its rows match. */
export const COLUMN_CARD_HEIGHT = 196;
/** How much of a card the page's picture takes. The rest carries the address, the name and the line the page offers. */
export const COLUMN_CARD_IMAGE = 108;

/**
 * How big a card opens when it is opened where it stands.
 *
 * `PEEK_WIDTH` is what it takes when there is room: wide enough that a page lays
 * itself out as a desktop page — `MIN_LAYOUT_WIDTH` in the browser widget is
 * 640, and below that sites serve their phone layout — with room over for the
 * frame's own chrome.
 *
 * `PEEK_MIN_WIDTH` is what it will squeeze down to rather than cover the column
 * it came out of. A page narrower than its layout width is scaled down, not
 * reflowed, so it keeps the shape the card was a picture of; under this it is
 * too small to read at all and the panel may as well be somewhere else.
 *
 * The height is a screenful and no more. This is a look at something, not a
 * place to work — a panel as tall as the window is a maximised widget with extra
 * steps, and the ⤢ button is right there for when that is what was wanted.
 */
export const PEEK_WIDTH = 860;
export const PEEK_MIN_WIDTH = 520;
export const PEEK_HEIGHT = 600;
/** Clear space between the column and the panel, so the two read as separate things. */
export const PEEK_GAP = 20;

/** How tall a column holding this many cards is. Nothing else decides it. */
export function columnHeight(count: number): number {
  const body = count
    ? COLUMN_PAD * 2 + count * COLUMN_CARD_HEIGHT + (count - 1) * COLUMN_GAP
    : COLUMN_EMPTY_BODY;
  return WIDGET_HEADER + body;
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
 * Where a card's panel goes: beside its column, level with the card itself, and
 * always fully on screen.
 *
 * All of it is in screen pixels — the panel is drawn at 1:1 whatever the camera
 * is doing, because a page shrunk to 40% is exactly the thing the card already
 * was.
 *
 * It takes the side with more room and narrows to what that side has, rather
 * than keeping one width and sitting on top of the column. Covering the column
 * loses the one thing a panel has over filling the screen: the list it came out
 * of is still there beside it. Only when neither side can hold a readable panel
 * does it give that up and go to the middle.
 */
export function peekRect(
  column: { x: number; y: number; width: number },
  slot: number,
  camera: { x: number; y: number; zoom: number },
  area: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  // The column's edges on screen, which is what the panel is placed against.
  const left = (column.x - camera.x) * camera.zoom;
  const right = left + column.width * camera.zoom;
  const roomRight = area.width - right - PEEK_GAP * 2;
  const roomLeft = left - PEEK_GAP * 2;
  const beside = Math.max(roomLeft, roomRight);

  const width = Math.min(
    PEEK_WIDTH,
    beside >= PEEK_MIN_WIDTH ? beside : area.width - PEEK_GAP * 2
  );
  const height = Math.min(PEEK_HEIGHT, area.height - PEEK_GAP * 2);

  const clamp = (value: number, low: number, high: number) =>
    Math.max(low, Math.min(high, value));
  const x =
    beside < PEEK_MIN_WIDTH
      ? (area.width - width) / 2
      : roomRight >= roomLeft
        ? right + PEEK_GAP
        : left - PEEK_GAP - width;

  const cardTop =
    (column.y + WIDGET_HEADER + COLUMN_PAD + slot * (COLUMN_CARD_HEIGHT + COLUMN_GAP) - camera.y) *
    camera.zoom;

  return {
    x: clamp(x, PEEK_GAP, Math.max(PEEK_GAP, area.width - width - PEEK_GAP)),
    // Level with the card, then pulled back on screen: a card near the bottom of
    // a long column would otherwise open below the window.
    y: clamp(
      cardTop + (COLUMN_CARD_HEIGHT * camera.zoom - height) / 2,
      area.y + PEEK_GAP,
      Math.max(area.y + PEEK_GAP, area.y + area.height - height - PEEK_GAP)
    ),
    width,
    height,
  };
}

/**
 * Which slot a drop at this height lands in, counted from the top of the list.
 * By the middle of each row, so a card let go over the upper half of another
 * goes above it.
 */
export function dropIndex(column: { y: number }, count: number, pointY: number): number {
  const top = column.y + WIDGET_HEADER + COLUMN_PAD;
  const slot = Math.floor((pointY - top + COLUMN_GAP / 2) / (COLUMN_CARD_HEIGHT + COLUMN_GAP));
  return Math.max(0, Math.min(count, slot));
}
