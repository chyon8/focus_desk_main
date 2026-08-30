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
