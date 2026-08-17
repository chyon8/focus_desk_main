import type { AppData, SpaceDoc, WidgetDoc } from '../spaces/types';

/** Every app widget in a space, with its data typed — the document stores it untyped. */
export function appWidgets(space: SpaceDoc | undefined): (WidgetDoc & { data: AppData })[] {
  if (!space) return [];
  return Object.values(space.widgets).filter((widget) => widget.type === 'app') as (WidgetDoc & {
    data: AppData;
  })[];
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
