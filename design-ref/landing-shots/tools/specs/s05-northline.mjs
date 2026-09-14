// 5. 컬럼 — Snowy Railway. Research gathered into two marked columns of page cards; the cabin stays open.
import { checklist, screen } from './_util.mjs';

const Z = 1.0;
const at = screen(Z);
const wiki = (key, page, title) => ({
  key,
  type: 'browser',
  inColumn: true,
  data: { url: `https://en.wikipedia.org/wiki/${page}`, title: `${title} - Wikipedia` },
});

export default {
  id: 's05-northline',
  name: 'North Line',
  room: 'snowy-railway',
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 4500,
  widgets: [
    { key: 'places', type: 'column', ...at(112, 40, 300, 0), color: 'clay', data: { title: 'Stops', children: ['p1', 'p2', 'p3'] } },
    wiki('p1', 'Lake_Mash%C5%AB', 'Lake Mashū'),
    wiki('p2', 'Sapporo_Snow_Festival', 'Sapporo Snow Festival'),
    wiki('p3', 'Nemuro_Main_Line', 'Nemuro Main Line'),

    { key: 'wild', type: 'column', ...at(436, 40, 300, 0), color: 'denim', data: { title: 'On the way', children: ['w1', 'w2', 'w3'] } },
    wiki('w1', 'Red-crowned_crane', 'Red-crowned crane'),
    wiki('w2', 'Drift_ice', 'Drift ice'),
    wiki('w3', 'Lake_Akan', 'Lake Akan'),

    {
      key: 'train',
      type: 'photo',
      ...at(930, 40, 480, 300),
      color: 'denim',
      data: { unsplash: 'Quh8IRQc5EU', caption: 'Kushiro, 6:12' },
    },
    {
      key: 'outline',
      type: 'memo',
      ...at(1004, 660, 406, 200),
      color: 'denim',
      data: {
        theme: 'LIGHT',
        content: '<h2>North Line, 2,400 words</h2>' + checklist([['Sapporo to Asahikawa', true], ['Asahikawa to Kushiro', false], ['The last stop', false]]),
      },
    },
  ],
};
