// The desk the first plan (A–D) shares: a left column, a page in the bottom band, a todo and a
// row of saved web apps on the right. Rooms swap; the slots stay.
import { screen, todos } from './_util.mjs';

// At 0.85 the todo list showed one row: the list gets what the header and the input leave over.
export const DESK_ZOOM = 0.72;
const at = screen(DESK_ZOOM);

/** Default slot rects, in screen px. A room may move one slot to keep its own focal point clear. */
export const SLOTS = {
  memo: [112, 44, 280, 220],
  photo: [112, 284, 280, 300],
  timer: [112, 604, 280, 250],
  page: [416, 464, 560, 250],
  // The todo's text grows with its width, so a wide todo shows one row. Keep it narrow.
  todo: [1000, 464, 240, 300],
  tiles: [416, 730, 560, 134],
};

const tile = (key, name, url, rect) => ({
  key,
  type: 'webapp',
  ...at(...rect),
  data: { appId: name.toLowerCase(), name, url, homeUrl: url, icon: null, open: false },
});

export function desk(content, slots = {}) {
  const s = { ...SLOTS, ...slots };
  const widgets = [
    { key: 'memo', type: 'memo', ...at(...s.memo), color: 'clay', data: { theme: 'LIGHT', content: content.memo } },
    { key: 'photo', type: 'photo', ...at(...s.photo), data: content.photo },
    { key: 'timer', type: 'timer', ...at(...s.timer), data: { duration: 1500, timeLeft: 1122, isRunning: false, mode: 'FOCUS' } },
    { key: 'page', type: 'browser', ...at(...s.page), color: 'clay', data: { url: content.page, zoom: content.pageZoom ?? 0.7 } },
    { key: 'todo', type: 'todo', ...at(...s.todo), color: 'clay', data: { theme: 'LIGHT', items: todos(content.todos) } },
  ];
  if (content.apps?.length) {
    const [x, y, w, h] = s.tiles;
    const gap = 10;
    const each = (w - gap * (content.apps.length - 1)) / content.apps.length;
    content.apps.forEach(([name, url], i) => widgets.push(tile(`app${i}`, name, url, [x + i * (each + gap), y, each, h])));
  }
  return widgets;
}

export const ONDO_DESK = {
  memo: '<h2>Decisions</h2><p>Kraft bag, one ink.</p><p>Lowercase wordmark.</p><p>Roast date by hand.</p>',
  photo: { url: '/wallpapers/cozy-cafe.webp', caption: 'Mood, evening' },
  page: 'https://www.are.na/mary-grayson-batts/coffee-packaging-cards',
  todos: [
    ['Send moodboard to Mina', true],
    ['Pick the kraft stock', false],
    ['Printer quote, 500 bags', false],
  ],
  apps: [
    ['Figma', 'https://www.figma.com/files'],
    ['Notion', 'https://www.notion.so'],
    ['Gmail', 'https://mail.google.com'],
    ['Slack', 'https://app.slack.com'],
  ],
};
