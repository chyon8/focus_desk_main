import { useEffect } from 'react';
import { useSpaceStore } from '../stores/spaceStore';

/** True when the user is typing, so single-letter shortcuts must not fire. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName));
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // macOS's own fullscreen chord, so it works from anywhere in the app.
      if (e.metaKey && e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        void window.windowMode?.toggleFullscreen();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

      const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        arrangeWidgets();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitToWidgets();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
