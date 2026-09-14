// 4. 페이지 하나 — Summer Lake with a light UI. One tall page of lake photos; the boat, the dock
// and the peaks stay open.
import { screen, todos } from './_util.mjs';

const Z = 1.0;
const at = screen(Z);

export const FIELD_PAGE = 'https://earth.google.com/web/@47.0,8.43,434a,26000d,35y,20h,62t,0r';

export default {
  id: 's04-fieldmag',
  name: 'Field Mag',
  room: 'summer-lake',
  polarity: 'light',
  camera: { x: 0, y: 0, zoom: Z },
  seconds: 2700,
  widgets: [
    { key: 'page', type: 'browser', ...at(112, 96, 606, 760), color: 'clay', data: { url: FIELD_PAGE, zoom: 0.8 } },
    {
      key: 'timer',
      type: 'timer',
      ...at(772, 640, 290, 222),
      data: { duration: 1500, timeLeft: 1500, isRunning: false, mode: 'FOCUS' },
    },
    {
      key: 'todo',
      type: 'todo',
      ...at(1090, 540, 322, 322),
      color: 'clay',
      data: {
        theme: 'LIGHT',
        items: todos([
          ['Six lakes, shortlist', true],
          ['Lucerne ferry times', false],
          ['Boat shoot brief', false],
          ['Captions by Monday', false],
        ]),
      },
    },
  ],
};
