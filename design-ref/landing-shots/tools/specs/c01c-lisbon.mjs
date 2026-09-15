// 1C. 여행 계획, 큰 것 하나 — 골목 사진이 화면 절반. 내용은 c01-lisbon과 같다.
import lisbon from './c01-lisbon.mjs';
import { cloudSpace, reuse } from './_cloud.mjs';

const at = reuse(lisbon.widgets);

export default cloudSpace({
  id: 'c01c-lisbon',
  name: 'Lisbon',
  seconds: lisbon.seconds,
  label: 'C',
  railAs: 'c01-lisbon',
  shotArgs: lisbon.shotArgs,
  widgets: [
    at('alley', 0, 0, 560, 864),
    at('map', 584, 0, 540, 300),
    at('days', 584, 324, 540, 260),
    at('book', 584, 608, 320, 256),
    at('sea', 928, 608, 196, 256),
  ],
});
