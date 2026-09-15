import { describe, expect, it } from 'vitest';
import { SOLID_COLORS, backgroundTokens, cardsLightOn } from './backgrounds';

/**
 * 면 색은 극성마다 무채색 한 값이고(2026-09-14 디자인 리뉴얼), 글자를 이고 있으므로
 * 대비를 지켜야 한다. 배경색이 면에 새어 들어가면 방마다 카드 색이 달라진다 —
 * 회색·흰색 바탕에서 분홍 카드가 나오던 게 그 경우다.
 */

const LIGHT_INK = '#1e1c19';
const DARK_INK = '#f0ede7';

/** 실제로 쓰이는 배경 전부. 사진은 photoTone이 내는 평균색이다. */
const PHOTO_TONES = {
  // Generated WebP assets, averaged at 16×16 as photoTone does.
  amberLake: '#ba8065',
  coastalMist: '#aab3b7',
  midnightObservatory: '#2a2143',
  quietSnow: '#bdc8d6',
  rainyDesk: '#1e232e',
  summerMeadow: '#8a9c82',
  summerCountryRoom: '#7f816e',
  rainyAttic: '#433534',
  afternoonRecords: '#946842',
};

/** 무채색에 가까운 사진의 평균색. 사용자가 자기 사진을 넣으면 이런 값이 나온다. */
const NEAR_GREY = { loficafe: '#444a59', rainiywindow: '#646976' };
/** 무채색 바탕. 예전 계산에서 분홍·노랑 면이 나오던 값들이다. */
const ACHROMATIC = ['#e9e9e9', '#ffffff', '#f7f7f5'];
const GROUNDS = [
  ...SOLID_COLORS.map((c) => c.value),
  ...Object.values(PHOTO_TONES),
  ...Object.values(NEAR_GREY),
  ...ACHROMATIC,
];

/** `hsl(H S% L%)` 또는 `#rrggbb`를 채널 셋으로. 글자색은 hsl()로 나온다. */
function parse(css: string): [number, number, number] {
  const hsl = css.match(/^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/);
  if (hsl) {
    const [h, s, l] = [Number(hsl[1]) / 360, Number(hsl[2]) / 100, Number(hsl[3]) / 100];
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (t: number) => {
      const u = (t + 1) % 1;
      if (u < 1 / 6) return p + (q - p) * 6 * u;
      if (u < 1 / 2) return q;
      if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
      return p;
    };
    return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
  }
  const n = parseInt(css.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const luminance = ([r, g, b]: [number, number, number]) => {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 색조가 눈에 보이는지. 무채색이면 0이다. */
const spread = (css: string) => {
  const ch = parse(css);
  return Math.max(...ch) - Math.min(...ch);
};

describe('면 색', () => {
  it.each(GROUNDS)('%s 위에서 본문 대비가 AA를 넘는다', (ground) => {
    for (const light of [true, false]) {
      const { surface, ink } = backgroundTokens(ground, {} as never, light);
      expect(contrast(surface, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * 글자 셋이 다 읽혀야 한다. 전에는 본문만 봤고, 보조·최하위는 잉크의 알파
   * (60% · 32%)라 면 색이 바뀌면 같이 흔들렸다 — 재보니 최하위가 1.78~2.66이었다.
   * 지금은 대비로 풀지만, 본문보다 진해지지는 않으므로 본문이 낮은 배경
   * (밝은 배경에 Dark를 건 경우)에서는 셋이 겹친다. 그때 기준은 본문이다.
   */
  it.each(GROUNDS)('%s 위에서 보조·최하위도 읽힌다', (ground) => {
    for (const light of [true, false]) {
      const { surface, ink, inkSoft, inkFaint } = backgroundTokens(ground, {} as never, light);
      const body = contrast(surface, ink);
      expect(contrast(surface, inkFaint)).toBeGreaterThanOrEqual(Math.min(4.5, body));
      // 단이 뒤집히지 않는다: 본문 ≥ 보조 ≥ 최하위.
      expect(body + 0.05).toBeGreaterThanOrEqual(contrast(surface, inkSoft));
      expect(contrast(surface, inkSoft) + 0.05).toBeGreaterThanOrEqual(contrast(surface, inkFaint));
    }
  });

  it.each(GROUNDS)('%s 위에서 면이 극성의 무채색 한 값이다', (ground) => {
    const { surface: light } = backgroundTokens(ground, {} as never, true);
    const { surface: dark } = backgroundTokens(ground, {} as never, false);
    expect(light).toBe('#ffffff');
    expect(dark).toBe('#1f1f21');
  });

  // 어두운 면 #1f1f21은 파랑 채널이 2 높다(결정 값 그대로). 예전 계산은 이 바탕들에서
  // 폭이 10~30이었으므로 2 이하면 색조가 새지 않은 것이다.
  it.each(ACHROMATIC)('무채색 바탕 %s 위에서 면에 색조가 없다', (ground) => {
    for (const light of [true, false]) {
      const { surface } = backgroundTokens(ground, {} as never, light);
      expect(spread(surface)).toBeLessThanOrEqual(2);
    }
  });
});

describe('단색 위 카드 밝기', () => {
  // Tomato·Cobalt는 휘도로는 어두운 쪽인데 흰 카드를 건다.
  it.each([
    ['#151515', false],
    ['#2c2c2e', false],
    ['#f4f5f7', true],
    ['#e8553a', true],
    ['#3552c8', true],
    ['#3552C8', true],
  ])('%s 위 카드가 밝음=%s', (value, light) => {
    expect(cardsLightOn(value)).toBe(light);
  });

  it('목록에 없는 색은 휘도로 판정한다', () => {
    expect(cardsLightOn('#fafafa')).toBe(true);
    expect(cardsLightOn('#202020')).toBe(false);
  });
});
