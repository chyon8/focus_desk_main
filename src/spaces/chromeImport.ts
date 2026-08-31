import { arrange, type Area, type Box, type Placement } from '../canvas/layout';
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
 * How many of a window's tabs come in loaded rather than as a card.
 *
 * A space of nothing but cards is a list of links, and the leading tabs are the
 * ones the user was last looking at — so those are the ones worth the load.
 *
 * Four, and no more: the canvas mounts every widget in the active space, so an
 * opened tab is a Chromium renderer process held for as long as that space is
 * open, not just while it is being looked at. Ten would make the space the user
 * liked the most the one their machine likes the least.
 */
export const OPEN_TABS = 4;

/**
 * Where an imported window's widgets go: the `focus` arrange, which is the same
 * mosaic the tidy-up produces.
 *
 * Laying them out at their real sizes instead — 900 by 620 a page, twelve of
 * them — makes a desk far bigger than the screen, so the camera has to pull back
 * to about half to show it and every widget lands smaller than it used to be.
 * Fitting the widgets to the screen rather than the camera to the widgets is
 * what the app did before, and the arrange already does exactly that.
 */
export function importLayout(tabs: Box[], area: Area, extras: Box[] = []): Placement[] {
  const boxes = [...tabs, ...extras];
  const places = arrange(boxes, area, 'focus');
  return boxes.map((box) => places[box.id]);
}

/**
 * What one imported tab becomes. The title comes from Chrome, so a card names
 * its page before anything is fetched; the icon is left empty and the card
 * fetches its own, which AppleScript could not have reported anyway.
 */
export function tabWidget(
  tab: { url: string; title: string },
  index: number,
  total: number,
  place: Placement
): WidgetDoc {
  const id = crypto.randomUUID();
  return {
    id,
    type: 'browser',
    x: place.x,
    y: place.y,
    width: place.width,
    height: place.height,
    // Reverse order, so the leftmost tab ends up on top — the sidebar sorts by
    // z and Chrome's first tab is the one the user thinks of as first.
    z: total - index,
    data: { url: tab.url, title: tab.title, open: index < OPEN_TABS },
  };
}

/** The widgets for one window. */
function widgetsFor(tabs: { url: string; title: string }[], area: Area): Record<string, WidgetDoc> {
  const size = WIDGET_DEFS.browser.defaultSize;
  const boxes = tabs.map((_tab, i) => ({ id: String(i), x: 0, y: 0, ...size }));
  const places = importLayout(boxes, area);
  const widgets: Record<string, WidgetDoc> = {};
  tabs.forEach((tab, i) => {
    const widget = tabWidget(tab, i, tabs.length, places[i]);
    widgets[widget.id] = widget;
  });
  return widgets;
}

/**
 * The spaces the ticked windows would become, ready to save. `blank` makes an
 * empty space doc — passed in so this module stays free of the store and the
 * DOM, and testable without either — and it is what carries the room the user
 * picked, so an imported space looks like the one they chose rather than the
 * default. `area` is the canvas the widgets are fitted to.
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
