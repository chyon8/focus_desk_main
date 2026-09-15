// 2. 디자인 브레인스토밍 — 큰 것: 사진 3장 + 스와치 2장 묶음. 크래프트 + 러스트.
import { cloudSpace } from './_cloud.mjs';

const A = new URL('../assets/', import.meta.url).pathname;

export default cloudSpace({
  id: 'c02-ondo',
  name: 'Ondo',
  seconds: 8040,
  b: { sx: 388, sy: 170 },
  shotArgs: ['--scroll', 'are.na:420'],
  widgets: [
    { key: 'shelf', type: 'photo', x: 0, y: 0, w: 240, h: 290, data: { unsplash: 'BZnJ20sEeao' } },
    { key: 'kraft', type: 'photo', x: 0, y: 314, w: 240, h: 133, data: { file: A + 'swatch-kraft.png' } },
    { key: 'rust', type: 'photo', x: 0, y: 471, w: 240, h: 133, data: { file: A + 'swatch-rust.png' } },
    { key: 'bag', type: 'photo', x: 264, y: 0, w: 240, h: 290, data: { unsplash: 'XmYmsVZU8Z8' } },
    { key: 'cup', type: 'photo', x: 264, y: 314, w: 240, h: 290, data: { unsplash: '_0tBT3rFq0M' } },
    {
      key: 'arena',
      type: 'browser',
      x: 528,
      y: 0,
      w: 784,
      h: 320,
      data: { url: 'https://www.are.na/mary-grayson-batts/coffee-packaging-cards', zoom: 0.8 },
    },
    {
      key: 'decide',
      type: 'memo',
      x: 528,
      y: 344,
      w: 420,
      h: 260,
      color: 'amber',
      data: {
        theme: 'LIGHT',
        content:
          '<h2>Ondo, direction</h2><p>Kraft bag, one rust ink. Lowercase wordmark, the roast date stamped by hand.</p><p>No gloss anywhere.</p><p>Friday: print the rust on uncoated stock and see how dark it dries.</p>',
      },
    },
    {
      key: 'timer',
      type: 'timer',
      x: 972,
      y: 344,
      w: 340,
      h: 260,
      data: { duration: 1500, timeLeft: 1112, isRunning: false, mode: 'FOCUS' },
    },
  ],
});
