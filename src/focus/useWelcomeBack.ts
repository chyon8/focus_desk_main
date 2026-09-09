import { useEffect, useRef } from 'react';
import { formatDuration } from './stats';
import { isYesterday, lastVisit } from './spaceTime';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { useUiStore } from '../stores/uiStore';

/**
 * The line somebody sees on the run after their first: where they were last
 * time, and for how long.
 *
 * It is what the desk knows that a fresh window does not. There is no second
 * onboarding to run, and a first run has no history, so this shows up by itself
 * exactly once the history exists.
 *
 * Sticky, and it offers the way back: the point is to be picked up where it was
 * left, and a line that times out is one that has to be read in time.
 */
export function useWelcomeBack() {
  // Once per run, whatever else re-runs this effect.
  const shown = useRef(false);

  const spacesLoaded = useSpaceStore((s) => s.isLoaded);
  const timeLoaded = useSpaceTimeStore((s) => s.isLoaded);

  useEffect(() => {
    if (shown.current || !spacesLoaded || !timeLoaded) return;
    const { spaces, activeSpaceId, needsOnboarding, setActiveSpace } = useSpaceStore.getState();
    if (needsOnboarding) return;

    const visit = lastVisit(useSpaceTimeStore.getState().time);
    // A space that has since been deleted has nothing to go back to.
    const space = visit && spaces[visit.spaceId];
    if (!visit || !space) return;

    shown.current = true;
    const when = isYesterday(visit.date) ? 'Yesterday' : 'Last time';
    useUiStore
      .getState()
      .showNotice(
        `${when} you spent ${formatDuration(visit.seconds)} in ${space.name}.`,
        // Already standing in it: the line still says what happened, but there is
        // nowhere to send anybody.
        visit.spaceId === activeSpaceId
          ? undefined
          : { label: 'Go there', run: () => setActiveSpace(visit.spaceId) },
        true
      );
  }, [spacesLoaded, timeLoaded]);
}
