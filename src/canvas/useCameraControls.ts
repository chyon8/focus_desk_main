import { useEffect, useState } from 'react';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { panCamera, zoomCameraAt } from './camera';

const ZOOM_SENSITIVITY = 0.01;

/**
 * Wires pan/zoom gestures onto the viewport element.
 * - trackpad pinch (wheel + ctrlKey) or cmd+wheel: zoom at cursor
 * - plain wheel / two-finger scroll: pan
 * - space-drag or middle-drag: pan
 * Returns whether a pan gesture is available, for cursor feedback.
 */
export function useCameraControls(ref: React.RefObject<HTMLElement | null>) {
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { setCamera } = useSpaceStore.getState();
      const camera = getCamera();
      const rect = el.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.ctrlKey || e.metaKey) {
        const nextZoom = camera.zoom * Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
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
      const isPanGesture = e.button === 1 || (e.button === 0 && isSpaceHeld);
      if (!isPanGesture) return;
      e.preventDefault();
      last = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!last) return;
      useSpaceStore.getState().setCamera(panCamera(getCamera(), e.clientX - last.x, e.clientY - last.y));
      last = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!last) return;
      last = null;
      setIsPanning(false);
      el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref, isSpaceHeld]);

  return { isSpaceHeld, isPanning };
}
