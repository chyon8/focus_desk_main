import { useEffect } from 'react';
import { openQuickAddAtCentre } from '../app/QuickAdd';
import { returnFocusToApp } from './appFocus';
import { stepMaximised, useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

/** True when the user is typing, so single-letter shortcuts must not fire. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName));
}

/**
 * The canvas actions, by physical key. Shared by the plain letters, their ⇧
 * twins, and the copies forwarded out of a browser widget.
 */
function runShortcut(code: string) {
  const { arrangeWidgets, fitToWidgets } = useSpaceStore.getState();
  if (code === 'KeyK') {
    useUiStore.getState().toggleLauncher();
    useSpaceStore.getState().checkHint('launcher');
  }
  else if (code === 'KeyN') openQuickAddAtCentre();
  // G moves the widgets, F only moves the camera. Two keys that sound alike and
  // do very different things, so they are labelled as the difference in the
  // shortcut sheet rather than as "Arrange" and "Fit".
  else if (code === 'KeyG') {
    arrangeWidgets();
    // The welcome line teaches this key; once it has been used it is in the way.
    useUiStore.getState().dismissNotice();
  }
  else if (code === 'KeyF') fitToWidgets();
  else if (code === 'KeyM') useUiStore.getState().toggleFullscreen();
  // [ and ] move to the widget beside this one without leaving the full screen.
  // Only while one is filling the screen: on the canvas the widget is already
  // there to click, and the keys stay free for a page that wants them.
  else if (code === 'BracketLeft') return stepFullScreen(-1);
  else if (code === 'BracketRight') return stepFullScreen(1);
  else return false;
  return true;
}

/** False when there is nowhere to step, so the key stays the canvas's to ignore. */
function stepFullScreen(delta: 1 | -1) {
  const { maximizedWidgetId, toggleMaximized } = useUiStore.getState();
  if (!maximizedWidgetId) return false;
  const { spaces, activeSpaceId } = useSpaceStore.getState();
  const space = spaces[activeSpaceId];
  const next = space && stepMaximised(space, maximizedWidgetId, delta);
  if (!next) return false;
  // `toggleMaximized` sets it, since the id differs from the one showing.
  toggleMaximized(next);
  // The page being left still holds the keyboard, and it is behind the new one
  // now — without this, Esc and the next [ go to a widget nobody can see.
  returnFocusToApp();
  return true;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    // ⌥ makes every widget show a rim on hover, so it is clear what a click picks.
    const trackAlt = (e: KeyboardEvent) => useUiStore.getState().setAltHeld(e.altKey);
    const dropAlt = () => useUiStore.getState().setAltHeld(false);

    const onKeyDown = (e: KeyboardEvent) => {
      trackAlt(e);
      // Esc backs out of things; it never destroys one. Closing a widget is the ✕
      // alone (which can be undone) — Esc did it once by accident and that was
      // enough (D-061).
      if (e.key === 'Escape') {
        const ui = useUiStore.getState();
        e.preventDefault();
        // Newest layer first, so Esc peels one thing off at a time.
        if (ui.isLauncherOpen) ui.closeLauncher();
        else if (ui.isMoveMenuOpen) ui.closeMoveMenu();
        else if (ui.quickAdd) ui.closeQuickAdd();
        else if (ui.isShortcutsOpen) ui.toggleShortcuts();
        else if (ui.openDock) ui.closeDock();
        else if (ui.peekWidgetId) ui.closePeek();
        else if (ui.maximizedWidgetId) ui.clearMaximized();
        else ui.clearSelection();
        // Always, whatever layer came off. A field or a page holding the
        // keyboard is invisible — the shortcuts simply stop working and nothing
        // says why — so Esc is the one key guaranteed to hand it back.
        returnFocusToApp();
        return;
      }

      // ⌘D copies the widgets that are picked out. With nothing picked there is
      // no target to guess at — the copy button in a widget's header covers that.
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD' && !isTyping(e.target)) {
        const { selectedIds } = useUiStore.getState();
        if (selectedIds.length) {
          e.preventDefault();
          useSpaceStore.getState().duplicateWidgets(selectedIds);
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

      // K·N·G·F·M and [·], with or without ⇧. The plain keys are for the canvas; ⇧ makes
      // the same shortcut reachable from inside a web page, where a plain letter
      // is something the page is being typed into (the main process forwards the
      // ⇧ ones back out of the guest).
      //
      // `code`, not `key`: a Korean or Japanese input source does not report 'g',
      // and ⇧G is 'G' only on a Latin layout (D-078).
      if (runShortcut(e.code)) {
        e.preventDefault();
        return;
      }

      if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
        e.preventDefault();
        useUiStore.getState().toggleShortcuts();
      }
    };

    // The same shortcuts, but pressed while a browser widget had focus.
    const offGuestKey = window.windowMode?.onGuestKey((key) => {
      if (key === 'escape') {
        const ui = useUiStore.getState();
        // Esc pressed inside a page: the same peel-one-layer-off order as above,
        // and the keyboard comes back to the app either way.
        if (ui.peekWidgetId) ui.closePeek();
        else ui.clearMaximized();
        returnFocusToApp();
      } else runShortcut(key);
    });

    // ⇧[ and ⇧] are typed as `{` and `}`, so the main process only takes them out
    // of a page while a widget is filling the screen (`window-mode.ts`).
    const offMaximized = useUiStore.subscribe((s, prev) => {
      const full = s.maximizedWidgetId !== null;
      if (full !== (prev.maximizedWidgetId !== null)) void window.windowMode?.setMaximized(full);
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
      offMaximized();
    };
  }, []);
}
