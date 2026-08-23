/**
 * The window name this shim opens with, so the main process can tell **our**
 * stand-in for a new tab apart from a popup the page opened itself.
 *
 * Those two need opposite answers: a tab becomes a new browser widget, a popup
 * has to be a real window or the sign-in that opened it sees `null` and reports
 * that popups are blocked (D-075). Nothing else distinguishes them reliably —
 * a popup may be opened with no features, or on `about:blank` with its address
 * set afterwards, which is what Google's sign-in does.
 */
export const NEW_TAB_FRAME = 'focusdesk-newtab';

/**
 * Spread onto a `<webview>` to let pages open popups.
 *
 * Written as a string because React drops `allowpopups={true}`: it is not an
 * attribute React knows to be boolean, so it never reaches the DOM — and a
 * webview without the attribute answers `window.open` with `null`, which every
 * sign-in reports as a blocked popup. `setWindowOpenHandler` is not even called,
 * so nothing in the main process can make up for it (D-075).
 *
 * The cast is because `@types/react` types the attribute `boolean`, which is the
 * shape that does not work.
 */
export const ALLOW_POPUPS = { allowpopups: '' } as unknown as { allowpopups?: boolean };

/**
 * Turns a link that wants a new tab into a real `window.open`, which the main
 * process answers with a new browser widget (D-065).
 *
 * A plain `<a target="_blank">` — which is what YouTube's description links are —
 * never reaches `setWindowOpenHandler`: the browser opens those itself, and a
 * popup from a <webview> has no one to display it, so the click does nothing at
 * all. Catching the click in the page and calling `window.open` by hand puts it
 * back on the path the main process listens to.
 *
 * Script-driven popups already take that path, so `window.open` is not replaced —
 * only captured, in case the page swaps it out later.
 *
 * Injected on every dom-ready, in the guest's own world.
 */
export const LINK_SHIM = `(() => {
  if (window.__focusDeskLinks) return;
  window.__focusDeskLinks = true;

  const open = window.open.bind(window);

  document.addEventListener(
    'click',
    (e) => {
      // Modified clicks still mean what they mean elsewhere, and anything but the
      // left button is the page's business.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // composedPath, not target: YouTube's links live inside shadow roots, where
      // the event target is the component and not the anchor.
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      const link = path.find(
        (node) => node && node.tagName === 'A' && node.target === '_blank' && node.href
      );
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      open(link.href, '${NEW_TAB_FRAME}');
    },
    true
  );
})();`;
