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
      const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();

      // ⌥G/⌥F do the same as G/F. They exist because a focused web page eats the
      // plain letters, and only a chord can be told apart from typing well enough
      // for the main process to forward it out of the guest. `code`, not `key`:
      // macOS turns ⌥G into '©'.
      if (e.altKey && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) {
        if (e.code === 'KeyG') {
          e.preventDefault();
          arrangeWidgets();
          return;
        }
        if (e.code === 'KeyF') {
          e.preventDefault();
          fitToWidgets();
          return;
        }
      }

      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        arrangeWidgets();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitToWidgets();
      }
    };

    // The same shortcuts, but pressed while a browser widget had focus.
    const offGuestKey = window.windowMode?.onGuestKey((key) => {
      const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();
      if (key === 'escape') useUiStore.getState().clearMaximized();
      else if (key === 'fullscreen') void window.windowMode?.toggleFullscreen();
      else if (key === 'arrange') arrangeWidgets();
      else if (key === 'fit') fitToWidgets();
    });

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      offGuestKey?.();
    };
  }, []);
}
