import type { AppData, SpaceDoc, WidgetDoc } from '../spaces/types';

/** Every app widget in a space, with its data typed — the document stores it untyped. */
export function appWidgets(space: SpaceDoc | undefined): (WidgetDoc & { data: AppData })[] {
  if (!space) return [];
  return Object.values(space.widgets).filter((widget) => widget.type === 'app') as (WidgetDoc & {
    data: AppData;
  })[];
}

/**
 * The windows of the same app that other widgets here already stand for, so a
 * widget looking for its first window skips them (D-045). Without this, two
 * widgets pointed at one editor both land on whichever window was focused last.
 */
export function claimedWindowTitles(
  space: SpaceDoc | undefined,
  widgetId: string,
  appKey: string
): string[] {
  return appWidgets(space)
    .filter((widget) => widget.id !== widgetId && widget.data.appKey === appKey)
    .map((widget) => widget.data.windowTitle)
    .filter((title): title is string => !!title);
}

/**
 * The apps a space claims. Being in one of these counts as being at the desk,
 * and time spent in them is banked against this space (D-039).
 */
export function spaceAppKeys(space: SpaceDoc | undefined): string[] {
  const keys = appWidgets(space)
    .map((widget) => widget.data.appKey)
    .filter(Boolean);
  // Sorted and de-duplicated so callers can compare two lists as strings.
  return [...new Set(keys)].sort();
}
