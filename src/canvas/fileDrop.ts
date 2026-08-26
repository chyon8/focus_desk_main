import { useSpaceStore } from '../stores/spaceStore';
import { textToHtml } from '../widgets/memoContent';

/** The first address in a `text/uri-list`, ignoring its comment lines. */
function firstUri(list: string) {
  return list.split(/\r?\n/).find((line) => line && !line.startsWith('#')) ?? '';
}

/** The picture in a dragged fragment of a page. */
const IMG_SRC = /<img[^>]+src=["']([^"']+)["']/i;

/**
 * What something dragged out of a web page becomes (D-081): a picture is copied
 * in and left as a photo, a link opens as a browser widget, and anything else is
 * the text, as a note. Answers whether it took the drop.
 */
export async function addDroppedContent(transfer: DataTransfer, at: { x: number; y: number }) {
  const uri = firstUri(transfer.getData('text/uri-list'));
  const text = transfer.getData('text/plain');
  const src = transfer.getData('text/html').match(IMG_SRC)?.[1] ?? (isWeb(uri) ? uri : '');
  const { addWidget, activeSpaceId } = useSpaceStore.getState();

  if (src) {
    // Copied in rather than linked: a page that changes, or one behind a login,
    // would otherwise leave an empty frame on the canvas.
    const saved = await window.images?.fromUrl(src, `persist:space-${activeSpaceId}`);
    if (saved) {
      addWidget('photo', { url: saved, caption: '' }, at);
      return true;
    }
  }

  if (isWeb(uri)) {
    addWidget('browser', { url: uri }, at);
    return true;
  }

  if (text.trim()) {
    addWidget('memo', { content: textToHtml(text), theme: 'LIGHT' }, at);
    return true;
  }

  return false;
}

function isWeb(url: string) {
  return /^https?:\/\//.test(url);
}

/** Read into a memo, since a memo is what the user would have pasted them into. */
const TEXT_EXTS = new Set(['.txt', '.md', '.markdown', '.csv', '.log', '.json']);
/** Named in the notice, so "not yet" is a list and not a shrug. */
export const SUPPORTED_DROPS = 'Images · PDF · .txt .md .csv .json';
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
    return { type: 'memo' as const, data: { content: textToHtml(await file.text()), theme: 'LIGHT' } };
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
