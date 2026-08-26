import type { LucideIcon } from 'lucide-react';
import type { AppData, SpaceDoc, WebAppIcon, WidgetDoc } from '../spaces/types';
import type { SiteVisit } from '../stores/siteVisitStore';
import type { WebApp } from '../stores/webappStore';
import { centreCamera } from '../canvas/layout';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { hostOf } from '../widgets/browserAddress';
import { documentSummary } from '../widgets/memoContent';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WEB_APP_PRESETS } from '../webapps/presets';
import { useWebAppStore } from '../stores/webappStore';
import { PALETTE_ITEMS } from './WidgetPalette';

/** How a row is drawn on the left. Each source has its own kind of picture. */
export type LauncherMark =
  | { kind: 'lucide'; icon: LucideIcon }
  | { kind: 'webapp'; icon: WebAppIcon | null; name: string }
  | { kind: 'image'; src: string | null }
  | { kind: 'letter'; text: string };

export interface LauncherItem {
  key: string;
  name: string;
  /** The right-hand line: a host, a type, where the thing already is. */
  hint?: string;
  mark: LauncherMark;
  run: () => void;
}

export interface LauncherSection {
  title: string;
  items: LauncherItem[];
}

/** Short enough that a section stays a suggestion rather than a directory. */
const MAX_PER_SECTION = 6;

function matches(needle: string, ...fields: (string | undefined)[]) {
  if (!needle) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** Name-first: what the user typed the start of should come before a host match. */
function byRelevance(needle: string) {
  return (a: LauncherItem, b: LauncherItem) => {
    const rank = (item: LauncherItem) =>
      !needle ? 0 : item.name.toLowerCase().startsWith(needle) ? 0 : 1;
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  };
}

/** What a widget already on the canvas is called in a list of things to go to. */
function nameOf(widget: WidgetDoc): string {
  const label = WIDGET_REGISTRY[widget.type].label;
  const data = widget.data as Record<string, unknown>;
  if (widget.type === 'webapp' || widget.type === 'app') return (data.name as string) || label;
  if (widget.type === 'browser') return hostOf((data.url as string) ?? '') || label;
  // A memo is a document, so its name is what it says, not what it is made of.
  if (widget.type === 'memo') return documentSummary((data.content as string) ?? '') || label;
  return label;
}

/** Takes the camera to a widget that is already in this space and lifts it to the front. */
function goTo(widgetId: string) {
  const store = useSpaceStore.getState();
  const widget = store.spaces[store.activeSpaceId]?.widgets[widgetId];
  if (!widget) return;
  store.setCamera(centreCamera(getCamera(), widget, canvasArea()));
  store.bringToFront(widgetId);
}

/** Opens a saved web app in this space: its widget if it has one, a new one otherwise. */
export function openWebApp(app: WebApp) {
  const store = useSpaceStore.getState();
  const widgets = store.spaces[store.activeSpaceId]?.widgets ?? {};
  const standing = Object.values(widgets).find(
    (widget) => widget.type === 'webapp' && (widget.data as { appId?: string }).appId === app.id
  );
  if (standing) {
    // Already here — the click means "bring it forward", the way the Dock does.
    if (!(standing.data as { open?: boolean }).open) {
      store.updateWidgetData(standing.id, { open: true });
    }
    goTo(standing.id);
    return;
  }
  store.addWidget('webapp', {
    appId: app.id,
    name: app.name,
    icon: app.icon,
    homeUrl: app.url,
    url: app.url,
    open: true,
  });
}

function openSite(url: string) {
  useSpaceStore.getState().addWidget('browser', { url });
}

function openApp(app: AppData) {
  const id = useSpaceStore.getState().addWidget('app', {
    appKey: app.appKey,
    name: app.name,
    icon: app.icon,
  });
  // Picking is the asking, as in the app widget's own picker.
  useUiStore.getState().toggleAppOpen(id);
}

export interface LauncherSources {
  space: SpaceDoc | undefined;
  webApps: Record<string, WebApp>;
  sites: SiteVisit[];
  /** Null while the catalogue is still being read. */
  installedApps: AppData[] | null;
}

/**
 * Everything reachable in one keystroke, in the order it is worth offering.
 *
 * The problem this answers: on a normal desktop a tool is one Dock click away,
 * while here it is a widget that has to be added first — so a tool the user
 * already has out and a tool they are about to open both live in this one list.
 */
export function buildLauncherSections(
  sources: LauncherSources,
  query: string
): LauncherSection[] {
  const needle = query.trim().toLowerCase();
  const sections: LauncherSection[] = [];

  const push = (title: string, items: LauncherItem[]) => {
    if (items.length) sections.push({ title, items: items.slice(0, MAX_PER_SECTION) });
  };

  // Already in this space. First, because going to a thing beats making a second one.
  const here = Object.values(sources.space?.widgets ?? {})
    .map<LauncherItem>((widget) => ({
      key: `here:${widget.id}`,
      name: nameOf(widget),
      hint: WIDGET_REGISTRY[widget.type].label,
      mark: { kind: 'lucide', icon: WIDGET_REGISTRY[widget.type].icon },
      run: () => goTo(widget.id),
    }))
    .filter((item) => matches(needle, item.name, item.hint))
    .sort(byRelevance(needle));
  push('In this space', here);

  const webApps = Object.values(sources.webApps)
    .map<LauncherItem>((app) => ({
      key: `webapp:${app.id}`,
      name: app.name,
      hint: hostOf(app.url),
      mark: { kind: 'webapp', icon: app.icon, name: app.name },
      run: () => openWebApp(app),
    }))
    .filter((item) => matches(needle, item.name, item.hint))
    .sort(byRelevance(needle));
  push('Your web apps', webApps);

  // Installed apps and presets are long lists, so they wait to be asked for.
  if (needle) {
    const apps = (sources.installedApps ?? [])
      .map<LauncherItem>((app) => ({
        key: `app:${app.appKey}`,
        name: app.name,
        hint: 'App',
        mark: { kind: 'image', src: app.icon },
        run: () => openApp(app),
      }))
      .filter((item) => matches(needle, item.name))
      .sort(byRelevance(needle));
    push('Apps on this Mac', apps);
  }

  const sites = sources.sites
    .map<LauncherItem>((site) => ({
      key: `site:${site.host}`,
      name: site.host,
      hint: 'Site',
      mark: { kind: 'letter', text: site.host[0] ?? '?' },
      run: () => openSite(site.url),
    }))
    .filter((item) => matches(needle, item.name))
    .sort(byRelevance(needle));
  push('Often', sites);

  if (needle) {
    const taken = new Set(Object.values(sources.webApps).map((app) => app.url));
    const presets = WEB_APP_PRESETS.filter((preset) => !taken.has(preset.url))
      .map<LauncherItem>((preset) => ({
        key: `preset:${preset.url}`,
        name: preset.name,
        hint: preset.group,
        mark: { kind: 'webapp', icon: preset.icon, name: preset.name },
        run: () =>
          // Saving it is what the web app picker does too: a preset opened once
          // is a tool the user has, and it belongs in their list afterwards.
          openWebApp(
            useWebAppStore
              .getState()
              .save({ name: preset.name, url: preset.url, icon: preset.icon })
          ),
      }))
      .filter((item) => matches(needle, item.name, item.hint))
      .sort(byRelevance(needle));
    push('Web apps to add', presets);
  }

  const widgets = PALETTE_ITEMS.map<LauncherItem>((item) => ({
    key: `add:${item.label}`,
    name: item.label,
    hint: 'New widget',
    mark: { kind: 'lucide', icon: item.icon },
    run: () => useSpaceStore.getState().addWidget(item.payload.type, item.payload.data),
  }))
    .filter((item) => matches(needle, item.name))
    .sort(byRelevance(needle));
  push('Add a widget', widgets);

  return sections;
}
