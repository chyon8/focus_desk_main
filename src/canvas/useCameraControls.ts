import { useEffect, useState } from 'react';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { panCamera, zoomCameraAt } from './camera';

const ZOOM_SENSITIVITY = 0.01;
/** How much one notch of a mouse wheel zooms. */
const NOTCH_ZOOM = 1.1;
/** A gap this long ends the scroll; the next event decides the device again. */
const BURST_GAP_MS = 200;

/**
 * A mouse wheel and a trackpad's two fingers arrive as the same event, and want
 * opposite things: the wheel only scrolls one axis, so it is worth more as zoom,
 * while two fingers pan both axes and pinch already zooms.
 *
 * Measured on this machine (2026-08-29): every mouse event had `deltaX === 0`
 * and a `wheelDeltaY` that was a multiple of 120; the trackpad had a nonzero
 * `deltaX` in 87 of 92 events and hit a multiple of 120 three times. So the test
 * never misreads a mouse, and the few trackpad events it could misread are ruled
 * out by deciding once per scroll rather than per event.
 */
export function looksLikeMouse(e: Pick<WheelEvent, 'deltaX'> & { wheelDeltaY?: number }) {
  const notches = e.wheelDeltaY ?? 0;
  return e.deltaX === 0 && notches !== 0 && notches % 120 === 0;
}

/**
 * Wires pan/zoom gestures onto the viewport element.
 * - trackpad pinch (wheel + ctrlKey) or cmd+wheel: zoom at cursor
 * - mouse wheel: zoom at cursor; ⇧ + mouse wheel pans instead
 * - trackpad two-finger scroll: pan
 * - space-drag or middle-drag: pan
 * Returns whether a pan gesture is available, for cursor feedback.
 */
export function useCameraControls(ref: React.RefObject<HTMLElement | null>) {
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Decided once per scroll and held until the hand comes off, so one stray
    // event cannot flip a trackpad pan into a zoom halfway through.
    let isMouse = false;
    let lastWheelAt = -Infinity;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { setCamera } = useSpaceStore.getState();
      const camera = getCamera();
      const rect = el.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.timeStamp - lastWheelAt > BURST_GAP_MS) isMouse = looksLikeMouse(e);
      lastWheelAt = e.timeStamp;

      // ⇧ turns the wheel back into scrolling, on whichever axis the browser put
      // it — macOS hands a shifted wheel over as deltaX.
      if (isMouse && e.shiftKey) {
        setCamera(panCamera(camera, 0, -(e.deltaY || e.deltaX)));
        return;
      }

      if (isMouse || e.ctrlKey || e.metaKey) {
        // A wheel's own deltaY is far too large for the trackpad's formula — one
        // notch reads as 120 and a fast spin as 681, which would black out the
        // canvas in a single event. Notches are what a wheel actually reports.
        const notches = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY ?? 0;
        const nextZoom = isMouse
          ? camera.zoom * Math.pow(NOTCH_ZOOM, notches / 120)
          : camera.zoom * Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
        setCamera(zoomCameraAt(camera, cursor, nextZoom));
      } else {
        setCamera(panCamera(camera, -e.deltaX, -e.deltaY));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Don't hijack space while typing in a widget.
        const target = e.target as HTMLElement;
        if (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let last: { x: number; y: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      // Right button too: a mouse then pans with one finger and no key held, which
      // left-drag cannot do — that draws the selection band (D-087). Nothing else
      // uses a right-click on the canvas; the page menu is the webview's own.
      const isPanGesture = e.button === 1 || e.button === 2 || (e.button === 0 && isSpaceHeld);
      if (!isPanGesture) return;
      e.preventDefault();
      last = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!last) return;
      // A pan whose release went astray would otherwise carry on under a bare
      // hover, sliding the whole space around.
      if (e.buttons === 0) {
        last = null;
        setIsPanning(false);
        return;
      }
      useSpaceStore.getState().setCamera(panCamera(getCamera(), e.clientX - last.x, e.clientY - last.y));
      last = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!last) return;
      last = null;
      setIsPanning(false);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    const onLostCapture = () => {
      last = null;
      setIsPanning(false);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('lostpointercapture', onLostCapture);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('lostpointercapture', onLostCapture);
    };
  }, [ref, isSpaceHeld]);

  return { isSpaceHeld, isPanning };
}
