import { useEffect } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

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
      // Esc leaves a maximised widget, even from inside a text field.
      if (e.key === 'Escape' && useUiStore.getState().maximizedWidgetId) {
        e.preventDefault();
        useUiStore.getState().clearMaximized();
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

    // Same two escapes, but pressed while a browser widget had focus.
    const offGuestKey = window.windowMode?.onGuestKey((key) => {
      if (key === 'escape') useUiStore.getState().clearMaximized();
      else if (key === 'fullscreen') void window.windowMode?.toggleFullscreen();
    });

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      offGuestKey?.();
    };
  }, []);
}
