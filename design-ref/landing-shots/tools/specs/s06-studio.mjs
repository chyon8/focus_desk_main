// 6. 사진 없음 — Editorial theme. Everything on one 32px grid, two marks.
import { screen, todos } from './_util.mjs';

const Z = 1.0;
const at = screen(Z);

export default {
  id: 's06-studio',
  name: 'Studio',
  room: 'editorial',
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 3000,
  widgets: [
    {
      key: 'memo',
      type: 'memo',
      ...at(112, 56, 400, 384),
      color: 'denim',
      data: {
        theme: 'LIGHT',
        content:
          '<h1>Studio, Q4</h1><p>Three clients at once is the ceiling. Say no to the fourth until Ondo ships.</p><p>Mornings are for drawing. Calls after two.</p><p>Raise the day rate in January.</p>',
      },
    },
    {
      key: 'kanban',
      type: 'kanban',
      ...at(544, 56, 520, 384),
      color: 'clay',
      data: {
        theme: 'LIGHT',
        columns: {
          todo: [{ id: 'k1', text: 'Birch Inn signage' }, { id: 'k2', text: 'Nightbird press kit' }],
          doing: [{ id: 'k3', text: 'Ondo bag label' }, { id: 'k4', text: 'Field Mag cover' }],
          done: [{ id: 'k5', text: 'Ondo wordmark' }],
        },
      },
    },
    { key: 'cal', type: 'calendar', ...at(1096, 56, 320, 384), data: { theme: 'LIGHT' } },
    {
      key: 'page',
      type: 'browser',
      ...at(112, 472, 592, 384),
      data: { url: 'https://en.wikipedia.org/wiki/Swiss_Style_(design)', zoom: 0.8 },
    },
    {
      key: 'todo',
      type: 'todo',
      ...at(736, 472, 320, 384),
      color: 'denim',
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Invoice Ondo, round two', true],
          ['Quote for Birch Inn', false],
          ['Portfolio: add Nightbird', false],
          ['Renew font licences', false],
          ['Book the accountant', true],
        ]),
      },
    },
    { key: 'clock', type: 'clock', ...at(1088, 472, 328, 384), data: { theme: 'LIGHT' } },
  ],
};
