// Opens a space in the demo window and screenshots it.
// usage: node shot.mjs <spaceId> <out.png> [--wait ms] [--scale n] [--clip x,y,w,h] [--rail id,id,...]
//   --rail  which spaces the rail lists, in order (the others stay saved, just not shown)
import { capture, connect, wait } from './lib.mjs';

const [spaceId, out, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const waitMs = Number(opt('wait', '4000'));
const scale = Number(opt('scale', '2'));
const clipArg = opt('clip', null);
const clip = clipArg
  ? Object.fromEntries(clipArg.split(',').map((v, i) => [['x', 'y', 'width', 'height'][i], Number(v)]))
  : undefined;
const rail = opt('rail', null);

const cdp = await connect();
await cdp.stores();

if (rail) {
  // Rail order is the key order of `spaces`. Spaces left out are only hidden from the store.
  await cdp.evaluate(`(async () => {
    const ids = ${JSON.stringify(rail.split(','))};
    const docs = await window.spaces.list();
    const byId = Object.fromEntries(docs.map((d) => [d.id, d]));
    const current = window.__fd.useSpaceStore.getState().spaces;
    const spaces = {};
    for (const id of ids) spaces[id] = current[id] ?? byId[id];
    window.__fd.useSpaceStore.setState({ spaces });
    return Object.keys(spaces).length;
  })()`);
}

await cdp.evaluate(`window.__fd.useSpaceStore.getState().setActiveSpace(${JSON.stringify(spaceId)}), 'ok'`);
await wait(waitMs);

// Photos are drawn `contain`; zoom each one until it covers its frame.
const fitted = await cdp.evaluate(`(() => {
  const st = window.__fd.useSpaceStore.getState();
  const space = st.spaces[st.activeSpaceId];
  let n = 0;
  for (const w of Object.values(space.widgets)) {
    if (w.type !== 'photo' || w.data.keepZoom) continue;
    const img = document.querySelector('[data-widget-id="' + w.id + '"] img.object-contain');
    if (!img || !img.naturalWidth) continue;
    const box = img.parentElement.getBoundingClientRect();
    const fit = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const zoom = Math.max(box.width / (img.naturalWidth * fit), box.height / (img.naturalHeight * fit)) * 1.002;
    if (Math.abs((w.data.zoom ?? 1) - zoom) > 0.005) {
      st.updateWidgetData(w.id, { zoom });
      n += 1;
    }
  }
  return n;
})()`);
if (fitted) await wait(600);

// --scroll "are.na:420,wikipedia:200": scroll pages whose address contains the key.
const scrollArg = opt('scroll', null);
if (scrollArg) {
  const { targetInfos } = await cdp.raw('Target.getTargets');
  for (const pair of scrollArg.split(',')) {
    const [key, y] = pair.split(':');
    for (const t of targetInfos.filter((t) => t.type === 'webview' && t.url.includes(key))) {
      const { sessionId } = await cdp.raw('Target.attachToTarget', { targetId: t.targetId, flatten: true });
      await cdp.raw('Runtime.evaluate', { expression: `window.scrollTo(0, ${Number(y)})` }, sessionId);
    }
  }
  await wait(1500);
}

// --clicktext "earth.google:Dismiss": click the first element showing that text inside matching pages
// (a first-visit tooltip a person would close before working).
const clickArg = opt('clicktext', null);
if (clickArg) {
  const { targetInfos } = await cdp.raw('Target.getTargets');
  for (const pair of clickArg.split(',')) {
    const [key, text] = pair.split(':');
    for (const t of targetInfos.filter((t) => t.type === 'webview' && t.url.includes(key))) {
      const { sessionId } = await cdp.raw('Target.attachToTarget', { targetId: t.targetId, flatten: true });
      await cdp.raw('DOM.getDocument', { depth: -1, pierce: true }, sessionId);
      const { searchId, resultCount } = await cdp.raw(
        'DOM.performSearch',
        { query: text, includeUserAgentShadowDOM: true },
        sessionId
      );
      if (!resultCount) continue;
      const { nodeIds } = await cdp.raw('DOM.getSearchResults', { searchId, fromIndex: 0, toIndex: resultCount }, sessionId);
      for (const nodeId of nodeIds) {
        try {
          // A text match has no box; press its parent element with a real pointer, since some
          // pages listen for pointer events rather than click().
          const { node } = await cdp.raw('DOM.describeNode', { nodeId }, sessionId);
          const target = node.nodeType === 3 ? node.parentId : nodeId;
          const { model } = await cdp.raw('DOM.getBoxModel', { nodeId: target }, sessionId);
          const [x1, y1, , , x3, y3] = model.border;
          const x = (x1 + x3) / 2;
          const y = (y1 + y3) / 2;
          for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
            await cdp.raw('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }, sessionId);
          }
          break;
        } catch {
          // no box for this match; try the next one
        }
      }
    }
  }
  await wait(1500);
}

// --skin fullbleed: preview only, not the app. Photo widgets lose the top band and the caption
// strip, and the picture fills the card. Removed again right after the capture.
const skin = opt('skin', null);
if (skin === 'fullbleed') {
  await cdp.evaluate(`(() => {
    document.getElementById('preview-skin')?.remove();
    const style = document.createElement('style');
    style.id = 'preview-skin';
    style.textContent = [
      '[data-widget-id] .photo-paper { padding: 0 !important; }',
      '[data-widget-id] .photo-paper > :not(.relative) { display: none !important; }',
      '[data-widget-id] .photo-paper > .relative { flex: 1 1 auto !important; }',
      '[data-widget-id] .photo-paper img { object-fit: cover !important; transform: none !important; width: 100% !important; height: 100% !important; }',
    ].join('\\n');
    document.head.appendChild(style);
    return true;
  })()`);
  await wait(500);
}

await capture(cdp, out, { scale, clip });
if (skin) await cdp.evaluate(`(document.getElementById('preview-skin')?.remove(), true)`);
console.log(`saved ${out}${fitted ? ` (fitted ${fitted} photos)` : ''}`);
cdp.close();
process.exit(0);
