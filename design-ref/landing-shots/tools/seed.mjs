// Writes spec files into the demo profile. Only while the demo app is closed.
// usage: node seed.mjs specs/a.mjs [specs/b.mjs ...]
import fs from 'node:fs';
import path from 'node:path';
import { PROFILE, todayKey } from './lib.mjs';
import { buildSpace } from './build.mjs';

fs.mkdirSync(path.join(PROFILE, 'spaces'), { recursive: true });
const configFile = path.join(PROFILE, 'config.json');
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
config['space-time-v1'] ??= {};

let first = null;
for (const file of process.argv.slice(2)) {
  const { default: specs } = await import(path.resolve(file));
  for (const spec of [].concat(specs)) {
    const doc = await buildSpace(spec);
    fs.writeFileSync(path.join(PROFILE, 'spaces', `${doc.id}.json`), JSON.stringify(doc, null, 2));
    if (spec.seconds) config['space-time-v1'][doc.id] = { [todayKey()]: spec.seconds };
    first ??= doc.id;
    console.log('seeded', doc.id);
  }
}
if (!config['active-space-id'] && first) config['active-space-id'] = first;
fs.writeFileSync(configFile, JSON.stringify(config, null, '\t'));
