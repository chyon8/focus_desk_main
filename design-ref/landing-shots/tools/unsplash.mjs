// Search Unsplash (free license photos only) and download small previews for review.
// usage: node unsplash.mjs <outdir> <query> [count] [orientation]
import fs from 'node:fs';
import path from 'node:path';

const [outDir, query, countArg = '12', orientation = ''] = process.argv.slice(2);
const count = Number(countArg);
fs.mkdirSync(outDir, { recursive: true });

const found = [];
for (let page = 1; found.length < count && page <= 4; page += 1) {
  const url = new URL('https://unsplash.com/napi/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '30');
  url.searchParams.set('page', String(page));
  if (orientation) url.searchParams.set('orientation', orientation);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const body = await res.json();
  for (const p of body.results) {
    // Unsplash+ photos are paid; skip them.
    if (p.premium || p.plus || String(p.urls?.raw).includes('plus.unsplash.com')) continue;
    found.push(p);
    if (found.length >= count) break;
  }
  if (!body.results.length) break;
}

const index = [];
await Promise.all(
  found.map(async (p, i) => {
    const file = path.join(outDir, `${String(i).padStart(2, '0')}-${p.id}.jpg`);
    const res = await fetch(`${p.urls.raw}&w=480&q=70&fm=jpg`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    index[i] = { i, id: p.id, color: p.color, w: p.width, h: p.height, alt: p.alt_description, user: p.user?.name, raw: p.urls.raw };
  })
);
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
console.log(index.map((p) => `${p.i} ${p.id} ${p.color} ${p.w}x${p.h} ${p.alt ?? ''}`).join('\n'));
