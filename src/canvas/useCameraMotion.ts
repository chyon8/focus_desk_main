import { useEffect, useRef, useState } from 'react';
import type { Camera } from './camera';

/** How long after the last camera change the world counts as standing still. */
const STILL_MS = 140;

/**
 * True while the camera is being moved.
 *
 * Panning and zooming want the world on its own composited layer, so the GPU can
 * transform it without repainting. Standing still wants the opposite: a promoted
 * layer is rasterised once and then scaled, so zooming in enlarges a bitmap of
 * the text instead of redrawing it, and everything goes soft. Dropping the hint
 * once the camera settles makes the browser repaint at the new scale.
 */
export function useCameraMotion(camera: Camera) {
  const [isMoving, setMoving] = useState(false);
  const isFirstRender = useRef(true);

  // Primitive deps: the store hands out a new camera object on every change,
  // including ones that do not move it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), STILL_MS);
    return () => clearTimeout(timer);
  }, [camera.x, camera.y, camera.zoom]);

  return isMoving;
}
