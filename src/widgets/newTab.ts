import type { WidgetType } from '../spaces/types';
import { showWhereItLanded, useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { WIDGET_DEFS } from './defs';
import { textToHtml } from './memoContent';

/** Clear of the widget it came from, close enough to read as the next one along. */
const NEW_TAB_GAP = 32;

/**
 * Puts a new widget to the right of the one it came out of, and says so when it
 * lands somewhere the user cannot see — off the edge of the view, or behind a
 * maximised widget. `showWhereItLanded` decides which, and offers the way there.
 */
export function placeBeside(
  sourceId: string,
  type: WidgetType,
  data: Record<string, unknown>,
  notice: string
) {
  const state = useSpaceStore.getState();
  const self = state.spaces[state.activeSpaceId]?.widgets[sourceId];
  if (!self) return;

  const size = WIDGET_DEFS[type].defaultSize;
  // `at` is the new widget's centre.
  const newId = state.addWidget(type, data, {
    x: self.x + self.width + NEW_TAB_GAP + size.width / 2,
    y: self.y + size.height / 2,
  });

  const after = useSpaceStore.getState();
  const created = after.spaces[after.activeSpaceId]?.widgets[newId];
  if (created) showWhereItLanded(created, notice);
}

/**
 * What a link asking for a new tab does: a browser widget beside the one it was
 * clicked in (D-065). Shared by the browser and the web app widget, which follow
 * the same rule.
 */
export function openTabBeside(sourceId: string, url: string) {
  placeBeside(sourceId, 'browser', { url }, 'Opened in a new tab beside this one');
}

/**
 * An image or a passage of text taken out of a page and left on the canvas
 * (D-081). The picture is copied in rather than linked: a page that changes, or
 * one behind a login, would otherwise leave an empty frame behind.
 */
export async function sendToCanvas(sourceId: string, kind: 'image' | 'text', value: string) {
  if (kind === 'text') {
    placeBeside(sourceId, 'memo', { content: textToHtml(value), theme: 'LIGHT' }, 'Text taken out of the page');
    return;
  }

  const spaceId = useSpaceStore.getState().activeSpaceId;
  const url = await window.images?.fromUrl(value, `persist:space-${spaceId}`);
  if (!url) {
    useUiStore.getState().showNotice('That image could not be saved.');
    return;
  }
  placeBeside(sourceId, 'photo', { url, caption: '' }, 'Image taken out of the page');
}
