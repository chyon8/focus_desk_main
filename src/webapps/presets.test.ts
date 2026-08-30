import { describe, expect, it } from 'vitest';
import { WEB_APP_PRESETS } from './presets';

describe('web app presets', () => {
  it('stays in group order, which is what the pickers build their headings from', () => {
    const seen: string[] = [];
    for (const preset of WEB_APP_PRESETS) {
      if (seen[seen.length - 1] !== preset.group) seen.push(preset.group);
    }
    expect(seen).toEqual([...new Set(seen)]);
  });

  it('offers every preset a name, an icon and a web address', () => {
    for (const preset of WEB_APP_PRESETS) {
      expect(preset.name).not.toBe('');
      expect(preset.icon).toBeTruthy();
      expect(preset.url).toMatch(/^https:\/\//);
    }
  });

  it('lists each site once', () => {
    const urls = WEB_APP_PRESETS.map((preset) => preset.url);
    expect(urls).toEqual([...new Set(urls)]);
  });
});
