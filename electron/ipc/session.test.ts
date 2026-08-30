import { describe, expect, it, vi } from 'vitest';

// The module reaches for electron at import; the two functions under test are
// plain and never touch it.
vi.mock('electron', () => ({
  ipcMain: { handle: () => {} },
  session: {},
}));

const { isLoginCookie } = await import('./session');
const { siteOf } = await import('../../src/widgets/browserAddress');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 1);
/** A cookie expiring `days` from NOW, in seconds since epoch as electron gives it. */
const expiring = (days: number) => (NOW + days * DAY) / 1000;

describe('siteOf', () => {
  it('groups subdomains under one site', () => {
    expect(siteOf('www.figma.com')).toBe('figma.com');
    expect(siteOf('.figma.com')).toBe('figma.com');
    expect(siteOf('static.assets.notion.so')).toBe('notion.so');
  });

  it('keeps three labels under a two-level country domain', () => {
    expect(siteOf('.naver.co.kr')).toBe('naver.co.kr');
    expect(siteOf('mail.naver.co.kr')).toBe('naver.co.kr');
    expect(siteOf('www.bbc.co.uk')).toBe('bbc.co.uk');
    expect(siteOf('shop.example.com.au')).toBe('example.com.au');
    expect(siteOf('www.city.go.jp')).toBe('city.go.jp');
  });

  it('keeps two labels when the last one is not a country code', () => {
    // `.io` is two letters but `co.io` is not a registry, so this stays as-is.
    expect(siteOf('app.slack.com')).toBe('slack.com');
    expect(siteOf('a.b.medium.net')).toBe('medium.net');
  });

  it('leaves a bare host alone', () => {
    expect(siteOf('figma.com')).toBe('figma.com');
    expect(siteOf('localhost')).toBe('localhost');
    expect(siteOf('')).toBe('');
  });
});

describe('isLoginCookie', () => {
  it('takes a long-lived httpOnly cookie', () => {
    expect(isLoginCookie({ httpOnly: true, expirationDate: expiring(30) }, NOW)).toBe(true);
  });

  it('drops a SameSite=None cookie — an ad network needs one, a sign-in does not', () => {
    // `.doubleclick.net` in a real jar: httpOnly, two years out, and still not a
    // login. This condition is what keeps sixty ad domains off the panel.
    expect(
      isLoginCookie(
        { httpOnly: true, sameSite: 'no_restriction', expirationDate: expiring(400) },
        NOW,
      ),
    ).toBe(false);
  });

  it('takes the other SameSite values', () => {
    for (const sameSite of ['lax', 'strict', 'unspecified', undefined]) {
      expect(isLoginCookie({ httpOnly: true, sameSite, expirationDate: expiring(30) }, NOW)).toBe(
        true,
      );
    }
  });

  it('drops a cookie script can read — ad and tracking cookies are not httpOnly', () => {
    expect(isLoginCookie({ httpOnly: false, expirationDate: expiring(400) }, NOW)).toBe(false);
    expect(isLoginCookie({ expirationDate: expiring(400) }, NOW)).toBe(false);
  });

  it('drops a session cookie, which has no expiry', () => {
    expect(isLoginCookie({ httpOnly: true }, NOW)).toBe(false);
  });

  it('drops one expiring within the day', () => {
    expect(isLoginCookie({ httpOnly: true, expirationDate: expiring(0.5) }, NOW)).toBe(false);
    expect(isLoginCookie({ httpOnly: true, expirationDate: expiring(-1) }, NOW)).toBe(false);
  });
});
