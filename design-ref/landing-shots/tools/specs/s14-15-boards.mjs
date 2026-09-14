// 14–15. Masonry boards in the rooms: Ondo on the floor of the Rainy Attic, Nightbird across the
// Midnight Observatory sky. Cards are 200px wide on 16px gutters; heights follow each picture.
import { screen } from './_util.mjs';

const Z = 1.0;
const at = screen(Z);
const A = new URL('../assets/', import.meta.url).pathname;
const col = (i) => 112 + i * 216;
const photo = (key, c, y, h, source, caption) => ({
  key,
  type: 'photo',
  ...at(col(c), y, 200, h),
  data: { ...(source.startsWith('/') ? { file: source } : { unsplash: source }), caption },
});
const note = (key, c, y, h, content) => ({ key, type: 'memo', ...at(col(c), y, 200, h), data: { theme: 'LIGHT', content } });

// Ondo: a low board under the window. The window, the lamp and the plants stay open.
const ONDO_BOARD = [
  photo('shelf', 0, 460, 300, 'BZnJ20sEeao', 'The shop, back wall'),
  photo('sw-espresso', 0, 776, 104, A + 'swatch-espresso.png', 'Espresso'),
  photo('mark', 1, 460, 250, A + 'wordmark-ondo.png', 'Bag label, v4'),
  photo('sw-kraft', 1, 726, 104, A + 'swatch-kraft.png', 'Kraft'),
  photo('heart', 2, 460, 300, '_0tBT3rFq0M', 'Cups on terrazzo'),
  photo('sw-rust', 2, 776, 104, A + 'swatch-rust.png', 'Rust'),
  photo('pink', 3, 460, 133, 'PGctPZuz65I', 'Bag and cup'),
  photo('top', 3, 609, 133, 'EjbQQ0fgkFE', 'Flat white'),
  photo('sw-oat', 3, 758, 104, A + 'swatch-oat.png', 'Oat'),
  photo('beans', 4, 460, 133, '5Q-lMT1T15c', 'Takeaway cup'),
  note('note', 4, 609, 160, '<h3>Ondo</h3><p>One ink on kraft. Lowercase. The date stamped by hand.</p>'),
  photo('stool', 5, 460, 250, 'XmYmsVZU8Z8', 'Sample bag'),
];

// Nightbird: the board across the sky. The ridge, the lake lights and the dome stay open.
const NIGHT_BOARD = [
  photo('lamp', 0, 36, 300, 'W1fZKMIlkpM', 'Cover A'),
  photo('sw-violet', 0, 352, 104, A + 'swatch-violet.png', 'Violet'),
  photo('mark', 1, 36, 200, A + 'wordmark-nightbird.png', 'Title, v2'),
  photo('spin', 1, 252, 132, 'Jm9P0mDPo6A', 'Label side'),
  photo('sw-rose', 1, 400, 104, A + 'swatch-rose.png', 'Rose'),
  photo('alley', 2, 36, 300, 'rTanMe3sd2E', 'Video, street'),
  photo('sw-night', 2, 352, 104, A + 'swatch-night.png', 'Night'),
  photo('orange', 3, 36, 132, 'OXhQHGiez_k', 'Test pressing'),
  photo('light', 3, 184, 286, 'ZC9GARkO-po', 'Video, last shot'),
  photo('spines', 4, 36, 300, 'EuMVFkzkYuU', 'Shelf reference'),
  photo('sw-lilac', 4, 352, 104, A + 'swatch-lilac.png', 'Lilac'),
  note('note', 5, 36, 150, '<h3>Nightbird</h3><p>Purple hour, one streetlight. Title small, bottom left.</p>'),
  photo('blue', 5, 202, 133, 'g8LeTWksLJI', 'Video, rain'),
];

const room = (id, name, roomKey, widgets, extra = {}) => ({
  id,
  name,
  room: roomKey,
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 8040,
  widgets,
  ...extra,
});

export default [
  room('s14-ondo-board', 'Ondo', 'rainy-attic', ONDO_BOARD),
  room('s14-ondo-board-light', 'Ondo', 'rainy-attic', ONDO_BOARD, { polarity: 'light' }),
  room('s15-nightbird-board', 'Nightbird', 'midnight-observatory', NIGHT_BOARD),
  room('s15-nightbird-board-light', 'Nightbird', 'midnight-observatory', NIGHT_BOARD, { polarity: 'light' }),
];
