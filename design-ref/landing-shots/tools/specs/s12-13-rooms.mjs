// 12–13. Shot 1's three widgets in two rooms outside the four, placed around each room's own focal point.
import { screen } from './_util.mjs';
import { ondoWidgets } from './s01-ondo.mjs';

const Z = 1.15;
const at = screen(Z);
const camera = { x: 0, y: 0, zoom: Z };

// Aquarium: the fish, the ray and the girl on the bench stay open; the widgets take the left pillar and the floor.
const aquarium = {
  id: 's12-ondo-aquarium',
  name: 'Ondo',
  room: 'aquarium',
  camera,
  seconds: 8040,
  widgets: ondoWidgets(at, {
    timer: [124, 56, 290, 222],
    photo: [124, 300, 290, 400],
    memo: [438, 650, 330, 214],
  }),
};

// Greenhouse, with snow: the glasshouse, the lantern path and the walker stay open.
const greenhouse = {
  id: 's13-ondo-greenhouse',
  name: 'Ondo',
  room: 'greenhouse',
  camera,
  seconds: 8040,
  widgets: ondoWidgets(at, {
    photo: [150, 64, 290, 400],
    memo: [410, 330, 420, 222],
    timer: [130, 640, 290, 222],
  }),
};

export default [aquarium, greenhouse];
