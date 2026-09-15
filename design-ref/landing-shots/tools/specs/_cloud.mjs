// Cloud 고정 컷(2026-09-15)의 공통 값. 위젯은 월드 좌표로 적고, 카메라는 여기서 계산한다.
// A 모음: 덩어리를 캔버스 가운데에. B 잘림: 덩어리의 왼쪽 위를 화면 (sx, sy)에 두어 오른쪽이 잘리게.
// C 큰 것 하나: 배치가 달라서 따로 만든 공간(railAs로 레일의 원래 자리를 대신한다).
export const CLOUD = { type: 'COLOR', value: '#f4f5f7' };

/** 촬영 때 레일에 보이는 공간, 위에서부터. */
export const RAIL_IDS = ['c01-lisbon', 'c02-ondo', 'c03-report', 'c04-northline', 'c05-studio'];
/** 2페이지(많이 띄운 책상) 컷의 레일. */
export const RAIL_DENSE = ['d01-tide', 'd02-lisbon', 'd03-kiln', 'c04-northline', 'c05-studio'];

const RAIL = 88;
const CANVAS_W = 1440 - RAIL;
const CANVAS_H = 900;

/** Same height rule as build.mjs / applyColumn. */
const heightOf = (w) => {
  if (w.type !== 'column') return w.h;
  const n = w.data.children.length;
  return 30 + (n ? 10 * 2 + n * 210 + (n - 1) * 8 : 96);
};

export function bbox(widgets) {
  const placed = widgets.filter((w) => !w.inColumn);
  const x = Math.min(...placed.map((w) => w.x));
  const y = Math.min(...placed.map((w) => w.y));
  const right = Math.max(...placed.map((w) => w.x + (w.type === 'column' ? 300 : w.w)));
  const bottom = Math.max(...placed.map((w) => w.y + heightOf(w)));
  return { x, y, w: right - x, h: bottom - y };
}

// screenX = RAIL + (worldX - cam.x) * zoom
export const centred = (box, zoom) => ({
  x: Math.round(box.x + box.w / 2 - CANVAS_W / 2 / zoom),
  y: Math.round(box.y + box.h / 2 - CANVAS_H / 2 / zoom),
  zoom,
});

export const pinned = (box, zoom, sx, sy) => ({
  x: Math.round(box.x - (sx - RAIL) / zoom),
  y: Math.round(box.y - sy / zoom),
  zoom,
});

export function cloudSpace({ id, name, seconds, widgets, zoom = 0.9, b, label = 'A', railAs, rail, shotArgs = [] }) {
  const box = bbox(widgets);
  const main = centred(box, zoom);
  const shots = { [label]: main, ...(b ? { B: pinned(box, b.zoom ?? 1, b.sx, b.sy) } : {}) };
  return { id, name, background: CLOUD, camera: main, seconds, widgets, shots, shotArgs, railAs, rail };
}

/** Same widget as in another spec, moved and resized. */
export const reuse = (widgets) => (key, x, y, w, h) => ({ ...widgets.find((it) => it.key === key), x, y, w, h });
