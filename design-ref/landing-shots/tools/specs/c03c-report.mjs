// 3C. 보고서 작성, 큰 것 하나 — 차트 페이지가 화면 절반, 메모와 사진은 옆에. 할 일은 뺀다.
import report from './c03-report.mjs';
import { cloudSpace, reuse } from './_cloud.mjs';

const at = reuse(report.widgets);

export default cloudSpace({
  id: 'c03c-report',
  name: 'Q3 Report',
  seconds: report.seconds,
  label: 'C',
  railAs: 'c03-report',
  shotArgs: report.shotArgs,
  widgets: [at('chart', 0, 0, 880, 740), at('draft', 904, 0, 420, 300), at('vase', 904, 324, 420, 416)],
});
