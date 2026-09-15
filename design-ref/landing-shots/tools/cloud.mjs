// Shoots Cloud concept spaces at each camera in their spec (`shots`), A last so the space is left on A.
// usage: node cloud.mjs <outDir> specs/c01-lisbon.mjs [...] [-- extra shot.mjs args]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { RAIL_IDS } from './specs/_cloud.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const cut = args.indexOf('--');
const extra = cut === -1 ? [] : args.slice(cut + 1);
const [outDir, ...files] = cut === -1 ? args : args.slice(0, cut);

for (const file of files) {
  const { default: spec } = await import(path.resolve(file));
  const names = Object.keys(spec.shots).sort((a, b) => (a === 'A') - (b === 'A') || a.localeCompare(b));
  for (const name of names) {
    const cam = spec.shots[name];
    execFileSync(
      'node',
      [
        'shot.mjs',
        spec.id,
        path.resolve(outDir, `${spec.railAs ?? spec.id}-${name}.png`),
        '--rail',
        (spec.rail ?? RAIL_IDS).map((id) => (id === spec.railAs ? spec.id : id)).join(','),
        '--camera',
        `${cam.x},${cam.y},${cam.zoom}`,
        // shot.mjs reads the first copy of an option, so a spec's own --wait wins over the default.
        ...spec.shotArgs,
        ...extra,
        '--wait',
        '9000',
      ],
      { stdio: 'inherit', cwd: HERE }
    );
  }
}
