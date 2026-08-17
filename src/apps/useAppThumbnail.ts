import { RefObject, useEffect, useState } from 'react';

/** Slow on purpose: this is a glance at the app, not a video feed. */
const INTERVAL_MS = 1_000;
/** Bounds the payload — a 5K window downscaled to this is still more than enough. */
const MAX_WIDTH = 1_600;
const MIN_WIDTH = 240;

/**
 * A live thumbnail of the app's window, refreshed while the widget can be seen
 * (D-038). Null means there is nothing to show — the app is not running, has no
 * window, or screen recording has not been allowed — and the caller falls back
 * to the app's icon.
 *
 * Frames are only asked for while this window has focus. With Focus Desk behind
 * a full-screen app, nobody is looking at the thumbnail, and it refreshes within
 * a second of coming back.
 *
 * The frame is requested at the size it will actually be drawn at, measured from
 * the element and multiplied by the device pixel ratio: the rect already carries
 * the camera's zoom, so zooming in asks for a sharper frame rather than blowing
 * up the one it has.
 */
export function useAppThumbnail(
  appKey: string,
  enabled: boolean,
  ref: RefObject<HTMLElement | null>
) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !appKey || !window.apps) {
      setImage(null);
      return;
    }

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (document.hasFocus() && !document.hidden) {
        const box = ref.current?.getBoundingClientRect();
        const width = Math.round((box?.width ?? MIN_WIDTH) * window.devicePixelRatio);
        const next = await window.apps!.capture(
          appKey,
          Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
        );
        if (!alive) return;
        setImage(next);
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };
    void tick();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [appKey, enabled, ref]);

  return image;
}
