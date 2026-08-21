import { RefObject, useEffect, useRef, useState } from 'react';
import { screenToWorld } from '../canvas/camera';
import { HEADER_HEIGHT } from '../canvas/WidgetFrame';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';

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
 * How still the widget has to be before the window is resized to match. Panning
 * only moves it, which is cheap; a resize makes the app lay its whole interface
 * out again, so that one waits for the zoom to stop.
 */
const SETTLE_MS = 140;
/** How often the window follows a widget sliding across the canvas. */
const MOVE_MS = 60;
/**
 * Slack on the canvas edges. A maximised widget is exactly the size of the canvas,
 * so a fraction of a pixel decides whether it counts as inside; once a window is
 * here the margin is wider still, or a widget on the boundary would open and close
 * on alternate frames.
 */
const ATTACH_SLACK = 2;
const HERE_SLACK = 8;
/**
 * How long the widget has to be off the canvas before the window is sent back.
 * The sidebar takes 300ms to slide, and the widget is laid out at its final size
 * from the first frame — for that moment it looks as if it hangs over the edge,
 * which must not cost the user their window.
 */
const LEAVE_MS = 400;
/** How long to stop pushing after the widget has been moved to match its window. */
const RESYNC_MS = 250;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Puts the real application window on the widget, at the widget's own size, and
 * keeps it there (D-038).
 *
 * We do not draw that window — macOS always draws it above this one — so the one
 * rule that makes this work is that it is only ever placed while its widget is
 * **completely inside the canvas**. Nothing then needs clipping: slide the widget
 * under the sidebar or off the edge and the window goes back where it came from,
 * and comes back when the widget does.
 *
 * The rectangle is measured from the DOM rather than recomputed from the camera,
 * so the sidebar sliding open, the desk being resized and the widget's own chrome
 * are all accounted for by construction.
 */
export function useAppSurface(
  widgetId: string,
  appKey: string,
  ref: RefObject<HTMLElement | null>,
  choice: WindowChoice,
  onWindowTitle: (title: string | undefined) => void
) {
  const isOpen = useUiStore((s) => s.openAppIds.includes(widgetId)) && !!appKey;
  /** Open and completely on the canvas, so the real window is actually here. */
  const [isHere, setIsHere] = useState(false);
  /** The user has taken the window out of the slot; it stays where they put it. */
  const [isAway, setIsAway] = useState(false);
  // Kept across closing so the widget can keep saying that this app sets its own
  // size, which is worth knowing before opening it again.
  const [placement, setPlacement] = useState<PlaceResult | null>(null);
  // Read at placement time rather than depended on: which window is wanted only
  // matters when the command is sent, and a new object every render would
  // otherwise tear the placement down and redo it.
  const latest = useRef({ choice, onWindowTitle });
  latest.current = { choice, onWindowTitle };

  // Closing and opening again is a fresh start.
  useEffect(() => {
    if (!isOpen) setIsAway(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isAway) return;

    let frame = 0;
    let alive = true;
    let here = false;
    // The rectangle the window was last told about, in window coordinates.
    let sent = { x: 0, y: 0, width: 0, height: 0 };
    let lastShape = '';
    let stillSince = 0;
    let movedAt = 0;

    let resyncUntil = 0;
    let outSince = 0;

    /** Completely inside the canvas — the whole rule this rests on. */
    const fits = (box: Box) => {
      const area = canvasArea();
      const slack = here ? HERE_SLACK : ATTACH_SLACK;
      return (
        box.x >= area.x - slack &&
        box.y >= area.y - slack &&
        box.x + box.width <= area.x + area.width + slack &&
        box.y + box.height <= area.y + area.height + slack
      );
    };

    const place = (box: Box, raise: boolean) => {
      sent = { x: box.x, y: box.y, width: box.width, height: box.height };
      const { choice, onWindowTitle } = latest.current;
      void window.apps?.place(appKey, sent, choice, raise).then((result) => {
        if (!alive || !result) return;
        setPlacement(result);
        // Rewritten rather than kept from the first time, so a window whose title
        // changes — a different project in the same editor — stays the one this
        // widget means. Only on a change: this runs on every resize.
        const title = (result.ok && result.title) || undefined;
        if (result.ok && title !== choice.title) onWindowTitle(title);
      });
    };

    /** The widget went off the canvas: the window goes back where it came from. */
    const leave = () => {
      if (!here) return;
      here = false;
      setIsHere(false);
      void window.apps?.release(appKey);
    };

    /**
     * The window went somewhere the widget cannot follow — a window manager sent
     * it to fill the screen, say. It stays exactly where the user put it; the
     * widget goes back to being a launcher for it.
     */
    const dropSlot = () => {
      here = false;
      setIsHere(false);
      setIsAway(true);
      void window.apps?.detach(appKey);
    };

    // The window moved or resized on its own. Inside the canvas the widget
    // follows it, so dragging a window's edge is a way to lay the space out.
    const offWindowFrame = window.apps?.onWindowFrame((key, box) => {
      if (!alive || key !== appKey || !here) return;
      if (
        Math.abs(box.x - sent.x) < 3 &&
        Math.abs(box.y - sent.y) < 3 &&
        Math.abs(box.width - sent.width) < 3 &&
        Math.abs(box.height - sent.height) < 3
      ) {
        return;
      }
      if (!fits(box)) {
        dropSlot();
        return;
      }
      // Window coordinates back to the widget's own: the surface sits under the
      // widget's header, and the canvas starts to the right of the sidebar.
      const camera = getCamera();
      const world = screenToWorld(camera, { x: box.x - canvasArea().x, y: box.y });
      const { moveWidget, resizeWidget } = useSpaceStore.getState();
      moveWidget(widgetId, world.x, world.y - HEADER_HEIGHT);
      resizeWidget(widgetId, box.width / camera.zoom, box.height / camera.zoom + HEADER_HEIGHT);
      sent = { ...box };
      resyncUntil = performance.now() + RESYNC_MS;
    });

    const watch = () => {
      frame = requestAnimationFrame(watch);
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;

      if (!fits(box)) {
        // Held rather than acted on at once: a transient — the sidebar sliding,
        // a window resize in progress — must not restore a window the user is
        // still working in.
        if (!outSince) outSince = performance.now();
        else if (performance.now() - outSince >= LEAVE_MS) leave();
        return;
      }
      outSince = 0;
      if (!here) {
        here = true;
        setIsHere(true);
        place(box, true);
        return;
      }

      const now = performance.now();
      const shape = `${box.x},${box.y},${box.width},${box.height}`;
      if (shape !== lastShape) {
        lastShape = shape;
        stillSince = now;
      }
      // The widget has just been moved to match its window; let the layout settle
      // rather than pushing the window back at whatever it lands on.
      if (now < resyncUntil) {
        sent = { x: box.x, y: box.y, width: box.width, height: box.height };
        return;
      }

      // Zooming changes the size. One resize once it has stopped, rather than a
      // hundred on the way: the app lays its whole interface out for each one.
      if (Math.abs(box.width - sent.width) > 0.5 || Math.abs(box.height - sent.height) > 0.5) {
        if (now - stillSince >= SETTLE_MS) place(box, false);
        return;
      }
      // Panning only slides it, which is one cheap accessibility write.
      if (
        (Math.abs(box.x - sent.x) > 0.5 || Math.abs(box.y - sent.y) > 0.5) &&
        now - movedAt >= MOVE_MS
      ) {
        movedAt = now;
        sent = { ...sent, x: box.x, y: box.y };
        void window.apps?.move(appKey, { ...sent });
      }
    };
    watch();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      offWindowFrame?.();
      if (here) void window.apps?.release(appKey);
      setIsHere(false);
    };
  }, [isOpen, isAway, appKey, ref, widgetId]);

  // A different app in the same widget has told us nothing yet.
  useEffect(() => setPlacement(null), [appKey]);

  return { isOpen, isHere, isAway, placement, callBack: () => setIsAway(false) };
}
