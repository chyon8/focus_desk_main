import { ipcMain, session } from 'electron';
import { siteOf } from '../../src/widgets/browserAddress';

/**
 * Per-space web sessions (D-074).
 *
 * Browser and web app widgets run on `persist:space-<id>`, so every space has a
 * cookie jar of its own: the same site can be signed in as a different account
 * in each one. That has been true since the browser widget was written, and had
 * no interface at all — which made one of the few things this app does that a
 * browser cannot into a feature nobody could see or undo.
 */
export function partitionFor(spaceId: string) {
  return `persist:space-${spaceId}`;
}

/** More sites than this in one space is a list nobody reads to the end. */
const MAX_SITES = 40;

/** Shorter than this and the cookie is not carrying a sign-in worth listing. */
const MIN_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a cookie is evidence of a sign-in.
 *
 * Every site with an ad or an analytics tag leaves cookies, so counting all of
 * them lists `doubleclick.net` next to `figma.com` — 204 domains in a jar with
 * seven sites in it. Three conditions cut that to the seven:
 *
 * - `httpOnly`. Ad and tracking cookies are read by script, so they are not.
 * - an expiry some way off. A sign-in survives a restart; a session cookie does
 *   not, and neither does a one-page ad token.
 * - not `SameSite=None`. This is the one that does the work. A cookie is only
 *   sent from a page on another site if it says `None`, which is exactly what
 *   an ad network needs and a sign-in does not.
 *
 * A sign-in behind an embedded SSO frame can set `None` and would be missed. A
 * missing row costs less than sixty ad domains listed as logins.
 */
export function isLoginCookie(
  cookie: { httpOnly?: boolean; expirationDate?: number; sameSite?: string },
  now = Date.now(),
) {
  if (!cookie.httpOnly) return false;
  if (cookie.sameSite === 'no_restriction') return false;
  if (!cookie.expirationDate) return false;
  return cookie.expirationDate * 1000 - now >= MIN_LIFETIME_MS;
}

export function registerSessionIpc() {
  /**
   * Which sites this space is signed in on.
   *
   * Cookies are the evidence: a site holding one knows who you are. Not the
   * account name — no API gives that, and the panel's job is to show that the
   * jars are separate and to empty one, not to read anybody's mail.
   */
  ipcMain.handle('session:summary', async (_event, spaceId: string) => {
    const cookies = await session.fromPartition(partitionFor(spaceId)).cookies.get({});
    const counts = new Map<string, number>();
    for (const cookie of cookies) {
      if (!isLoginCookie(cookie)) continue;
      const site = siteOf(cookie.domain ?? '');
      if (!site) continue;
      counts.set(site, (counts.get(site) ?? 0) + 1);
    }
    const sites = [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_SITES)
      .map(([site]) => site);
    return { sites, total: counts.size };
  });

  /** Signs this space out of one site, leaving the rest of the jar alone. */
  ipcMain.handle('session:clear-site', async (_event, spaceId: string, site: string) => {
    const jar = session.fromPartition(partitionFor(spaceId)).cookies;
    const cookies = await jar.get({});
    for (const cookie of cookies) {
      const domain = (cookie.domain ?? '').replace(/^\./, '').toLowerCase();
      // Grouped by the same rule the panel lists them with, so clearing
      // `naver.co.kr` cannot reach into another site under `co.kr`.
      if (siteOf(domain) !== site) continue;
      // `remove` wants the URL the cookie would be sent to, which has to be
      // rebuilt: a secure cookie is not removed through http.
      const url = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path ?? '/'}`;
      await jar.remove(url, cookie.name);
    }
  });

  /** Signs this space out of everything. The other spaces are untouched. */
  ipcMain.handle('session:clear', async (_event, spaceId: string) => {
    await session.fromPartition(partitionFor(spaceId)).clearStorageData();
  });
}
