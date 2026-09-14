// 3. 전체 보기 — Midnight Observatory, zoomed out. One album release laid out as three marked
// groups on one grid across the sky; the ridge, the lake lights and the dome stay open.
import { checklist, todos } from './_util.mjs';

const Z = 0.46;
const w = (key, type, x, y, width, height, data, color) => ({ key, type, x, y, w: width, h: height, data, ...(color ? { color } : {}) });
const photo = (key, x, y, width, height, unsplash, caption, color = 'clay') =>
  w(key, 'photo', x, y, width, height, { unsplash, caption }, color);
const card = (key, url, title) => ({ key, type: 'browser', inColumn: true, data: { url, title } });

export const NIGHT_PAGE = 'https://unsplash.com/s/photos/purple-night';

export default {
  id: 's03-nightbird',
  name: 'Nightbird',
  room: 'midnight-observatory',
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 6120,
  widgets: [
    // Artwork
    photo('cover-a', 52, 87, 420, 620, 'W1fZKMIlkpM', 'Cover A'),
    photo('cover-b', 500, 87, 640, 440, 'WoIFB4L1Bzs', 'Cover B'),
    photo('neon', 500, 555, 300, 420, 'w0GodeDudS4', 'Type reference'),
    photo('road', 828, 555, 312, 420, 'a-5R9mE3ryI', 'Back cover'),
    w('cover-memo', 'memo', 52, 735, 420, 250, {
      theme: 'LIGHT',
      content:
        '<h2>Cover, v3</h2><p>Purple hour, one streetlight. Title small, bottom left.</p>' +
        checklist([['Pick A or B by Friday', false], ['Vinyl spec from the plant', true]]),
    }, 'clay'),

    // Music video
    w('mood', 'browser', 1190, 87, 1000, 700, { url: NIGHT_PAGE, zoom: 0.7 }, 'clay'),
    w('shots', 'column', 1190, 827, 300, 0, { title: 'Locations', children: ['c1', 'c2'] }, 'clay'),
    card('c1', 'https://en.wikipedia.org/wiki/Blue_hour', 'Blue hour - Wikipedia'),
    card('c2', 'https://en.wikipedia.org/wiki/Neon_sign', 'Neon sign - Wikipedia'),
    photo('frame-1', 1530, 827, 320, 250, '0gZy38p9XJE', 'Frame 04'),
    photo('frame-2', 1870, 827, 320, 250, '1LVposgGlcE', 'Frame 11'),

    // Release
    w('kanban', 'kanban', 2240, 87, 660, 330, {
      theme: 'LIGHT',
      columns: {
        todo: [{ id: 'k1', text: 'Press kit' }, { id: 'k2', text: 'Lyric cards' }],
        doing: [{ id: 'k3', text: 'Master, final pass' }, { id: 'k4', text: 'Cover art' }],
        done: [{ id: 'k5', text: 'Track order' }, { id: 'k6', text: 'Single date' }],
      },
    }, 'denim'),
    w('timer', 'timer', 2240, 447, 300, 240, { duration: 3000, timeLeft: 2280, isRunning: false, mode: 'FOCUS' }),
    w('release-todo', 'todo', 2570, 447, 330, 240, {
      theme: 'LIGHT',
      items: todos([['Single out, Oct 3', true], ['Radio list', false], ['Launch night venue', false]]),
    }, 'denim'),

    // Words
    w('lyrics', 'memo', 52, 1015, 420, 200, {
      theme: 'LIGHT',
      content: '<h3>Track 4</h3><p><em>We left the porch light on,<br>the lake was holding the sky.</em></p>',
    }),
  ],
};
