// 1. 여행 계획 — 큰 것: 햇빛 골목 사진. 테라코타 + 하늘색.
import { todos } from './_util.mjs';
import { cloudSpace } from './_cloud.mjs';

export default cloudSpace({
  id: 'c01-lisbon',
  name: 'Lisbon',
  seconds: 5400,
  b: { sx: 388, sy: 150 },
  shotArgs: ['--clicktext', 'earth.google:Dismiss'],
  widgets: [
    { key: 'alley', type: 'photo', x: 0, y: 0, w: 440, h: 684, data: { unsplash: 'pJoNJ-9MbeQ' } },
    {
      key: 'map',
      type: 'browser',
      x: 464,
      y: 0,
      w: 500,
      h: 380,
      data: { url: 'https://earth.google.com/web/@38.7115,-9.1335,60a,1600d,35y,0h,60t,0r', zoom: 0.8 },
    },
    { key: 'sea', type: 'photo', x: 988, y: 0, w: 256, h: 380, data: { unsplash: '6MKJAtyNC9o' } },
    {
      key: 'days',
      type: 'memo',
      x: 464,
      y: 404,
      w: 420,
      h: 280,
      color: 'clay',
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Day 1 · Alfama</h2><p>Castle at nine, before the heat. Tram 28 up to Graça for the view.</p><h2>Day 2 · Belém</h2><p>Pastéis at eight, then walk the river to the tower.</p>',
      },
    },
    {
      key: 'book',
      type: 'todo',
      x: 908,
      y: 404,
      w: 336,
      h: 280,
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Flights, TAP 1432', true],
          ['Sintra train tickets', false],
          ['Table at Ramiro', false],
        ]),
      },
    },
  ],
});
