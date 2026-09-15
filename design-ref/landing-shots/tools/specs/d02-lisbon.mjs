// 2페이지 2. 여행 계획, 많이 띄운 책상 — 큰 골목 사진 · 사진 2 · Earth · 위키 · 컬럼 · 메모 · 할 일 · 달력 · 시계.
import { todos } from './_util.mjs';
import { cloudSpace, RAIL_DENSE } from './_cloud.mjs';

const wiki = (key, page, title) => ({
  key,
  type: 'browser',
  inColumn: true,
  data: { url: `https://en.wikipedia.org/wiki/${page}`, title: `${title} - Wikipedia` },
});
const photo = (key, x, y, w, h, unsplash) => ({ key, type: 'photo', x, y, w, h, data: { unsplash } });

export default cloudSpace({
  id: 'd02-lisbon',
  name: 'Lisbon',
  seconds: 5400,
  zoom: 0.7,
  b: { zoom: 0.9, sx: 128, sy: 40 },
  rail: RAIL_DENSE,
  shotArgs: ['--clicktext', 'earth.google:Dismiss'],
  widgets: [
    photo('alley', 0, 0, 520, 780, 'pJoNJ-9MbeQ'),
    photo('sea', 0, 812, 244, 300, '6MKJAtyNC9o'),
    photo('tram', 276, 812, 244, 300, 'iUS6UCl499A'),

    {
      key: 'map',
      type: 'browser',
      x: 552,
      y: 0,
      w: 772,
      h: 420,
      data: { url: 'https://earth.google.com/web/@38.7115,-9.1335,60a,1600d,35y,0h,60t,0r', zoom: 0.8 },
    },
    {
      key: 'days',
      type: 'memo',
      x: 552,
      y: 452,
      w: 420,
      h: 340,
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Day 1 · Alfama</h2><p>Castle at nine, before the heat. Tram 28 up to Graça.</p><h2>Day 2 · Sintra</h2><p>Train from Rossio at 8:11. Pena first, then Regaleira.</p><h2>Day 3 · Belém</h2><p>Pastéis at eight, then walk the river to the tower.</p>',
      },
    },
    {
      key: 'book',
      type: 'todo',
      x: 1004,
      y: 452,
      w: 320,
      h: 340,
      color: 'teal',
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Flights, TAP 1432', true],
          ['Sintra train tickets', false],
          ['Table at Ramiro', false],
        ]),
      },
    },
    { key: 'cal', type: 'calendar', x: 552, y: 824, w: 340, h: 340, color: 'teal', data: { theme: 'LIGHT' } },
    {
      key: 'tram-page',
      type: 'browser',
      x: 924,
      y: 824,
      w: 400,
      h: 340,
      data: { url: 'https://en.wikipedia.org/wiki/Trams_in_Lisbon', zoom: 0.8 },
    },

    { key: 'see', type: 'column', x: 1356, y: 0, w: 300, h: 0, color: 'denim', data: { title: 'To see', children: ['s1', 's2', 's3'] } },
    wiki('s1', 'Bel%C3%A9m_Tower', 'Belém Tower'),
    wiki('s2', 'Pena_Palace', 'Pena Palace'),
    wiki('s3', 'Pastel_de_nata', 'Pastel de nata'),
    { key: 'clock', type: 'clock', x: 1356, y: 728, w: 300, h: 380, data: { theme: 'LIGHT' } },
  ],
});
