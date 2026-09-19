import { Camera, MIN_ZOOM } from './camera';

/**
 * 정렬(G)이 쓰는 배치 계산.
 *
 * `layout.ts`의 `arrange`와 나뉘어 있는 이유는 하나다 — 그쪽은 칸에 맞춰 위젯
 * 크기를 다시 정하고, 이쪽은 자리만 바꾼다. 900×620 브라우저를 300 폭 칸에
 * 넣으면 주소줄이 사라지고 시작 페이지가 두 열로 줄어서, 정렬 한 번에 쓸 수
 * 있던 브라우저가 못 쓰는 브라우저가 됐다. `arrange`는 온보딩과 크롬 가져오기가
 * 계속 쓰므로 그대로 두고, 사용자가 누르는 정렬만 이 파일로 옮겼다.
 */

/** 크기를 바꿀 수 없게 위치만 돌려준다. 반환 타입이 그 약속이다. */
export type Spot = { x: number; y: number };
export type Spots = Record<string, Spot>;

export interface TidyBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TidyArea {
  width: number;
  height: number;
}

/** 사용자가 고르는 정렬 방식. 공간마다 마지막에 쓴 것이 다음 기본이 된다. */
export type ArrangeMode = 'compact' | 'rows';

/** 위젯 사이 간격(캔버스 좌표). `ARRANGE_GAP`(32)과 별개다 — 그쪽은 새 위젯 놓기·복제가 쓴다. */
export const TIDY_GAP = 16;

/** 화면 바깥 여백. `fitCamera`의 `FIT_PADDING`과 같은 값이라 결과가 배율 1에 맞는다. */
const TIDY_PADDING = 20;

/** Rows에서 고를 수 있는 열 수의 상한. Auto는 이 범위에서 후보를 만든다. */
const MAX_COLUMNS = 8;

/** 배율 비교에서 같다고 볼 오차. 후보가 부동소수로 갈리는 것을 막는다. */
const ZOOM_EPSILON = 1e-6;

/**
 * 집는 순서: 지금 놓인 자리 그대로 위에서 아래로, 같으면 왼쪽부터, 그것도 같으면
 * id로. 클릭 순서나 현재 배율은 보지 않는다 — 같은 책상을 두 번 정렬하면 같은
 * 책상이 나와야 한다.
 */
function inPlaceOrder(boxes: TidyBox[]): TidyBox[] {
  return [...boxes].sort((a, b) =>
    a.y !== b.y ? a.y - b.y : a.x !== b.x ? a.x - b.x : a.id < b.id ? -1 : 1
  );
}

/** 놓인 결과의 경계 상자. 후보 비교와 카메라가 읽는다. */
function boundsOf(placed: { spot: Spot; box: TidyBox }[]) {
  const width = Math.max(...placed.map((p) => p.spot.x + p.box.width));
  const height = Math.max(...placed.map((p) => p.spot.y + p.box.height));
  return { width, height };
}

type Candidate = { placed: { spot: Spot; box: TidyBox }[]; width: number; height: number };

function candidateOf(placed: { spot: Spot; box: TidyBox }[]): Candidate {
  return { placed, ...boundsOf(placed) };
}

/**
 * 후보 중 하나를 고른다: 전체를 가장 크게 보여주는 것 → 동률이면 경계 면적이
 * 작은 것 → 그다음 가로폭이 작은 것.
 *
 * 배율에 상한을 걸지 않고 비교한다. 상한은 카메라가 정할 일이고, 여기서 1로
 * 잘라버리면 위젯이 적을 때 모든 후보가 동률이 되어 다음 기준으로 넘어간다.
 */
function bestOf(candidates: Candidate[], area: TidyArea): Candidate {
  const inner = {
    width: Math.max(1, area.width - TIDY_PADDING * 2),
    height: Math.max(1, area.height - TIDY_PADDING * 2),
  };
  const zoomOf = (c: Candidate) =>
    Math.min(inner.width / Math.max(1, c.width), inner.height / Math.max(1, c.height));

  return candidates.reduce((best, c) => {
    const [a, b] = [zoomOf(c), zoomOf(best)];
    if (a - b > ZOOM_EPSILON) return c;
    if (b - a > ZOOM_EPSILON) return best;
    const [areaC, areaBest] = [c.width * c.height, best.width * best.height];
    if (areaC !== areaBest) return areaC < areaBest ? c : best;
    return c.width < best.width ? c : best;
  });
}

/**
 * Rows: 한 줄에 `columns`개씩, 왼쪽부터 윗변을 맞춰 놓는다.
 *
 * 열 폭은 그 열에서 가장 넓은 위젯의 폭이다 — 세로선이 맞아야 "줄 맞춤"으로
 * 보인다. 위젯을 그 폭으로 늘리지는 않고 왼쪽에 붙인다. 행 높이도 같은 식으로
 * 그 행에서 가장 높은 위젯이 정하고, 짧은 위젯 아래는 비워 둔다.
 */
function rowsInto(ordered: TidyBox[], columns: number): { spot: Spot; box: TidyBox }[] {
  const rows: TidyBox[][] = [];
  for (let i = 0; i < ordered.length; i += columns) rows.push(ordered.slice(i, i + columns));

  const colWidths: number[] = [];
  for (let c = 0; c < columns; c++) {
    colWidths[c] = Math.max(0, ...rows.map((row) => row[c]?.width ?? 0));
  }
  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < columns; c++) {
    colX[c] = x;
    x += colWidths[c] + TIDY_GAP;
  }

  const placed: { spot: Spot; box: TidyBox }[] = [];
  let y = 0;
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) placed.push({ spot: { x: colX[c], y }, box: row[c] });
    y += Math.max(...row.map((b) => b.height)) + TIDY_GAP;
  }
  return placed;
}

/**
 * Compact: 순서대로 집어서 놓을 수 있는 가장 위·왼쪽 빈자리에 넣는다.
 *
 * 검사할 자리는 원점과, 이미 놓인 위젯들의 오른쪽·아래 모서리다. 그 지점들만
 * 봐도 구멍의 왼쪽 위는 전부 걸린다.
 *
 * **집은 순서보다 앞(위·왼쪽)에는 놓지 않는다.** 처음에는 늦게 집힌 위젯이 더
 * 위로 올라가도 두게 했는데, 그러면 G를 두 번 눌렀을 때 결과가 달라진다 —
 * 집는 순서를 지금 놓인 자리에서 읽으므로, 1회차가 순서를 뒤섞으면 2회차는
 * 다른 순서로 집어 다른 배치를 만든다. 무작위 책상 500개 중 32개에서 났다.
 * 자리가 뒤로만 가면 결과를 `y → x`로 읽은 것이 집은 순서와 같아져 두 번째가
 * 첫 번째와 같아진다. 짧은 위젯 아래로 다음 것이 올라오는 것은 그대로라 Rows와
 * 같은 그림이 되지도 않는다.
 */
function compactInto(ordered: TidyBox[], targetWidth: number): { spot: Spot; box: TidyBox }[] {
  const placed: { spot: Spot; box: TidyBox }[] = [];
  // 검사할 x·y 후보. 놓을 때마다 그 위젯의 오른쪽·아래가 더해진다.
  const xs = new Set([0]);
  const ys = new Set([0]);
  let last: Spot = { x: 0, y: 0 };

  const hits = (spot: Spot, box: TidyBox) =>
    placed.some(
      (p) =>
        spot.x < p.spot.x + p.box.width + TIDY_GAP &&
        spot.x + box.width + TIDY_GAP > p.spot.x &&
        spot.y < p.spot.y + p.box.height + TIDY_GAP &&
        spot.y + box.height + TIDY_GAP > p.spot.y
    );

  for (const box of ordered) {
    const spots: Spot[] = [];
    for (const y of ys) {
      if (y < last.y) continue;
      for (const x of xs) {
        if (y === last.y && x < last.x) continue;
        if (x + box.width <= targetWidth + ZOOM_EPSILON) spots.push({ x, y });
      }
    }
    spots.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
    const spot = spots.find((s) => !hits(s, box)) ?? {
      x: 0,
      y: Math.max(0, ...placed.map((p) => p.spot.y + p.box.height + TIDY_GAP)),
    };
    placed.push({ spot, box });
    xs.add(spot.x + box.width + TIDY_GAP);
    ys.add(spot.y + box.height + TIDY_GAP);
    last = spot;
  }
  return placed;
}

/**
 * 정렬 결과 — 위젯마다 `{x, y}`. 원점 기준이라 부르는 쪽이 기준점을 더한다.
 *
 * `columns`는 Rows에서만 읽는다. 없으면 한 줄에 1개부터 위젯 수까지 후보를
 * 만들어 비교한다. Compact의 목표 가로폭 후보는 Rows 후보들의 전체 가로폭과
 * 가용 화면 폭이고, 가장 넓은 위젯보다 좁은 후보는 버린다.
 */
export function tidy(
  boxes: TidyBox[],
  area: TidyArea,
  mode: ArrangeMode,
  columns?: number
): Spots {
  if (boxes.length === 0) return {};
  const ordered = inPlaceOrder(boxes);

  const counts = columns
    ? [Math.max(1, Math.min(columns, ordered.length))]
    : Array.from({ length: Math.min(ordered.length, MAX_COLUMNS) }, (_, i) => i + 1);
  const rowCandidates = counts.map((n) => candidateOf(rowsInto(ordered, n)));

  let best: Candidate;
  if (mode === 'rows') {
    best = columns ? rowCandidates[0] : bestOf(rowCandidates, area);
  } else {
    const widest = Math.max(...ordered.map((b) => b.width));
    const widths = [...rowCandidates.map((c) => c.width), area.width - TIDY_PADDING * 2].filter(
      (w) => w >= widest
    );
    // 어떤 후보도 가장 넓은 위젯을 담지 못하면 그 위젯 폭이 목표가 된다 — 한 줄이다.
    const targets = [...new Set(widths.length ? widths : [widest])];
    best = bestOf(
      targets.map((w) => candidateOf(compactInto(ordered, w))),
      area
    );
  }

  return Object.fromEntries(best.placed.map((p) => [p.box.id, p.spot]));
}

/**
 * 정렬 직후의 카메라: 전체가 들어오게 맞추되 **100%를 넘기지 않는다.**
 *
 * 위젯이 한두 개뿐이면 맞춤 배율이 200%, 300%가 나오는데 그만큼 확대해봐야
 * 글자만 커지고 읽을 내용은 그대로다. 자른 배율을 기준으로 중심을 다시 잡는다.
 * 이 상한은 G 직후에만 적용하고, 손으로 하는 줌과 페이지 줌은 제한하지 않는다.
 */
export function tidyCamera(
  boxes: TidyBox[],
  area: { y: number; width: number; height: number }
): Camera | null {
  if (boxes.length === 0) return null;

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  const zoom = Math.min(
    1,
    Math.max(
      MIN_ZOOM,
      Math.min(
        (area.width - TIDY_PADDING * 2) / Math.max(1, maxX - minX),
        (area.height - TIDY_PADDING * 2) / Math.max(1, maxY - minY)
      )
    )
  );

  return {
    zoom,
    x: (minX + maxX) / 2 - area.width / (2 * zoom),
    y: (minY + maxY) / 2 - (area.y + area.height / 2) / zoom,
  };
}
