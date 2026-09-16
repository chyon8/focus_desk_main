/** Where a typed word that is not an address goes. */
const SEARCH_URL = 'https://www.google.com/search?q=';

/**
 * Schemes worth following from the address bar. Anything else typed with a colon
 * in it — `10:30`, `note: buy milk` — is a search, not a protocol.
 */
const KNOWN_SCHEME = /^(https?|file|about|data):/i;

/**
 * The last label of a host, loosely. Not a public-suffix list: this only has to
 * separate "the user typed a website" from "the user typed words", and a made-up
 * TLD they typed on purpose still resolves or fails in the page, where the error
 * belongs.
 */
const HOSTISH = /^[a-z0-9-]+(\.[a-z0-9-]+)+\.?(:\d+)?(\/|\?|#|$)/i;
const LOCALHOSTISH = /^localhost(:\d+)?(\/|\?|#|$)/i;
/** A bare IPv4, with or without a port. */
const IPISH = /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|\?|#|$)/;

/**
 * What the address bar does with what was typed (D-075).
 *
 * `youtube.com` is a website, `youtube` is a search, and `https://…` is itself.
 * Requiring a scheme — which is what this used to do — made the bar useless for
 * the one thing people type into address bars, and requiring an address made it
 * useless for the other.
 */
export function toAddress(input: string): string {
  const text = input.trim();
  if (!text) return '';

  if (KNOWN_SCHEME.test(text)) return text;

  // A space rules out a host, whatever else it looks like.
  if (!/\s/.test(text) && (HOSTISH.test(text) || LOCALHOSTISH.test(text) || IPISH.test(text))) {
    return `https://${text}`;
  }

  return SEARCH_URL + encodeURIComponent(text);
}

/** The host, for labelling a page without repeating its whole address. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Labels that carry no name of their own: `naver.co.kr` collapses to `co.kr`
 * under a plain last-two-labels rule, and `co.kr` is not a site anybody signed
 * in to. Not a public-suffix implementation — the full list is thousands of
 * entries and this is a label in a panel.
 */
const SECOND_LEVEL = new Set(['co', 'com', 'ne', 'net', 'or', 'org', 'ac', 'go', 'gov', 'edu']);

/**
 * The host grouped down to the site a person would name: `www.figma.com` and
 * `figma.com` are one place to them. The last two labels, or three when the last
 * is a two-letter country code sitting behind one of the labels above.
 *
 * Used by the sign-ins panel on both sides — the main process groups the cookie
 * jar with it, the panel matches open widgets to a row with it.
 */
export function siteOf(host: string) {
  const bare = host.replace(/^\./, '').toLowerCase();
  const parts = bare.split('.');
  if (parts.length <= 2) return bare;
  const country = parts[parts.length - 1].length === 2;
  const keep = country && SECOND_LEVEL.has(parts[parts.length - 2]) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

/**
 * Google's per-visit search parameters. They are issued for one request from one
 * network address and mean nothing on the next load — sent again later, from
 * another address, they are what Google's "unusual traffic" page reports as
 * `IP주소: A ≠ B`. `q` and the other parameters that say what was searched stay.
 */
const GOOGLE_VISIT_PARAMS = new Set([
  'ei', 'sei', 'sxsrf', 'iflsig', 'ved', 'uact', 'gs_lp', 'gs_lcrp', 'oq', 'sclient',
  'source', 'sca_esv', 'aqs', 'sourceid', 'ie', 'zx', 'no_sw_cr', 'biw', 'bih', 'dpr',
]);

const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i;

/**
 * The address a browser widget keeps for next time.
 *
 * A widget reopens the address it saved, on every launch and every switch into
 * its space. It used to save whatever the page was on, and that included Google's
 * block page: one "unusual traffic" page on 2026-08-29 was saved as
 * `/sorry/index?continue=…`, and that address — bound to the request it was
 * issued for — showed the block page again every time the space opened
 * (2026-09-13). What is kept instead:
 *
 * - a block or challenge page: the page it was guarding (`continue`), not itself
 * - Anubis's proof-of-work page (`/.within.website/…`, on Unsplash): the page it
 *   was guarding (`redir`). Saved as itself on 2026-09-16, so the widget opened
 *   on the check every time
 * - a Google search: without the per-visit parameters above
 * - Cloudflare's challenge parameters (`__cf_chl_*`): dropped for the same reason
 */
export function addressToSave(url: string): string {
  let address: URL;
  try {
    address = new URL(url);
  } catch {
    return url;
  }
  const google = GOOGLE_HOST.test(address.hostname);

  if (google && address.pathname.startsWith('/sorry/')) {
    const next = address.searchParams.get('continue');
    return next && !next.includes('/sorry/') ? addressToSave(next) : `${address.origin}/`;
  }

  if (address.pathname.startsWith('/.within.website')) {
    const next = address.searchParams.get('redir');
    if (!next) return `${address.origin}/`;
    try {
      const guarded = new URL(next, address.origin);
      // Only a page on the same site: `redir` is whatever the query says.
      if (guarded.origin === address.origin && !guarded.pathname.startsWith('/.within.website')) {
        return addressToSave(guarded.toString());
      }
    } catch {
      // A redir that is not an address falls through to the home page.
    }
    return `${address.origin}/`;
  }

  let changed = false;
  for (const key of [...address.searchParams.keys()]) {
    const visitOnly =
      key.startsWith('__cf_chl_') ||
      (google && address.pathname === '/search' && GOOGLE_VISIT_PARAMS.has(key));
    if (visitOnly) {
      address.searchParams.delete(key);
      changed = true;
    }
  }
  return changed ? address.toString() : url;
}
