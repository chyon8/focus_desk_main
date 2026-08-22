import { useEffect, useMemo } from 'react';
import { useActiveSpace, useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
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
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  // The keys are sorted, so this string only changes when the set really does —
  // renaming a space or dragging a widget must not resend.
  const keys = useMemo(() => spaceAppKeys(space).join('\n'), [space]);

  useEffect(() => {
    void window.apps?.setSpaceApps(keys ? keys.split('\n') : []);
  }, [keys]);

  // Open apps belong to the space they were opened in: leaving closes them, which
  // gives their windows their own size back rather than stranding them over
  // another space's widgets.
  useEffect(() => useUiStore.getState().closeAllApps, [spaceId]);

  // Which of the two states the desk is in (D-071). Held in one place and read
  // by every app widget: it is a property of the desk, not of any one window.
  useEffect(() => {
    const { setStaged } = useUiStore.getState();
    void window.apps?.staged().then(setStaged);
    return window.apps?.onStaged(setStaged);
  }, []);
}
