// 2페이지 1. 디자인 브레인스토밍, 많이 띄운 책상 — Tide(찬물 수영복 브랜드).
// 컬럼 · Cosmos · Behance · 사진 5 · 스와치 3 · 워드마크 · 메모 · 할 일 · 달력. 카페·커피 사진은 쓰지 않는다(2026-09-15 사용자).
import { todos } from './_util.mjs';
import { cloudSpace, RAIL_DENSE } from './_cloud.mjs';

const A = new URL('../assets/', import.meta.url).pathname;
const card = (key, url, title) => ({ key, type: 'browser', inColumn: true, data: { url, title } });
const photo = (key, x, y, w, h, source) => ({
  key,
  type: 'photo',
  x,
  y,
  w,
  h,
  data: source.startsWith('/') ? { file: source } : { unsplash: source },
});

export default cloudSpace({
  id: 'd01-tide',
  name: 'Tide',
  seconds: 8040,
  zoom: 0.7,
  b: { zoom: 0.9, sx: 128, sy: 40 },
  rail: RAIL_DENSE,
  widgets: [
    { key: 'refs', type: 'column', x: 0, y: 0, w: 300, h: 0, color: 'denim', data: { title: 'References', children: ['r1', 'r2', 'r3'] } },
    card('r1', 'https://www.behance.net/galleries/graphic-design/branding', 'Branding on Behance'),
    card('r2', 'https://en.wikipedia.org/wiki/Breton_shirt', 'Breton shirt - Wikipedia'),
    card('r3', 'https://en.wikipedia.org/wiki/Surf_culture', 'Surf culture - Wikipedia'),
    {
      key: 'todo',
      type: 'todo',
      x: 0,
      y: 728,
      w: 300,
      h: 300,
      color: 'teal',
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Wordmark sketches', true],
          ['Stripe spacing test', false],
          ['Moodboard to Jun', false],
        ]),
      },
    },

    {
      key: 'cosmos',
      type: 'browser',
      x: 332,
      y: 0,
      w: 780,
      h: 440,
      data: { url: 'https://www.cosmos.so/explore', zoom: 0.8 },
    },
    photo('rack', 332, 472, 240, 300, 'xeYEAvDdUqU'),
    photo('towel', 604, 472, 240, 300, '3q2PBvH7KGI'),
    photo('nose', 876, 472, 236, 300, '4diuPmlPerA'),
    photo('deep', 332, 804, 240, 125, A + 'swatch-tide-deep.png'),
    photo('foam', 604, 804, 240, 125, A + 'swatch-tide-foam.png'),
    photo('sand', 876, 804, 236, 123, A + 'swatch-tide-sand.png'),

    {
      key: 'memo',
      type: 'memo',
      x: 1144,
      y: 0,
      w: 420,
      h: 280,
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Tide, brand direction</h2><p>Swimwear for cold water. Pale blue, sand and one deep navy. Stripes only on the towel line.</p><p>Wordmark lowercase, loose tracking.</p>',
      },
    },
    {
      key: 'behance',
      type: 'browser',
      x: 1144,
      y: 312,
      w: 420,
      h: 380,
      data: { url: 'https://www.behance.net/galleries/graphic-design/branding', zoom: 0.8 },
    },
    { key: 'cal', type: 'calendar', x: 1144, y: 724, w: 340, h: 340, color: 'teal', data: { theme: 'LIGHT' } },

    photo('sea', 1596, 0, 204, 300, 'JP23z_-dA74'),
    photo('palm', 1596, 332, 204, 300, 'pwqx-MxddfA'),
    photo('mark', 1596, 664, 204, 255, A + 'wordmark-tide.png'),
  ],
});
