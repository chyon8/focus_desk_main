// 3. 보고서 작성 — 큰 것: 차트 페이지. 올리브 + 회색.
import { todos } from './_util.mjs';
import { cloudSpace } from './_cloud.mjs';

export default cloudSpace({
  id: 'c03-report',
  name: 'Q3 Report',
  seconds: 10800,
  b: { sx: 388, sy: 150 },
  shotArgs: ['--scroll', 'ourworldindata:300'],
  widgets: [
    {
      key: 'chart',
      type: 'browser',
      x: 0,
      y: 0,
      w: 700,
      h: 600,
      // 1.0: narrower than the explorer's two-column layout, so the chart takes the full width.
      data: { url: 'https://ourworldindata.org/grapher/share-electricity-renewables', zoom: 1 },
    },
    {
      key: 'draft',
      type: 'memo',
      x: 724,
      y: 0,
      w: 520,
      h: 300,
      color: 'olive',
      data: {
        theme: 'LIGHT',
        content:
          '<h1>Q3 Report</h1><p>Renewables passed 30% of the world’s electricity this year. Solar did most of the work and grew faster than any other source.</p><p>Next: the section on storage, and a note on hydro under the map.</p>',
      },
    },
    { key: 'vase', type: 'photo', x: 724, y: 324, w: 176, h: 276, data: { unsplash: 'wl8wlWUm2Js' } },
    {
      key: 'todo',
      type: 'todo',
      x: 924,
      y: 324,
      w: 320,
      h: 276,
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Chart: share by source', true],
          ['Storage section', false],
          ['Send draft to Mira', false],
        ]),
      },
    },
  ],
});
