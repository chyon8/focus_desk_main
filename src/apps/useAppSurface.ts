import { RefObject, useEffect, useRef, useState } from 'react';
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
  /**
   * `resizable` is false when the app owns its size and only its position moved;
   * `title` is the window that was chosen, which the widget remembers.
   */
  | { ok: true; resizable: boolean; title: string | null }
  | { ok: false; reason: PlaceFailure };

/** Which window this widget means, for an app that keeps several open (D-045). */
export interface WindowChoice {
  /** The one it was placed on last time. */
  title?: string;
  /** The ones other widgets in this space already stand for. */
  avoid?: string[];
}

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
  ref: RefObject<HTMLElement | null>,
  choice: WindowChoice,
  onWindowTitle: (title: string | undefined) => void
) {
  const isLive = useUiStore((s) => s.maximizedWidgetId === widgetId) && !!appKey;
  // Kept across leaving live so the widget can keep saying that this app sets
  // its own size, which is worth knowing before opening it again.
  const [placement, setPlacement] = useState<PlaceResult | null>(null);
  // Read at placement time rather than depended on: which window is wanted only
  // matters when the command is sent, and a new object every render would
  // otherwise tear the placement down and redo it.
  const latest = useRef({ choice, onWindowTitle });
  latest.current = { choice, onWindowTitle };

  useEffect(() => {
    if (!isLive) return;

    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | null = null;
    let last = '';
    let alive = true;

    const place = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const { choice, onWindowTitle } = latest.current;
      void window.apps
        ?.place(appKey, { x: box.x, y: box.y, width: box.width, height: box.height }, choice)
        .then((result) => {
          if (!alive || !result) return;
          setPlacement(result);
          // Rewritten rather than kept from the first time, so a window whose
          // title changes — a different project in the same editor — stays the
          // one this widget means. Only on a change: this runs on every follow.
          const title = (result.ok && result.title) || undefined;
          if (result.ok && title !== choice.title) onWindowTitle(title);
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
