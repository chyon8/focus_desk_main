import { useEffect } from 'react';
import { spaceAppKeys } from '../apps/spaceApps';
import { useAppTimeStore } from '../stores/appTimeStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { usableDelta } from './spaceTime';

const TICK_MS = 1_000;

/**
 * Counts how long the user spends in each space, and only while they are here:
 * the clock runs when the app's window has focus — or one of the space's own
 * apps is in front — and the machine is awake (see electron/ipc/activity.ts).
 *
 * Every tick reads the space and the date afresh, so switching spaces and
 * crossing midnight need no handling of their own. Time is banked in whole
 * seconds with the remainder carried, so a drifting interval loses nothing.
 *
 * The same seconds are also banked against the app in front, when it is one the
 * space claims (D-039). One loop feeds both, so the breakdown can never drift
 * from the total it breaks down.
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
    let frontmostApp: string | null = null;

    const bank = () => {
      const now = Date.now();
      const delta = usableDelta(now, lastTick);
      lastTick = now;
      if (!isHere) return;

      carry += delta / 1000;
      const seconds = Math.floor(carry);
      if (seconds <= 0) return;
      carry -= seconds;

      const { isLoaded, activeSpaceId, spaces } = useSpaceStore.getState();
      if (!isLoaded || !activeSpaceId) return;
      useSpaceTimeStore.getState().add(activeSpaceId, seconds);

      // Anything not attributed to an app is Focus Desk's own share, worked out
      // as the remainder when the breakdown is read.
      if (!frontmostApp) return;
      if (!spaceAppKeys(spaces[activeSpaceId]).includes(frontmostApp)) return;
      useAppTimeStore.getState().add(activeSpaceId, frontmostApp, seconds);
    };

    const setHere = (next: boolean) => {
      if (next === isHere) return;
      bank(); // Close the stretch that just ended before flipping.
      isHere = next;
      lastTick = Date.now();
      carry = 0;
      // Leaving is the last thing that happens before most quits.
      if (!next) {
        useSpaceTimeStore.getState().flush();
        useAppTimeStore.getState().flush();
      }
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

    // Which app the seconds belong to. Close the stretch first, so a switch does
    // not hand the previous app's seconds to the new one.
    const unwatchApp = window.apps?.onFrontmost((appKey) => {
      bank();
      frontmostApp = appKey;
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
      useAppTimeStore.getState().flush();
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(interval);
      unsubscribe?.();
      unwatchApp?.();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      onUnload();
    };
  }, []);
}
