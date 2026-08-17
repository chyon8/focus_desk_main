import { useEffect, useMemo } from 'react';
import { useActiveSpace } from '../stores/spaceStore';
import { spaceAppKeys } from './spaceApps';

/**
 * Keeps the main process told which apps the current space claims, so it can
 * judge whether the user is still at the desk while one of them is in front
 * (D-039), and opens those apps as the space is entered (D-046). Mount once,
 * from App.
 */
export function useSpaceApps() {
  const space = useActiveSpace();
  // The keys are sorted, so this string only changes when the set really does —
  // renaming a space or dragging a widget must not resend.
  const keys = useMemo(() => spaceAppKeys(space).join('\n'), [space]);

  useEffect(() => {
    const appKeys = keys ? keys.split('\n') : [];
    void window.apps?.setSpaceApps(appKeys);
    // Opening a space is opening the project, so its apps come up with it —
    // in the background, since the point of switching to a space is to be in
    // it, not in the last app that finished starting.
    for (const appKey of appKeys) void window.apps?.launch(appKey, false);
  }, [keys]);
}
