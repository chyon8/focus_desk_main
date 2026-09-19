import { describe, it, expect } from 'vitest';
import { tidy, tidyCamera, TidyBox, TIDY_GAP, ArrangeMode } from './tidy';

// 흩어진 책상 — 정렬을 누르기 전 모습. 크기가 제각각이라 칸에 맞추려는 배치와
// 자리만 바꾸는 배치가 갈린다.
const desk: TidyBox[] = [
  { id: 'page', x: 50, y: 20, width: 900, height: 620 },
  { id: 'photo', x: 900, y: 40, width: 280, height: 420 },
  { id: 'memo', x: 100, y: 700, width: 420, height: 460 },
  { id: 'todo', x: 1400, y: 300, width: 320, height: 420 },
  { id: 'clock', x: 700, y: 900, width: 320, height: 400 },
  { id: 'timer', x: 300, y: 1500, width: 340, height: 340 },
];

const area = { width: 1400, height: 900 };
const MODES: ArrangeMode[] = ['compact', 'rows'];

/** 씨앗 하나로 같은 책상이 나오는 난수 — 실패한 경우를 seed로 다시 만들 수 있다. */
function randomDesk(seed: number, count: number): TidyBox[] {
  let s = seed;
  const next = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // 실제 위젯 크기들: 브라우저 · 메모 · 시계 · 타이머 · 할 일 · 사진 · 컬럼.
  const sizes = [[900, 620], [420, 460], [320, 400], [340, 340], [320, 420], [280, 320], [320, 560]];
  return Array.from({ length: count }, (_, i) => {
    const [width, height] = sizes[Math.floor(next() * sizes.length)];
    return { id: 'w' + i, x: Math.round(next() * 2500), y: Math.round(next() * 2000), width, height };
  });
}

/** 정렬 결과를 크기와 함께 — 겹침·간격을 재려면 상자가 온전해야 한다. */
function laid(boxes: TidyBox[], mode: ArrangeMode, columns?: number): TidyBox[] {
  const spots = tidy(boxes, area, mode, columns);
  return boxes.map((box) => ({ ...box, ...spots[box.id] }));
}

describe('정렬은 자리만 바꾼다', () => {
  for (const mode of MODES) {
    it(`${mode}: 정렬 전후 폭·높이가 같다`, () => {
      const out = laid(desk, mode);
      for (const box of desk) {
        const after = out.find((b) => b.id === box.id)!;
        expect({ w: after.width, h: after.height }).toEqual({ w: box.width, h: box.height });
      }
    });

    it(`${mode}: 900×620 브라우저가 그대로다`, () => {
      // 주소줄이 사라지고 시작 페이지가 두 열로 줄었던 원인이 여기였다.
      const page = laid(desk, mode).find((b) => b.id === 'page')!;
      expect([page.width, page.height]).toEqual([900, 620]);
    });
  }

  it('위젯 하나짜리 공간도 크기를 안 바꾼다', () => {
    const one: TidyBox[] = [{ id: 'clock', x: 500, y: 500, width: 320, height: 400 }];
    const out = laid(one, 'compact');
    expect([out[0].width, out[0].height]).toEqual([320, 400]);
  });
});

describe('간격', () => {
  for (const mode of MODES) {
    it(`${mode}: 겹치지 않고 이웃 사이가 ${TIDY_GAP} 이상이다`, () => {
      const out = laid(desk, mode);
      for (const a of out) {
        for (const b of out) {
          if (a.id >= b.id) continue;
          const apart =
            a.x + a.width + TIDY_GAP <= b.x + 0.001 ||
            b.x + b.width + TIDY_GAP <= a.x + 0.001 ||
            a.y + a.height + TIDY_GAP <= b.y + 0.001 ||
            b.y + b.height + TIDY_GAP <= a.y + 0.001;
          expect(apart, `${a.id} ↔ ${b.id}`).toBe(true);
        }
      }
    });

    it(`${mode}: 이웃한 위젯 사이가 정확히 ${TIDY_GAP}인 짝이 있다`, () => {
      // 어딘가는 붙어 있어야 "정리됐다"가 된다. 전부 띄엄띄엄이면 안 된다.
      const out = laid(desk, mode);
      const touching = out.some((a) =>
        out.some((b) => a.id !== b.id && Math.abs(b.x - (a.x + a.width + TIDY_GAP)) < 0.001)
      );
      expect(touching).toBe(true);
    });
  }
});

describe('두 번 눌러도 같은 책상', () => {
  for (const mode of MODES) {
    for (const columns of [undefined, 3]) {
      it(`${mode} (${columns ?? 'auto'}열)`, () => {
        const first = laid(desk, mode, columns);
        const second = laid(first, mode, columns);
        const third = laid(second, mode, columns);
        expect(second).toEqual(first);
        expect(third).toEqual(first);
      });
    }
  }

  it('집는 순서는 지금 놓인 자리로만 정해진다 — 입력 순서는 상관없다', () => {
    const shuffled = [...desk].reverse();
    expect(tidy(shuffled, area, 'compact')).toEqual(tidy(desk, area, 'compact'));
  });

  // 고정 책상 하나로는 부족했다. Compact이 늦게 집힌 위젯을 먼저 것보다 위에
  // 놓던 동안, 위 책상은 통과하면서 무작위 책상 500개 중 32개가 두 번째 G에서
  // 달라졌다. 실패하면 어느 책상인지 나오게 seed를 같이 적는다.
  for (const mode of MODES) {
    it(`${mode}: 무작위 책상 500개에서도 두 번째가 같다`, () => {
      const broken: string[] = [];
      for (let seed = 1; seed <= 500; seed++) {
        const boxes = randomDesk(seed, 3 + (seed % 8));
        const first = laid(boxes, mode);
        if (JSON.stringify(laid(first, mode)) !== JSON.stringify(first)) {
          broken.push(`seed ${seed} (${boxes.length}개)`);
        }
      }
      expect(broken.slice(0, 5)).toEqual([]);
    });
  }
});

describe('속도', () => {
  // 정렬은 `arrangeWidgets`의 zustand `set` 안에서 동기로 돈다 — 느리면 창이 멈춘다.
  // 자리 후보를 위젯마다 새로 만들고 전부 충돌 검사하던 때는 150개가 1.2초였다.
  for (const n of [80, 150]) {
    it(`compact ${n}개가 150ms 안에 끝난다`, () => {
      const boxes = randomDesk(7, n);
      const started = performance.now();
      tidy(boxes, area, 'compact');
      expect(performance.now() - started).toBeLessThan(150);
    });
  }
});

describe('rows', () => {
  it('한 줄에 고른 수만큼 놓고 윗변을 맞춘다', () => {
    const out = laid(desk, 'rows', 3);
    const rows = new Map<number, string[]>();
    for (const b of out) rows.set(b.y, [...(rows.get(b.y) ?? []), b.id]);
    expect([...rows.values()].map((r) => r.length)).toEqual([3, 3]);
  });

  it('열의 세로선이 맞는다', () => {
    const out = laid(desk, 'rows', 3);
    const byRow = [...new Set(out.map((b) => b.y))].sort((a, b) => a - b);
    const xsOf = (y: number) => out.filter((b) => b.y === y).map((b) => b.x).sort((a, b) => a - b);
    expect(xsOf(byRow[1])).toEqual(xsOf(byRow[0]));
  });

  it('작은 위젯을 열 폭으로 늘리지도, 칸 가운데 놓지도 않는다', () => {
    // photo(280)와 page(900)가 같은 열에 오게 한 줄씩 놓는다.
    const two: TidyBox[] = [
      { id: 'page', x: 0, y: 0, width: 900, height: 620 },
      { id: 'photo', x: 0, y: 700, width: 280, height: 420 },
    ];
    const out = laid(two, 'rows', 1);
    const photo = out.find((b) => b.id === 'photo')!;
    expect(photo.width).toBe(280);
    expect(photo.x).toBe(0); // 왼쪽에 붙는다
  });
});

describe('compact', () => {
  it('구멍을 남기지 않는다 — 짧은 위젯 아래로 다음 것이 올라온다', () => {
    const out = laid(desk, 'compact');
    const rowsOut = laid(desk, 'rows');
    const heightOf = (bs: TidyBox[]) => Math.max(...bs.map((b) => b.y + b.height));
    expect(heightOf(out)).toBeLessThanOrEqual(heightOf(rowsOut));
  });

  it('가장 넓은 위젯보다 좁은 폭으로 밀어넣지 않는다', () => {
    const wide: TidyBox[] = [
      { id: 'page', x: 0, y: 0, width: 2000, height: 620 },
      { id: 'memo', x: 0, y: 700, width: 420, height: 460 },
    ];
    const out = laid(wide, 'compact');
    expect(out.find((b) => b.id === 'page')!.width).toBe(2000);
  });
});

describe('tidyCamera', () => {
  it('전부 들어와도 100%를 넘지 않는다', () => {
    const one: TidyBox[] = [{ id: 'clock', x: 0, y: 0, width: 320, height: 400 }];
    expect(tidyCamera(one, { y: 84, ...area })!.zoom).toBe(1);
  });

  it('화면보다 큰 배치는 줄여서 전부 보여준다', () => {
    const camera = tidyCamera(laid(desk, 'compact'), { y: 84, ...area })!;
    expect(camera.zoom).toBeLessThan(1);
    expect(camera.zoom).toBeGreaterThanOrEqual(0.1);
  });
});
