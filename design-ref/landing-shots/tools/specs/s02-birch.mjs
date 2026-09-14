// 2. 무드보드 — Snowy Railway with snow. A masonry board over the sky and the left slope;
// the lit cabin, the lamp post and the snow field stay open. No colour marks.
import { screen } from './_util.mjs';

const Z = 1.0;
const at = screen(Z);
const A = new URL('../assets/', import.meta.url).pathname;

// Six 200px columns, 16px gutters, from x 112.
const col = (i) => 112 + i * 216;
const photo = (key, c, y, h, source, caption) => ({
  key,
  type: 'photo',
  ...at(col(c), y, 200, h),
  data: { ...(source.startsWith('/') ? { file: source } : { unsplash: source }), caption },
});

export const BIRCH_WIDGETS = [
  photo('dusk', 0, 36, 360, 'e9DkjLz5FuU', 'Front, at dusk'),
  photo('stove', 0, 412, 212, '79yk4XalXCM', 'Stove, room 2'),
  photo('sw-birch', 0, 640, 104, A + 'swatch-birch.png', 'Birch'),
  photo('mark', 1, 36, 228, A + 'wordmark-birch.png', 'Wordmark v2'),
  photo('window', 1, 280, 360, 'nFOjZuDUG88', 'The big window'),
  photo('sw-pine', 1, 656, 104, A + 'swatch-pine.png', 'Pine'),
  photo('lamp', 2, 36, 210, 'Fnrw47_goSY', 'Pendant'),
  photo('sw-ember', 2, 262, 104, A + 'swatch-ember.png', 'Ember'),
  photo('cups', 3, 36, 300, '15vfRBmnpBc', 'Breakfast cups'),
  photo('birches', 4, 36, 330, 'oVmnp9KlOtk', 'Outside'),
  {
    key: 'note',
    type: 'memo',
    ...at(col(5), 36, 200, 150),
    data: { theme: 'LIGHT', content: '<h3>Birch Inn</h3><p>Six rooms. Oiled birch, wool, one warm lamp each.</p>' },
  },
  photo('sw-wool', 5, 202, 104, A + 'swatch-wool.png', 'Wool'),
];

export default [
  { id: 's02-birch', name: 'Birch Inn', room: 'snowy-railway', camera: { x: 0, y: 0, zoom: Z }, seconds: 3900, widgets: BIRCH_WIDGETS },
  { id: 's02-birch-light', name: 'Birch Inn', room: 'snowy-railway', polarity: 'light', camera: { x: 0, y: 0, zoom: Z }, seconds: 3900, widgets: BIRCH_WIDGETS },
];
