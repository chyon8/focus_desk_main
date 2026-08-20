import { useEffect } from 'react';
import { openQuickAddAtCentre } from '../app/QuickAdd';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

/** True when the user is typing, so single-letter shortcuts must not fire. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName));
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    // ⌥ makes every widget show a rim on hover, so it is clear what a click picks.
    const trackAlt = (e: KeyboardEvent) => useUiStore.getState().setAltHeld(e.altKey);
    const dropAlt = () => useUiStore.getState().setAltHeld(false);

    const onKeyDown = (e: KeyboardEvent) => {
      trackAlt(e);
      // macOS's own fullscreen chord, so it works from anywhere in the app.
      if (e.metaKey && e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        void window.windowMode?.toggleFullscreen();
        return;
      }
      // Esc backs out of things; it never destroys one. Closing a widget is the ✕
      // alone (which can be undone) — Esc did it once by accident and that was
      // enough (D-061).
      if (e.key === 'Escape') {
        const ui = useUiStore.getState();
        e.preventDefault();
        // Newest layer first, so Esc peels one thing off at a time.
        if (ui.quickAdd) ui.closeQuickAdd();
        else if (ui.isShortcutsOpen) ui.toggleShortcuts();
        else if (ui.maximizedWidgetId) ui.clearMaximized();
        else if (ui.selectedIds.length) ui.clearSelection();
        return;
      }
      const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();

      // ⌥N/⌥G/⌥F do the same as N/G/F. They exist because a focused web page eats
      // the plain letters, and only a chord can be told apart from typing well
      // enough for the main process to forward it out of the guest. `code`, not
      // `key`: macOS turns ⌥G into '©'.
      if (e.altKey && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) {
        if (e.code === 'KeyN') {
          e.preventDefault();
          openQuickAddAtCentre();
          return;
        }
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

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openQuickAddAtCentre();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        arrangeWidgets();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitToWidgets();
      } else if (e.key === '?') {
        e.preventDefault();
        useUiStore.getState().toggleShortcuts();
      }
    };

    // The same shortcuts, but pressed while a browser widget had focus.
    const offGuestKey = window.windowMode?.onGuestKey((key) => {
      const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();
      if (key === 'escape') useUiStore.getState().clearMaximized();
      else if (key === 'fullscreen') void window.windowMode?.toggleFullscreen();
      else if (key === 'add') openQuickAddAtCentre();
      else if (key === 'arrange') arrangeWidgets();
      else if (key === 'fit') fitToWidgets();
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', trackAlt);
    // Switching apps with ⌥ down never sends the keyup.
    window.addEventListener('blur', dropAlt);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', trackAlt);
      window.removeEventListener('blur', dropAlt);
      offGuestKey?.();
    };
  }, []);
}
