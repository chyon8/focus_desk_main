import { ipcMain, session } from 'electron';

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

/**
 * `www.figma.com` and `figma.com` are one sign-in to a person, so the list is
 * grouped by the last two labels. Not a public-suffix implementation: this is a
 * label in a panel, and getting `co.uk` slightly wrong costs nothing.
 */
function siteOf(domain: string) {
  const host = domain.replace(/^\./, '');
  const parts = host.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : host;
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
      const domain = (cookie.domain ?? '').replace(/^\./, '');
      if (domain !== site && !domain.endsWith(`.${site}`)) continue;
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
