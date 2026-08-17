import { useEffect } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { usableDelta } from './spaceTime';

const TICK_MS = 1_000;

/**
 * Counts how long the user spends in each space, and only while they are here:
 * the clock runs when the app's window has focus and the machine is awake, and
 * stops the moment they look at something else (see electron/ipc/activity.ts).
 *
 * Every tick reads the space and the date afresh, so switching spaces and
 * crossing midnight need no handling of their own. Time is banked in whole
 * seconds with the remainder carried, so a drifting interval loses nothing.
 *
 * Mount once, from App.
 */
export function useSpaceTimeTracker() {
  useEffect(() => {
    // Assume we are here until told otherwise: the window normally opens focused,
    // and the real state arrives from the main process a moment later.
    let isHere = true;
    let lastTick = Date.now();
    let carry = 0;

    const bank = () => {
      const now = Date.now();
      const delta = usableDelta(now, lastTick);
      lastTick = now;
      if (!isHere) return;

      carry += delta / 1000;
      const seconds = Math.floor(carry);
      if (seconds <= 0) return;
      carry -= seconds;

      const { isLoaded, activeSpaceId } = useSpaceStore.getState();
      if (!isLoaded || !activeSpaceId) return;
      useSpaceTimeStore.getState().add(activeSpaceId, seconds);
    };

    const setHere = (next: boolean) => {
      if (next === isHere) return;
      bank(); // Close the stretch that just ended before flipping.
      isHere = next;
      lastTick = Date.now();
      carry = 0;
      // Leaving is the last thing that happens before most quits.
      if (!next) useSpaceTimeStore.getState().flush();
    };

    const interval = setInterval(bank, TICK_MS);

    // The window's own focus, not the document's — a click inside a browser
    // widget moves document focus into that page while the app stays in front.
    let sawEvent = false;
    const unsubscribe = window.activity?.onChange((active) => {
      sawEvent = true;
      setHere(active);
    });
    void window.activity?.state().then((active) => {
      if (!sawEvent) setHere(active); // A live event always beats this answer.
    });

    // Plain-browser fallback (no preload): page focus is all there is.
    const onFocus = () => setHere(true);
    const onBlur = () => setHere(false);
    const onVisibility = () => setHere(!document.hidden);
    if (!window.activity) {
      window.addEventListener('focus', onFocus);
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibility);
    }

    const onUnload = () => {
      bank();
      useSpaceTimeStore.getState().flush();
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(interval);
      unsubscribe?.();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      onUnload();
    };
  }, []);
}
