// 5. 브라우저 여러 개 — 큰 것: 서로 다른 사이트 3개를 계단식으로. 색은 페이지를 따른다.
import { todos } from './_util.mjs';
import { cloudSpace } from './_cloud.mjs';

const page = (key, x, y, url, zoom = 0.8) => ({ key, type: 'browser', x, y, w: 700, h: 460, data: { url, zoom } });

export default cloudSpace({
  id: 'c05-studio',
  name: 'Studio',
  seconds: 12600,
  b: { sx: 388, sy: 120 },
  // Longer wait: with three pages loading, Earth draws its first-visit tooltip late.
  shotArgs: ['--wait', '16000', '--scroll', 'are.na:420', '--clicktext', 'earth.google:Dismiss'],
  widgets: [
    page('earth', 0, 0, 'https://earth.google.com/web/@38.7075,-9.1365,60a,1800d,35y,0h,60t,0r'),
    // 0.7: at 0.8 this width shows Are.na's Log in / Sign up buttons.
    page('arena', 120, 112, 'https://www.are.na/mary-grayson-batts/coffee-packaging-cards', 0.7),
    page('cosmos', 240, 224, 'https://www.cosmos.so/explore'),
    { key: 'desk', type: 'photo', x: 964, y: 0, w: 320, h: 380, data: { unsplash: 'eeuPtEVuofQ' } },
    {
      key: 'todo',
      type: 'todo',
      x: 964,
      y: 404,
      w: 320,
      h: 280,
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Send Ondo round two', true],
          ['Moodboard for Birch Inn', false],
          ['Invoice Nightbird', false],
        ]),
      },
    },
  ],
});
