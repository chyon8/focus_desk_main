// 2C. 디자인 브레인스토밍, 큰 것 하나 — Are.na 페이지가 화면 절반, 사진·스와치·메모는 옆에. 타이머는 뺀다.
import ondo from './c02-ondo.mjs';
import { cloudSpace, reuse } from './_cloud.mjs';

const at = reuse(ondo.widgets);

export default cloudSpace({
  id: 'c02c-ondo',
  name: 'Ondo',
  seconds: ondo.seconds,
  label: 'C',
  railAs: 'c02-ondo',
  shotArgs: ondo.shotArgs,
  widgets: [
    at('arena', 0, 0, 820, 700),
    at('bag', 844, 0, 200, 250),
    at('cup', 1068, 0, 200, 250),
    at('kraft', 844, 274, 200, 104),
    at('rust', 1068, 274, 200, 104),
    at('decide', 844, 402, 424, 298),
  ],
});
