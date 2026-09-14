// 1. 여백 — Rainy Attic. Three widgets in a low band; the bed, the window and the lamp stay open.
import { checklist, screen } from './_util.mjs';

const Z = 1.15;
const at = screen(Z);

export const ONDO_MEMO =
  '<h1>Ondo Coffee</h1><p>Rebrand, round two. Agreed on Thursday:</p>' +
  checklist([
    ['One ink on kraft, no window', true],
    ['Lowercase wordmark', true],
    ['Roast date stamped by hand', false],
  ]);

export const ONDO_PHOTO = { unsplash: 'XmYmsVZU8Z8', caption: 'Sample bag, 120g kraft' };
export const ONDO_TIMER = { duration: 1500, timeLeft: 1122, isRunning: false, mode: 'FOCUS' };

/** Screen rects of the three widgets, shared by the rooms that reuse this space. */
export function ondoWidgets(at, { timer, photo, memo }) {
  return [
    { key: 'timer', type: 'timer', ...at(...timer), data: ONDO_TIMER },
    { key: 'photo', type: 'photo', ...at(...photo), color: 'clay', data: ONDO_PHOTO },
    { key: 'memo', type: 'memo', ...at(...memo), color: 'clay', data: { theme: 'LIGHT', content: ONDO_MEMO } },
  ];
}

export default {
  id: 's01-ondo',
  name: 'Ondo',
  room: 'rainy-attic',
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 8040,
  widgets: ondoWidgets(at, {
    timer: [124, 606, 300, 222],
    photo: [470, 470, 300, 410],
    memo: [736, 604, 420, 226],
  }),
};
