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
      open(link.href, '_blank');
    },
    true
  );
})();`;
