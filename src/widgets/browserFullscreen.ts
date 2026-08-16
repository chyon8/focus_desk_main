/**
 * Keeps a page's fullscreen inside its widget.
 *
 * Electron's real fullscreen is all-or-nothing: a video going fullscreen inside a
 * <webview> takes the whole window with it, and putting the window back drops the
 * guest out of fullscreen again — the two are coupled. So the guest gets a
 * fullscreen API of our own: the player still switches to its fullscreen layout,
 * but "the screen" is the widget (D-031).
 *
 * Injected on every dom-ready, in the guest's own world.
 */
export const FULLSCREEN_SHIM = `(() => {
  if (window.__focusDeskFullscreen) return;
  window.__focusDeskFullscreen = true;

  let current = null;
  const fire = () => {
    for (const type of ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange']) {
      document.dispatchEvent(new Event(type, { bubbles: true }));
      if (current) current.dispatchEvent(new Event(type, { bubbles: true }));
    }
  };

  function enter() {
    current = this;
    this.classList.add('__focusdesk-fullscreen');
    fire();
    return Promise.resolve();
  }
  const exit = () => {
    if (current) {
      current.classList.remove('__focusdesk-fullscreen');
      current = null;
      fire();
    }
    return Promise.resolve();
  };

  // Every spelling a player might reach for. Missing one hands that page the real
  // fullscreen, which drags the whole window with it — YouTube uses the capital-S
  // WebKit alias.
  for (const name of [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'webkitRequestFullScreen',
    'mozRequestFullScreen',
    'msRequestFullscreen',
  ]) {
    Element.prototype[name] = enter;
  }
  if (window.HTMLVideoElement) {
    HTMLVideoElement.prototype.webkitEnterFullscreen = enter;
    HTMLVideoElement.prototype.webkitExitFullscreen = exit;
  }

  for (const name of [
    'exitFullscreen',
    'webkitExitFullscreen',
    'webkitCancelFullScreen',
    'mozCancelFullScreen',
    'msExitFullscreen',
  ]) {
    document[name] = exit;
  }

  const element = { get: () => current, configurable: true };
  for (const name of [
    'fullscreenElement',
    'webkitFullscreenElement',
    'webkitCurrentFullScreenElement',
    'mozFullScreenElement',
    'msFullscreenElement',
  ]) {
    Object.defineProperty(document, name, element);
  }

  const enabled = { get: () => true, configurable: true };
  for (const name of ['fullscreenEnabled', 'webkitFullscreenEnabled', 'mozFullScreenEnabled']) {
    Object.defineProperty(document, name, enabled);
  }

  // Players usually call exitFullscreen themselves, but not all of them do.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') exit(); }, true);
})();`;

// 100vw/100vh is the widget, because that is the guest's whole viewport.
export const FULLSCREEN_CSS = `.__focusdesk-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  z-index: 2147483647 !important;
  background: #000 !important;
}`;
