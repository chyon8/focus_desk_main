import { RefObject, useEffect, useState } from 'react';
import { useUiStore } from '../stores/uiStore';

export type PlaceFailure =
  | 'accessibility'
  | 'fullscreen'
  | 'otherSpace'
  | 'notRunning'
  | 'noWindow'
  | 'minimized'
  | 'unknown';

export type PlaceResult =
  /** `resizable` is false when the app owns its size and only its position moved. */
  | { ok: true; resizable: boolean }
  | { ok: false; reason: PlaceFailure };

/**
 * How still the rectangle has to be before the real window follows it. Only for
 * changes while already live — the first placement is immediate, because that is
 * the one the user is waiting on.
 */
const SETTLE_MS = 60;

/**
 * Puts the real application window on the widget while it is maximised (D-038).
 *
 * Only maximised: a real window is always drawn above this one, so on the canvas
 * it would cover the sidebar, ignore every widget's stacking order and have no
 * way to be clipped. Maximised there is nothing to collide with.
 *
 * The rectangle is measured from the DOM rather than recomputed from the camera,
 * so the sidebar sliding open, the window resizing and the widget's own chrome
 * are all accounted for by construction. Placement waits for it to stop moving:
 * dragging a window would otherwise fire an accessibility write per frame.
 */
export function useAppSurface(
  widgetId: string,
  appKey: string,
  ref: RefObject<HTMLElement | null>
) {
  const isLive = useUiStore((s) => s.maximizedWidgetId === widgetId) && !!appKey;
  // Kept across leaving live so the widget can keep saying that this app sets
  // its own size, which is worth knowing before opening it again.
  const [placement, setPlacement] = useState<PlaceResult | null>(null);

  useEffect(() => {
    if (!isLive) return;

    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | null = null;
    let last = '';
    let alive = true;

    const place = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      void window.apps
        ?.place(appKey, { x: box.x, y: box.y, width: box.width, height: box.height })
        .then((result) => {
          if (alive && result) setPlacement(result);
        });
    };

    const watch = () => {
      const box = ref.current?.getBoundingClientRect();
      if (box) {
        const key = `${box.x},${box.y},${box.width},${box.height}`;
        if (key !== last) {
          const isFirst = last === '';
          last = key;
          if (settle) clearTimeout(settle);
          if (isFirst) place();
          else settle = setTimeout(place, SETTLE_MS);
        }
      }
      frame = requestAnimationFrame(watch);
    };
    watch();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      if (settle) clearTimeout(settle);
      void window.apps?.release(appKey);
    };
  }, [isLive, appKey, ref]);

  // A different app in the same widget has told us nothing yet.
  useEffect(() => setPlacement(null), [appKey]);

  return { isLive, placement };
}
