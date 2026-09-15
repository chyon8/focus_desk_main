// 4. 개발 문서·아이디어 — 큰 것: 문서·GitHub 페이지 카드 컬럼. 남색 + 흰색.
import { cloudSpace } from './_cloud.mjs';

const card = (key, url, title) => ({ key, type: 'browser', inColumn: true, data: { url, title } });

export default cloudSpace({
  id: 'c04-northline',
  name: 'Northline',
  seconds: 6300,
  b: { sx: 560, sy: 120 },
  widgets: [
    { key: 'refs', type: 'column', x: 0, y: 0, w: 300, h: 0, data: { title: 'References', children: ['r1', 'r2', 'r3'] } },
    card('r1', 'https://github.com/electron/electron', 'electron/electron'),
    card('r2', 'https://github.com/tauri-apps/tauri', 'tauri-apps/tauri'),
    card('r3', 'https://github.com/vitejs/vite', 'vitejs/vite'),
    {
      key: 'docs',
      type: 'browser',
      x: 324,
      y: 0,
      w: 700,
      h: 440,
      data: { url: 'https://react.dev/learn', zoom: 0.8 },
    },
    {
      key: 'idea',
      type: 'memo',
      x: 324,
      y: 464,
      w: 420,
      h: 232,
      color: 'denim',
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Northline</h2><p>Notes that work offline and sync when the train leaves the tunnel.</p><ul><li><p>One file per note</p></li><li><p>Conflicts shown side by side</p></li><li><p>No accounts in v1</p></li></ul>',
      },
    },
    { key: 'peaks', type: 'photo', x: 768, y: 464, w: 256, h: 232, data: { unsplash: 'qoxmgC9pCCM' } },
  ],
});
