import { arrange, type Area, type Box } from '../canvas/layout';
import { siteOf } from '../widgets/browserAddress';
import { WIDGET_DEFS } from '../widgets/defs';
import type { SpaceDoc, WidgetDoc } from './types';

/**
 * Turning the windows open in Chrome into spaces (D-096).
 *
 * One window becomes one space. Somebody running several windows has already
 * split their work up that way, and carrying that split over means the app never
 * has to explain what a space is.
 */

/**
 * Tabs past this in one window become a bookmark list rather than widgets. A
 * window of forty tabs laid out as forty widgets is not a workspace, and it is
 * the reader tabs — the ones kept open to get to eventually — that pile up.
 */
export const MAX_TABS_PER_SPACE = 12;

/** Pages worth a widget: `chrome://`, `about:` and local files are not sites. */
export function isImportable(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * What to call a window: the site most of its tabs are on. Somebody with a
 * window of Figma and client docs gets "figma.com", which is wrong in wording and
 * right in meaning — and the name is editable before anything is created.
 */
export function nameForWindow(tabs: { url: string }[]): string {
  const counts = new Map<string, number>();
  for (const tab of tabs) {
    if (!isImportable(tab.url)) continue;
    let site: string;
    try {
      site = siteOf(new URL(tab.url).hostname);
    } catch {
      continue;
    }
    if (site) counts.set(site, (counts.get(site) ?? 0) + 1);
  }
  if (counts.size === 0) return 'Imported';
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export interface ImportWindow {
  id: string;
  tabs: { url: string; title: string }[];
}

/** A window as the picker shows it: what it would become if it were ticked. */
export interface WindowChoice {
  id: string;
  /** The proposed space name, which the user can edit. */
  name: string;
  /** Only the tabs that would become widgets. */
  tabs: { url: string; title: string }[];
  /** Tabs left out by the cap, so the picker can say how many. */
  dropped: number;
}

/** What the picker offers: windows with at least one real page in them. */
export function windowChoices(windows: ImportWindow[]): WindowChoice[] {
  return windows
    .map((window) => {
      const usable = window.tabs.filter((tab) => isImportable(tab.url));
      return {
        id: window.id,
        name: nameForWindow(usable),
        tabs: usable.slice(0, MAX_TABS_PER_SPACE),
        dropped: Math.max(0, usable.length - MAX_TABS_PER_SPACE),
      };
    })
    .filter((choice) => choice.tabs.length > 0);
}

/**
 * The widgets for one window, laid out in a grid and closed.
 *
 * Closed matters: a window of twelve tabs would otherwise load twelve pages the
 * moment the space is opened. The title comes from the tab, so each card names
 * its page before anything is fetched.
 */
function widgetsFor(
  tabs: { url: string; title: string }[],
  area: Area
): Record<string, WidgetDoc> {
  const size = WIDGET_DEFS.browser.defaultSize;
  const boxes: Box[] = tabs.map((_tab, i) => ({ id: String(i), x: 0, y: 0, ...size }));
  const places = arrange(boxes, area, 'grid');

  const widgets: Record<string, WidgetDoc> = {};
  tabs.forEach((tab, i) => {
    const place = places[String(i)] ?? { x: 0, y: 0, ...size };
    const id = crypto.randomUUID();
    widgets[id] = {
      id,
      type: 'browser',
      x: place.x,
      y: place.y,
      width: place.width,
      height: place.height,
      // Reverse order, so the leftmost tab ends up on top — the sidebar sorts by
      // z and Chrome's first tab is the one the user thinks of as first.
      z: tabs.length - i,
      data: { url: tab.url, title: tab.title, open: false },
    };
  });
  return widgets;
}

/**
 * The spaces the ticked windows would become, ready to save. `blank` makes an
 * empty space doc and `area` is the canvas the grid fills — both passed in so
 * this module stays free of the store and the DOM, and testable without either.
 */
export function spacesFrom(
  choices: WindowChoice[],
  blank: (name: string) => SpaceDoc,
  area: Area
): SpaceDoc[] {
  return choices.map((choice) => ({
    ...blank(choice.name),
    widgets: widgetsFor(choice.tabs, area),
  }));
}
