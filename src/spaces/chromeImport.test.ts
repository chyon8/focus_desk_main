import { describe, expect, it } from 'vitest';
import {
  MAX_TABS_PER_SPACE,
  isImportable,
  nameForWindow,
  spacesFrom,
  windowChoices,
} from './chromeImport';
import type { SpaceDoc } from './types';

const AREA = { width: 1440, height: 816 };
const tab = (url: string, title = url) => ({ url, title });
/** Stands in for the store's `newSpace`, which needs neither store nor DOM here. */
const blank = (name: string) => ({ id: `id-${name}`, name, widgets: {} }) as unknown as SpaceDoc;

describe('isImportable', () => {
  it('takes web pages and leaves the rest', () => {
    expect(isImportable('https://figma.com')).toBe(true);
    expect(isImportable('http://localhost:3000')).toBe(true);
    expect(isImportable('chrome://settings')).toBe(false);
    expect(isImportable('about:blank')).toBe(false);
    expect(isImportable('file:///Users/a/notes.pdf')).toBe(false);
  });
});

describe('nameForWindow', () => {
  it('names a window after the site most of it is on', () => {
    expect(
      nameForWindow([
        tab('https://www.youtube.com/watch?v=1'),
        tab('https://www.youtube.com/watch?v=2'),
        tab('https://figma.com/file/x'),
      ])
    ).toBe('youtube.com');
  });

  it('groups subdomains, and keeps a country domain whole', () => {
    expect(nameForWindow([tab('https://mail.naver.co.kr/x')])).toBe('naver.co.kr');
    expect(
      nameForWindow([tab('https://app.slack.com/a'), tab('https://slack.com/b')])
    ).toBe('slack.com');
  });

  it('ignores tabs that are not web pages', () => {
    expect(nameForWindow([tab('chrome://settings'), tab('https://notion.so/x')])).toBe('notion.so');
  });

  it('has a name for a window with nothing importable in it', () => {
    expect(nameForWindow([tab('chrome://newtab')])).toBe('Imported');
  });
});

describe('windowChoices', () => {
  it('drops windows with no web page in them', () => {
    const choices = windowChoices([
      { id: '1', tabs: [tab('chrome://newtab')] },
      { id: '2', tabs: [tab('https://notion.so')] },
    ]);
    expect(choices.map((c) => c.id)).toEqual(['2']);
  });

  it('caps the tabs and reports how many were left out', () => {
    const many = Array.from({ length: 20 }, (_, i) => tab(`https://a.com/${i}`));
    const [choice] = windowChoices([{ id: '1', tabs: many }]);
    expect(choice.tabs).toHaveLength(MAX_TABS_PER_SPACE);
    expect(choice.dropped).toBe(20 - MAX_TABS_PER_SPACE);
  });

  it('counts only importable tabs against the cap', () => {
    const [choice] = windowChoices([
      { id: '1', tabs: [tab('chrome://settings'), tab('https://a.com')] },
    ]);
    expect(choice.tabs).toHaveLength(1);
    expect(choice.dropped).toBe(0);
  });
});

describe('spacesFrom', () => {
  it('makes one space per window, with a widget per tab', () => {
    const choices = windowChoices([
      { id: '1', tabs: [tab('https://a.com'), tab('https://b.com')] },
      { id: '2', tabs: [tab('https://c.com')] },
    ]);
    const spaces = spacesFrom(choices, blank, AREA);
    expect(spaces).toHaveLength(2);
    expect(Object.keys(spaces[0].widgets)).toHaveLength(2);
    expect(Object.keys(spaces[1].widgets)).toHaveLength(1);
  });

  it('creates every widget closed, so opening the space loads no pages', () => {
    const choices = windowChoices([
      { id: '1', tabs: Array.from({ length: 8 }, (_, i) => tab(`https://a.com/${i}`)) },
    ]);
    const [space] = spacesFrom(choices, blank, AREA);
    const widgets = Object.values(space.widgets);
    expect(widgets).toHaveLength(8);
    expect(widgets.every((w) => (w.data as { open?: boolean }).open === false)).toBe(true);
  });

  it('carries the tab title over, so a card has a name before it loads', () => {
    const choices = windowChoices([{ id: '1', tabs: [tab('https://a.com', 'Client brief')] }]);
    const [space] = spacesFrom(choices, blank, AREA);
    const [widget] = Object.values(space.widgets);
    expect(widget.data).toMatchObject({ url: 'https://a.com', title: 'Client brief' });
  });

  it('lays the widgets out apart from each other', () => {
    const choices = windowChoices([
      { id: '1', tabs: Array.from({ length: 4 }, (_, i) => tab(`https://a.com/${i}`)) },
    ]);
    const [space] = spacesFrom(choices, blank, AREA);
    const corners = Object.values(space.widgets).map((w) => `${w.x},${w.y}`);
    expect(new Set(corners).size).toBe(4);
  });

  it('puts the first tab on top', () => {
    const choices = windowChoices([
      { id: '1', tabs: [tab('https://first.com'), tab('https://second.com')] },
    ]);
    const [space] = spacesFrom(choices, blank, AREA);
    const byZ = Object.values(space.widgets).sort((a, b) => b.z - a.z);
    expect((byZ[0].data as { url: string }).url).toBe('https://first.com');
  });
});
