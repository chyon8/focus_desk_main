// 2페이지 3. 프로덕트 아이디어 브레인스토밍, 많이 띄운 책상 — Kiln(도예 공방 예약 앱).
// 컬럼 · Cosmos · GitHub · 칸반 · 사진 3 · 메모 · 할 일 · 달력 · 타이머 · 시계.
import { todos } from './_util.mjs';
import { cloudSpace, RAIL_DENSE } from './_cloud.mjs';

const card = (key, url, title) => ({ key, type: 'browser', inColumn: true, data: { url, title } });
const photo = (key, x, y, w, h, unsplash) => ({ key, type: 'photo', x, y, w, h, data: { unsplash } });

export default cloudSpace({
  id: 'd03-kiln',
  name: 'Kiln',
  seconds: 9900,
  zoom: 0.7,
  b: { zoom: 0.9, sx: 128, sy: 40 },
  rail: RAIL_DENSE,
  widgets: [
    { key: 'refs', type: 'column', x: 0, y: 0, w: 300, h: 0, color: 'denim', data: { title: 'Look at', children: ['r1', 'r2', 'r3'] } },
    card('r1', 'https://github.com/calcom/cal.com', 'calcom/cal.com'),
    card('r2', 'https://en.wikipedia.org/wiki/Pottery', 'Pottery - Wikipedia'),
    card('r3', 'https://www.behance.net/galleries/ui-ux', 'UI/UX on Behance'),
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
          ['Talk to 5 studio owners', true],
          ['Sketch booking flow', false],
          ['Price: per wheel hour?', false],
        ]),
      },
    },

    {
      key: 'cosmos',
      type: 'browser',
      x: 332,
      y: 0,
      w: 700,
      h: 440,
      data: { url: 'https://www.cosmos.so/explore', zoom: 0.8 },
    },
    {
      key: 'board',
      type: 'kanban',
      x: 332,
      y: 472,
      w: 700,
      h: 400,
      color: 'denim',
      data: {
        theme: 'LIGHT',
        columns: {
          todo: [
            { id: 'k1', text: 'Waitlist page' },
            { id: 'k2', text: 'Kiln firing calendar' },
            { id: 'k3', text: 'Class packs' },
          ],
          doing: [
            { id: 'k4', text: 'Booking flow, 3 screens' },
            { id: 'k5', text: 'Studio interviews' },
          ],
          done: [{ id: 'k6', text: 'Name: Kiln' }],
        },
      },
    },
    photo('wheel', 332, 904, 334, 224, 'pSo0u53FF10'),
    photo('hands', 698, 904, 334, 224, 'QRVSQH7OeX4'),

    {
      key: 'pitch',
      type: 'memo',
      x: 1064,
      y: 0,
      w: 420,
      h: 300,
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Kiln</h2><p>Book a wheel at your local pottery studio in thirty seconds. Studios fill empty hours; people stop calling.</p><p>Start with three studios in one city.</p>',
      },
    },
    {
      key: 'gh',
      type: 'browser',
      x: 1064,
      y: 332,
      w: 420,
      h: 420,
      data: { url: 'https://github.com/calcom/cal.com', zoom: 0.8 },
    },
    { key: 'cal', type: 'calendar', x: 1064, y: 784, w: 340, h: 340, color: 'teal', data: { theme: 'LIGHT' } },

    {
      key: 'timer',
      type: 'timer',
      x: 1516,
      y: 0,
      w: 284,
      h: 240,
      color: 'teal',
      data: { duration: 1500, timeLeft: 845, isRunning: false, mode: 'FOCUS' },
    },
    photo('vase', 1516, 272, 284, 380, 'QTuikYkByFs'),
    { key: 'clock', type: 'clock', x: 1516, y: 684, w: 284, h: 340, data: { theme: 'LIGHT' } },
  ],
});
