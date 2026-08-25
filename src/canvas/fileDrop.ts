import { useSpaceStore } from '../stores/spaceStore';

/** Read into a memo, since a memo is what the user would have pasted them into. */
const TEXT_EXTS = new Set(['.txt', '.md', '.markdown', '.csv', '.log', '.json']);
/** A memo is a note, not a log viewer. Past this the file is refused. */
const MAX_TEXT_BYTES = 200_000;
/** Dropping several files at once fans them out instead of stacking them. */
const CASCADE = 32;

function extOf(name: string) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/**
 * What a file dropped on the canvas becomes.
 *
 * Only the three kinds the app can actually show. A .docx or a .key would need a
 * renderer the app does not have, and a widget that opens onto a blank rectangle
 * is worse than being told no.
 */
async function widgetFor(file: File) {
  if (file.type.startsWith('image/')) {
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (!url) return null;
    return { type: 'photo' as const, data: { url, caption: '' } };
  }

  if (extOf(file.name) === '.pdf') {
    // Left where it is rather than copied in: a PDF is usually one of a set of
    // files the user keeps in a folder, and a copy would quietly go stale.
    // Chromium's own viewer renders it (`plugins` on the webview).
    const path = window.files?.pathFor(file);
    if (!path) return null;
    return { type: 'browser' as const, data: { url: `file://${encodeURI(path)}` } };
  }

  if (TEXT_EXTS.has(extOf(file.name))) {
    if (file.size > MAX_TEXT_BYTES) return null;
    return { type: 'memo' as const, data: { content: await file.text(), theme: 'LIGHT' } };
  }

  return null;
}

/**
 * Drops the files that can be shown at the point they were let go, and reports
 * the ones that could not so the canvas can say so.
 */
export async function addDroppedFiles(files: File[], at: { x: number; y: number }) {
  const rejected: string[] = [];
  let placed = 0;

  for (const file of files) {
    const widget = await widgetFor(file);
    if (!widget) {
      rejected.push(file.name);
      continue;
    }
    useSpaceStore.getState().addWidget(widget.type, widget.data, {
      x: at.x + placed * CASCADE,
      y: at.y + placed * CASCADE,
    });
    placed += 1;
  }

  return rejected;
}
