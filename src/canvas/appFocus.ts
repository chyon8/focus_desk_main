/**
 * Takes the keyboard back from a page.
 *
 * A `<webview>` holding focus gets every key press, and the app's own shortcuts
 * are window listeners that never run. The main process forwards Esc and the ⇧
 * copies back out of a guest, so those still work — but G, F, K, N and M are
 * plain letters the page is entitled to keep, and after backing out of a
 * maximised page nothing gave the focus back. The shortcuts stayed dead until
 * the user happened to click the canvas.
 *
 * Blurring is what returns it: the guest is an element in this document, so the
 * window is the next thing in line. `document.body.focus()` is not enough on its
 * own — the body is not focusable — so the blur has to happen first.
 */
export function returnFocusToApp() {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return;
  // A page, a text field, or anything else holding it: all three stop the
  // shortcuts, and none of them look any different from the app being ready.
  if (
    active.tagName === 'WEBVIEW' ||
    active.isContentEditable ||
    /^(INPUT|TEXTAREA)$/.test(active.tagName)
  ) {
    active.blur();
  }
}
