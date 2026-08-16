export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * True when any visible part of the view would land on the app's own chrome.
 *
 * A native view paints above every HTML element, so it must step aside for the
 * sidebar, control bar and open popovers. Shrinking its bounds is not an option:
 * bounds are also the page viewport, so clipping reflows the page (D-024).
 * The parts that fall outside the window are cropped by the window itself and
 * need no handling.
 */
export function overlapsShell(
  rect: ViewRect,
  area: ViewRect,
  windowSize: { width: number; height: number }
): boolean {
  const left = Math.max(rect.x, 0);
  const top = Math.max(rect.y, 0);
  const right = Math.min(rect.x + rect.width, windowSize.width);
  const bottom = Math.min(rect.y + rect.height, windowSize.height);

  // Nothing of the view is on screen at all.
  if (right <= left || bottom <= top) return false;

  return (
    left < area.x ||
    top < area.y ||
    right > area.x + area.width ||
    bottom > area.y + area.height
  );
}
