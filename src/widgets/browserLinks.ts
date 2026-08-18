/**
 * Makes a link that wants a new window open in this widget instead.
 *
 * The main process already answers `window.open` for guests (D-055), but a plain
 * `<a target="_blank">` — which is what YouTube's description links are — never
 * gets that far: the browser opens those itself, and a popup from a <webview>
 * has no one to display it, so the click does nothing at all. This closes it in
 * the page, where the click actually is, and so does not depend on `allowpopups`
 * or on the popup being created in the first place.
 *
 * Injected on every dom-ready, in the guest's own world.
 */
export const LINK_SHIM = `(() => {
  if (window.__focusDeskLinks) return;
  window.__focusDeskLinks = true;

  const go = (url) => {
    if (url) location.href = String(url);
  };

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
      go(link.href);
    },
    true
  );

  // The other half: pages that open windows from script rather than from markup.
  window.open = (url) => {
    go(url);
    return null;
  };
})();`;
