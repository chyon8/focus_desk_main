import { describe, expect, it, vi } from 'vitest';

// The module reaches for electron at import; `parseTabs` never touches it.
vi.mock('electron', () => ({ ipcMain: { handle: () => {} } }));

const { parseTabs } = await import('./chrome');

const RECORD = '\x1e';
const FIELD = '\x1f';
/** The shape the AppleScript prints: one line per tab, tagged with its window. */
const out = (rows: [string, string, string][]) =>
  rows.map(([id, url, title]) => [id, url, title].join(FIELD) + RECORD).join('');

describe('parseTabs', () => {
  it('groups tabs into the windows they came from, in order', () => {
    const windows = parseTabs(
      out([
        ['11', 'https://a.com', 'A'],
        ['11', 'https://b.com', 'B'],
        ['22', 'https://c.com', 'C'],
      ])
    );
    expect(windows).toEqual([
      { id: '11', tabs: [{ url: 'https://a.com', title: 'A' }, { url: 'https://b.com', title: 'B' }] },
      { id: '22', tabs: [{ url: 'https://c.com', title: 'C' }] },
    ]);
  });

  it('keeps a title whole whatever is in it', () => {
    const [window] = parseTabs(out([['1', 'https://a.com', 'Quote " and, comma\tand tab']]));
    expect(window.tabs[0].title).toBe('Quote " and, comma\tand tab');
  });

  it('keeps a title that somehow holds the separator', () => {
    const [window] = parseTabs(out([['1', 'https://a.com', `odd${FIELD}title`]]));
    expect(window.tabs[0].title).toBe(`odd${FIELD}title`);
  });

  it('reads no windows from a Chrome that is not running', () => {
    expect(parseTabs('')).toEqual([]);
  });

  it('skips a record with no url', () => {
    expect(parseTabs(out([['1', '', 'nothing']]))).toEqual([]);
  });
});
