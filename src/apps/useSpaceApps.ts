import { useEffect, useMemo } from 'react';
import { useActiveSpace } from '../stores/spaceStore';
import { spaceAppKeys } from './spaceApps';

/**
 * Keeps the main process told which apps the current space claims, so it can
 * judge whether the user is still at the desk while one of them is in front
 * (D-039). Mount once, from App.
 *
 * Entering a space does NOT launch its apps (D-046 reversed): a heavy app coming
 * up unasked is worse than a widget waiting to be clicked.
 */
export function useSpaceApps() {
  const space = useActiveSpace();
  // The keys are sorted, so this string only changes when the set really does —
  // renaming a space or dragging a widget must not resend.
  const keys = useMemo(() => spaceAppKeys(space).join('\n'), [space]);

  useEffect(() => {
    void window.apps?.setSpaceApps(keys ? keys.split('\n') : []);
  }, [keys]);
}
