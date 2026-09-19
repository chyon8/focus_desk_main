import type { Session, WebContents } from 'electron';

/**
 * The brand headers and `navigator.userAgentData` Chrome has and Electron does
 * not.
 *
 * Chrome sends three request headers on every navigation — `Sec-Ch-Ua`,
 * `Sec-Ch-Ua-Mobile`, `Sec-Ch-Ua-Platform` — and reports the same brands to the
 * page. Electron sends none of them and leaves "Google Chrome" out of the
 * brands. That code sits in Chrome's own layer, not in the part Electron is
 * built on: measured 2026-09-19 on Electron 44, an untouched Electron omits the
 * headers too, and they stay missing even after the brands below are set. So it
 * is not a side effect of the agent string main.ts writes, and there is no
 * setting for it — the headers have to be added by hand.
 *
 * An agent that says `Chrome/152` and sends no brand headers is a browser
 * nobody has, which is the kind of thing a bot check looks for. Both halves are
 * set here so they agree with each other and with the agent string.
 */

const CHROME_VERSION = process.versions.chrome;
const CHROME_MAJOR = CHROME_VERSION.split('.')[0];

/**
 * What Chrome reports, in Chrome's order (measured alongside Chrome 152).
 *
 * The middle entry is deliberate nonsense that changes with the Chromium
 * version, there so sites cannot hard-code the list. It is copied from what
 * this Electron reports for itself (`Not?A_Brand`, 24) rather than guessed —
 * same Chromium, same entry. It needs checking again when Electron is raised.
 */
const BRANDS = [
  { brand: 'Chromium', version: CHROME_MAJOR },
  { brand: 'Not?A_Brand', version: '24' },
  { brand: 'Google Chrome', version: CHROME_MAJOR },
];

const HEADER = BRANDS.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');

/** Sessions already hooked. One listener per session is all Electron keeps. */
const hooked = new WeakSet<Session>();

function addHeaders(session: Session) {
  if (hooked.has(session)) return;
  hooked.add(session);
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = details.requestHeaders;
    requestHeaders['sec-ch-ua'] = HEADER;
    requestHeaders['sec-ch-ua-mobile'] = '?0';
    requestHeaders['sec-ch-ua-platform'] = '"macOS"';
    callback({ requestHeaders });
  });
}

/**
 * The brands a page reads, set through the debugger because Electron has no API
 * for them. This is Chromium's own mechanism — the values are really changed,
 * rather than a script rewriting `navigator` after the fact, which a page can
 * see — and it leaves `navigator.webdriver` false.
 *
 * The command needs a renderer to answer, and a guest that has not loaded
 * anything yet has none: sent too early it never returns. So it goes on the
 * first load, which is `about:blank` before the widget's own address.
 */
function setBrands(contents: WebContents) {
  try {
    contents.debugger.attach('1.3');
  } catch {
    // Already attached — DevTools, or this running twice on one guest.
    return;
  }
  contents.debugger
    .sendCommand('Emulation.setUserAgentOverride', {
      // The agent string is app.userAgentFallback's; repeating it here keeps the
      // command from replacing it with Electron's own.
      userAgent: contents.getUserAgent(),
      userAgentMetadata: {
        brands: BRANDS,
        fullVersionList: BRANDS.map((b) => ({
          brand: b.brand,
          version: b.brand === 'Not?A_Brand' ? '24.0.0.0' : CHROME_VERSION,
        })),
        fullVersion: CHROME_VERSION,
        platform: 'macOS',
        platformVersion: process.getSystemVersion(),
        architecture: process.arch === 'arm64' ? 'arm' : 'x86',
        model: '',
        mobile: false,
        bitness: '64',
        wow64: false,
      },
    })
    .catch(() => {
      // A guest closed mid-command. Nothing to do: it is gone.
    });
}

/** Call for every browser widget and popup, as it is created. */
export function matchChromeBrands(contents: WebContents) {
  addHeaders(contents.session);
  if (contents.getURL()) setBrands(contents);
  else contents.once('did-start-loading', () => setBrands(contents));
}
