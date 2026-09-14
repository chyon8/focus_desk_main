// Replaces spaces in the running demo window from spec files, without a restart.
// usage: node push.mjs specs/a.mjs [specs/b.mjs ...] [--activate]
import path from 'node:path';
import { connect, todayKey } from './lib.mjs';
import { buildSpace } from './build.mjs';

const args = process.argv.slice(2);
const activate = args.includes('--activate');
const files = args.filter((a) => !a.startsWith('--'));

const docs = [];
const times = {};
for (const file of files) {
  const { default: specs } = await import(`${path.resolve(file)}?t=${Date.now()}`);
  for (const spec of [].concat(specs)) {
    const doc = await buildSpace(spec);
    docs.push(doc);
    if (spec.seconds) times[doc.id] = { [todayKey()]: spec.seconds };
  }
}

const cdp = await connect();
await cdp.stores();
await cdp.evaluate(`(() => {
  window.__docs = ${JSON.stringify(docs)};
  return window.__docs.length;
})()`);

// Closed page cards get what the app itself files after its fetch: the page's picture, its line
// and its icon. The app asks once per address per run, so a card pushed again would stay blank.
const filled = await cdp.evaluate(`(async () => {
  const hostOf = (url) => new URL(url).hostname.replace(/^www\\./, '');
  const cards = [];
  for (const d of window.__docs) {
    for (const w of Object.values(d.widgets)) {
      if (w.type === 'browser' && w.data.open === false && w.data.url && w.data.previewUrl !== w.data.url) cards.push(w);
    }
  }
  if (!cards.length) return 0;
  const previews = await window.images.previews([...new Set(cards.map((w) => w.data.url))]);
  const icons = await window.images.favicons([...new Set(cards.map((w) => hostOf(w.data.url)))]);
  for (const w of cards) {
    const p = previews[w.data.url];
    w.data.previewUrl = w.data.url;
    w.data.thumbnail = p?.image ?? '';
    w.data.description = p?.description ?? '';
    const icon = icons[hostOf(w.data.url)];
    if (icon) {
      w.data.favicon = icon.url;
      if (icon.color) w.data.faviconColor = icon.color;
    }
  }
  return cards.length;
})()`);

await cdp.evaluate('Promise.all(window.__docs.map((doc) => window.spaces.save(doc))).then(() => true)');
const result = await cdp.evaluate(`(() => {
  const docs = window.__docs;
  const { useSpaceStore, useSpaceTimeStore } = window.__fd;
  useSpaceStore.setState((s) => ({
    spaces: { ...s.spaces, ...Object.fromEntries(docs.map((d) => [d.id, d])) },
  }));
  useSpaceTimeStore.setState((s) => ({ time: { ...s.time, ...${JSON.stringify(times)} } }));
  if (${activate}) useSpaceStore.getState().setActiveSpace(docs[0].id);
  return docs.map((d) => d.id).join(', ');
})()`);
console.log('pushed', result, filled ? `(filled ${filled} cards)` : '');
cdp.close();
process.exit(0);
