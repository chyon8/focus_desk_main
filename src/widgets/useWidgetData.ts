import { useCallback } from 'react';
import { useSpaceStore, useWidget } from '../stores/spaceStore';

/** Reads a widget's data and returns a patch function scoped to that widget. */
export function useWidgetData<D>(id: string): [D, (patch: Partial<D>) => void] {
  const widget = useWidget(id);
  const updateWidgetData = useSpaceStore((s) => s.updateWidgetData);

  const update = useCallback(
    (patch: Partial<D>) => updateWidgetData(id, patch as Record<string, unknown>),
    [id, updateWidgetData]
  );

  return [widget.data as D, update];
}
