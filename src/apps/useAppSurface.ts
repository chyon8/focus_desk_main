import { RefObject, useEffect, useRef, useState } from 'react';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
   * `title` is the window that was chosen, which the widget remembers; `rect` is
   * where it actually ended up, in window coordinates, which is not always what
   * was asked for.
   */
  | { ok: true; resizable: boolean; title: string | null; rect: Box }
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
 * so a fraction of a pixel decides whether it counts as inside.
 */
const ATTACH_SLACK = 2;
const HERE_SLACK = 8;
/**
 * The smallest piece of widget a window is put on. A widget that runs under the
 * sidebar or the top strip gets the window on the part that is still on the
 * canvas, rather than nothing at all — the window cannot be clipped, but it can
 * be given the visible rectangle.
 */
const MIN_SHOWN_WIDTH = 120;
const MIN_SHOWN_HEIGHT = 90;
/**
 * How close the window has to be to the slot to count as sitting on it. The whole
 * design rests on those two rectangles being the same one.
 */
const FIT_SLACK = 3;
/**
 * How long after a window is placed its own frame changes still count as the app
 * laying itself out rather than the user resizing it. Editors restore the frame
 * they had last session about a second after their window appears.
 */
const OPEN_GRACE_MS = 1500;
/**
 * How long the widget has to be unable to hold its window before it steps aside.
 * The sidebar takes 300ms to slide and a zoom passes through every size on the
 * way, and neither of those is the user asking for anything.
 */
const LEAVE_MS = 400;
/**
 * And how long it has to be able to hold it again before it comes back. Enough to
 * stop a widget resting on the boundary from flickering its window in and out,
 * and no more — this is the delay the user feels when they zoom back in. Opening
 * one is not delayed at all.
 */
const REATTACH_MS = 80;
/** How long to stop pushing after the widget has been moved to match its window. */
const RESYNC_MS = 250;
/** How many times a window is put back during that grace before it is left alone. */
const MAX_CORRECTIONS = 3;
/**
 * The tracking tick. Not `requestAnimationFrame`: while apps are on their slots
 * the desk sits below every window, and macOS sends no frames to a window it
 * considers covered — so on rAF this loop stops exactly when it has the most to
 * do, and only starts again when enough of the desk is uncovered to be drawn.
 * Timers keep running there. `backgroundThrottling: false` on the window keeps
 * them running at full speed.
 */
const TICK_MS = 32;

/**
 * Keeps the real application window at the widget's position and size (D-038).
 *
 * macOS draws that window above ours and does not clip it, so the window is on
 * the slot only while it covers the widget's rectangle. When it cannot — the
 * widget is partly off the canvas, or the canvas zoomed out past the smallest
 * size the window takes — the window is moved off screen and the widget shows a
 * card instead. Zooming back in puts it back.
 *
 * The widget's stored size is written by the user only: by resizing the widget,
 * by dragging the window's own edge, and once when the app is opened. It is never
 * written from a resize the app refused, which used to grow every widget by one
 * over the zoom factor on each zoom step.
 */
export function useAppSurface(
  widgetId: string,
  appKey: string,
  ref: RefObject<HTMLElement | null>,
  choice: WindowChoice,
  onWindowTitle: (title: string | undefined) => void
) {
  const isOpen = useUiStore((s) => s.openAppIds.includes(widgetId)) && !!appKey;
  const closeApp = useUiStore((s) => s.closeApp);
  /**
   * Whether the real windows are on their slots at all. While the desk is in
   * front nothing here runs: the windows are behind it, so following them around
   * the canvas would be work nobody can see, and putting them back would be the
   * desk arguing with the state the user just asked for.
   */
  const isStaged = useUiStore((s) => s.isStaged);
  /**
   * The main process is holding this app's slot. A ref because it has to outlive
   * the placement effect, which is torn down and rebuilt on every ⌃⌥D —
   * leaving the stage must not look like the widget giving up its window. True
   * while the window has stepped aside, too: the slot is still ours.
   */
  const placed = useRef(false);
  /** Open, and the real window is on the slot. */
  const [isHere, setIsHere] = useState(false);
  /** The user has taken the window out of the slot; it stays where they put it. */
  const [isAway, setIsAway] = useState(false);
  /** The widget is off the canvas, so its window waits off screen. */
  const [aside, setAside] = useState(false);
  /**
   * The click that opened this widget has been answered. Only that first
   * placement may change the widget's own size, and only once — a ref because
   * ⌃⌥D rebuilds the placement effect several times a session, and every trip
   * back on stage would otherwise be another chance for the app to inflate it.
   */
  const answered = useRef(false);
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
    if (isOpen) return;
    setIsAway(false);
    setAside(false);
    answered.current = false;
  }, [isOpen]);

  /**
   * Opening the widget is asking for the window, so it brings the stage with it.
   * Only the moment it opens: reacting to the state itself would undo ⌃⌥D on
   * the next frame, every time.
   */
  const wasOpen = useRef(false);
  useEffect(() => {
    const opening = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (opening) void window.apps?.setStaged(true);
  }, [isOpen]);

  /**
   * The app quit. Its widget has nothing left to stand in for, so it goes back to
   * being the launcher it was. Outside the placement effect on purpose: quitting
   * an app while the desk is in front would otherwise go unheard, and leave the
   * widget open over a window that no longer exists.
   */
  useEffect(() => {
    if (!isOpen) return;
    return window.apps?.onGone((key) => {
      if (key !== appKey) return;
      placed.current = false;
      setIsHere(false);
      closeApp(widgetId);
    });
  }, [isOpen, appKey, widgetId, closeApp]);

  /**
   * Letting go for good: the widget was closed, its app changed, or the space
   * did. Separate from the placement effect below so that ⌃⌥D — which tears
   * that one down several times a session — never reaches this.
   */
  useEffect(() => {
    if (!isOpen || isAway) return;
    return () => {
      if (!placed.current) return;
      placed.current = false;
      setIsHere(false);
      void window.apps?.release(appKey, false);
    };
  }, [isOpen, isAway, appKey]);

  useEffect(() => {
    if (!isOpen || isAway || !isStaged) return;

    let alive = true;
    let here = false;
    // The rectangle the window was last told about, in window coordinates.
    let sent = { x: 0, y: 0, width: 0, height: 0 };
    let lastShape = '';
    let stillSince = 0;
    let movedAt = 0;

    let resyncUntil = 0;
    let outSince = 0;
    let inSince = 0;
    /** How often this window has been put back since it was placed. */
    let corrections = 0;
    /** Until when a frame change counts as the app laying out its own window. */
    let graceUntil = 0;
    /** The window is off the screen already; saying so again is just noise. */
    let steppedAside = false;
    /**
     * The placement failed outright — no accessibility, the window is on another
     * desktop. Trying again on the next tick would be a hundred failures a
     * second; the user asking again (a click, ⌃⌥D, reopening) rebuilds this
     * whole effect, which is the retry.
     */
    let blocked = false;

    /**
     * The part of the widget that is on the canvas — where the window goes. Null
     * when there is too little of it left to be worth a window.
     */
    const shownPart = (box: Box): Box | null => {
      const area = canvasArea();
      const slack = here ? HERE_SLACK : ATTACH_SLACK;
      const x = Math.max(box.x, area.x - slack);
      const y = Math.max(box.y, area.y - slack);
      const width = Math.min(box.x + box.width, area.x + area.width + slack) - x;
      const height = Math.min(box.y + box.height, area.y + area.height + slack) - y;
      if (width < MIN_SHOWN_WIDTH || height < MIN_SHOWN_HEIGHT) return null;
      return { x, y, width, height };
    };

    /** Completely inside the canvas. */
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

    /** The same rectangle, near enough that the slot counts as covered. */
    const near = (box: Box, other: Box) =>
      Math.abs(box.x - other.x) < FIT_SLACK &&
      Math.abs(box.y - other.y) < FIT_SLACK &&
      Math.abs(box.width - other.width) < FIT_SLACK &&
      Math.abs(box.height - other.height) < FIT_SLACK;

    /**
     * Gives the widget the window's position and size. Only from something the
     * user did: opening the app, or dragging the window's edge.
     *
     * Applied as the difference between the two rectangles rather than by
     * converting the window's rectangle into world coordinates — that conversion
     * needs the canvas origin (wrong while the sidebar is animating) and the
     * current camera (which may have moved since the request).
     */
    const adopt = (box: Box) => {
      // A maximised widget's stored rectangle is the size it goes back to; that
      // one is not ours to overwrite.
      if (useUiStore.getState().maximizedWidgetId === widgetId) return;
      const now = ref.current?.getBoundingClientRect();
      // Part of the widget is off the canvas, so the window is only on the part
      // that shows. Copying that back would shrink the widget to it.
      if (now && !fits(now)) return;
      const { spaces, activeSpaceId, moveWidget, resizeWidget } = useSpaceStore.getState();
      const widget = spaces[activeSpaceId]?.widgets[widgetId];
      if (!now || !widget) return;
      const { zoom } = getCamera();
      moveWidget(widgetId, widget.x + (box.x - now.x) / zoom, widget.y + (box.y - now.y) / zoom);
      resizeWidget(
        widgetId,
        widget.width + (box.width - now.width) / zoom,
        widget.height + (box.height - now.height) / zoom
      );
      sent = { ...box };
      resyncUntil = performance.now() + RESYNC_MS;
    };

    /**
     * Moves the window off screen until the widget can cover it again, keeping its
     * size. The slot stays claimed so this loop keeps running and can put the
     * window back when the widget can hold it.
     */
    const stepAside = () => {
      if (steppedAside) return;
      steppedAside = true;
      setAside(true);
      if (!here) return;
      here = false;
      setIsHere(false);
      void window.apps?.release(appKey, true);
    };

    /**
     * Handles the rectangle the window actually took. The slot counts as filled
     * only if that is the rectangle it was asked for — a bigger one covers the
     * widgets next to it.
     */
    const settle = (rect: Box, mayAdopt: boolean) => {
      corrections = 0;
      if (near(rect, sent)) return;
      // Opening it is the user asking for this app to be in the space, so the
      // widget makes room for it — that once, and never again.
      if (mayAdopt && fits(rect)) {
        adopt(rect);
        return;
      }
      // The app kept a size of its own: a minimum, or a layout it owns. The
      // window stays that size and overlaps whatever is beside it. Taking it off
      // the screen instead, or asking the user to resize the widget to match,
      // means the app they asked for is simply not there.
    };

    /**
     * `raise` brings the window to the front — every time it lands on the slot,
     * including coming back from off screen. `adopt` lets the widget take the
     * size the window came back with, and is set only for the first placement
     * after the user opened it. The two were one flag before, so every re-placement
     * counted as an opening and an app that would not shrink pushed its own size
     * back into the widget on every attempt to resize it.
     */
    const place = (box: Box, { raise, adopt: mayAdopt }: { raise: boolean; adopt: boolean }) => {
      sent = { x: box.x, y: box.y, width: box.width, height: box.height };
      const asked = getCamera();
      const { choice, onWindowTitle } = latest.current;
      void window.apps?.place(appKey, sent, choice, raise).then((result) => {
        if (!alive || !result) return;
        setPlacement(result);
        if (!result.ok) {
          // The main process has already let go of the slot, so this side does
          // too — leaving it claimed would keep the desk on the floor for a
          // window that never came. And nothing here asks again on its own: the
          // reasons a placement fails are all things only the user can change.
          here = false;
          blocked = true;
          placed.current = false;
          setIsHere(false);
          return;
        }
        if (raise) {
          graceUntil = performance.now() + OPEN_GRACE_MS;
          corrections = 0;
        }
        // Rewritten rather than kept from the first time, so a window whose title
        // changes — a different project in the same editor — stays the one this
        // widget means. Only on a change: this runs on every resize.
        const title = result.title || undefined;
        if (title !== choice.title) onWindowTitle(title);
        // The widget stopped being able to hold it while the helper was working.
        // The window has landed on a slot nobody is holding: straight back off.
        if (!here) {
          void window.apps?.release(appKey, true);
          return;
        }
        // The camera moved under the answer, so the rectangle it is about is not
        // where this widget is any more. Acting on it would either undo the zoom
        // the user just did or throw away a slot that is perfectly fine.
        const now = getCamera();
        if (now.zoom !== asked.zoom || now.x !== asked.x || now.y !== asked.y) return;
        settle(result.rect, mayAdopt);
      });
    };

    /**
     * The user took the window somewhere the widget cannot follow. It stays
     * exactly where they put it; the widget goes back to being a launcher.
     */
    const dropSlot = () => {
      here = false;
      placed.current = false;
      setIsHere(false);
      setIsAway(true);
      void window.apps?.detach(appKey);
    };

    /**
     * The window's frame changed without being asked to.
     *
     * The app window covers the widget, so **its own edges are how the widget is
     * resized**: drag the window's corner and the widget takes that size. The one
     * exception is the moment just after a placement, when the change is the app
     * restoring a frame of its own rather than the user dragging anything — that
     * gets put back, a few times at most.
     */
    const offWindowFrame = window.apps?.onWindowFrame((key, box) => {
      if (!alive || key !== appKey || !here) return;
      if (near(box, sent)) return;
      const current = ref.current?.getBoundingClientRect();
      const shown = current ? shownPart(current) : null;
      // Off the canvas already: the loop deals with it.
      if (!shown) return;
      if (performance.now() < graceUntil && corrections < MAX_CORRECTIONS) {
        corrections += 1;
        place(shown, { raise: false, adopt: false });
        return;
      }
      // The user moved or resized it. Outside the canvas the widget cannot follow,
      // so it lets the window go.
      if (!fits(box)) {
        dropSlot();
        return;
      }
      adopt(box);
    });

    const watch = () => {
      if (blocked) return;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const now = performance.now();

      // How long the widget has been the shape it is. Tracked before anything
      // else because a widget being dragged by its corner is mid-thought: the
      // window is not sent anywhere, and it is certainly not asked to come back
      // to a size the user is still on their way through.
      const shape = `${box.x},${box.y},${box.width},${box.height}`;
      if (shape !== lastShape) {
        lastShape = shape;
        stillSince = now;
      }
      const still = now - stillSince >= SETTLE_MS;
      const shown = shownPart(box);

      if (!shown) {
        inSince = 0;
        // Held rather than acted on at once: the sidebar sliding, or a zoom
        // passing through a size on its way to another, is not the user asking
        // for their window to go anywhere.
        if (!outSince) outSince = now;
        else if (now - outSince >= LEAVE_MS) stepAside();
        return;
      }
      outSince = 0;

      if (!here) {
        // Opening answers at once; coming back waits out the wobble, and waits
        // for the widget to stop being resized.
        if (placed.current) {
          if (!still) return;
          if (!inSince) inSince = now;
          if (now - inSince < REATTACH_MS) return;
        }
        inSince = 0;
        steppedAside = false;
        here = true;
        placed.current = true;
        setIsHere(true);
        setAside(false);
        place(shown, { raise: true, adopt: !answered.current });
        answered.current = true;
        return;
      }

      // The widget has just been moved to match its window; let the layout settle
      // rather than pushing the window back at whatever it lands on.
      if (now < resyncUntil) {
        sent = { ...shown };
        return;
      }

      // Zooming changes the size. One resize once it has stopped, rather than a
      // hundred on the way: the app lays its whole interface out for each one.
      if (Math.abs(shown.width - sent.width) > 0.5 || Math.abs(shown.height - sent.height) > 0.5) {
        if (still) place(shown, { raise: false, adopt: false });
        return;
      }
      // Panning only moves it, which is one cheap accessibility write.
      if (
        (Math.abs(shown.x - sent.x) > 0.5 || Math.abs(shown.y - sent.y) > 0.5) &&
        now - movedAt >= MOVE_MS
      ) {
        movedAt = now;
        sent = { ...sent, x: shown.x, y: shown.y };
        void window.apps?.move(appKey, { ...sent });
      }
    };
    watch();
    const timer = setInterval(watch, TICK_MS);

    // The window is left exactly as it is. Coming off stage is the desk moving in
    // front of it, not the widget giving it up — so coming back costs one
    // placement instead of a resize the user has to watch.
    return () => {
      alive = false;
      clearInterval(timer);
      offWindowFrame?.();
    };
  }, [isOpen, isAway, isStaged, appKey, ref, widgetId]);

  // A different app in the same widget has told us nothing yet.
  useEffect(() => {
    setPlacement(null);
    setAside(false);
    answered.current = false;
  }, [appKey]);

  /**
   * Puts the widget back on the canvas, which is what its window is waiting for.
   * The loop places it again on the next tick.
   */
  const bringBack = () => {
    const box = ref.current?.getBoundingClientRect();
    const { spaces, activeSpaceId, moveWidget } = useSpaceStore.getState();
    const widget = spaces[activeSpaceId]?.widgets[widgetId];
    if (!box || !widget) return;
    const area = canvasArea();
    const { zoom } = getCamera();
    const x = Math.min(Math.max(box.x, area.x), Math.max(area.x, area.x + area.width - box.width));
    const y = Math.min(Math.max(box.y, area.y), Math.max(area.y, area.y + area.height - box.height));
    moveWidget(widgetId, widget.x + (x - box.x) / zoom, widget.y + (y - box.y) / zoom);
    setIsAway(false);
    setAside(false);
  };

  return { isOpen, isHere, isAway, isStaged, placement, aside, bringBack };
}
