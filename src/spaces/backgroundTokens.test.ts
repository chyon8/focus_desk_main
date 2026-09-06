import { describe, expect, it } from 'vitest';
import { MINIMAL_THEMES, SOLID_COLORS, backgroundTokens, tintedSurface } from './backgrounds';

/**
 * 면 색은 그 공간의 색을 띠어야 하고(사이드바가 공간을 바꿨다고 알려주는 신호),
 * 동시에 글자를 이고 있으므로 대비를 지켜야 한다. 둘은 서로를 밀어내는 조건이라
 * 눈으로만 보고 값을 바꾸면 한쪽이 조용히 깨진다.
 */

const LIGHT_INK = '#1e1c19';
const DARK_INK = '#f0ede7';

/** 실제로 쓰이는 배경 전부. 사진은 photoTone이 내는 평균색이다. */
const PHOTO_TONES = {
  loficafe: '#444a59',
  rainiywindow: '#646976',
  ghibli: '#5e8781',
  winterhut: '#373d4a',
  sunset: '#823d5b',
};
const GROUNDS = [...SOLID_COLORS, ...MINIMAL_THEMES.map((t) => t.bg), ...Object.values(PHOTO_TONES)];

/** `hsl(H S% L%)` 또는 `#rrggbb`를 채널 셋으로. 테스트가 읽을 수 있으면 브라우저도 읽는다. */
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

  it.each(GROUNDS)('%s 위에서 면이 그 배경의 색조를 띤다', (ground) => {
    // Minimal 테마는 자기가 들고 있는 면 값을 쓰므로 이 규칙 밖이다.
    if (MINIMAL_THEMES.some((t) => t.bg.toLowerCase() === ground.toLowerCase())) return;
    expect(spread(tintedSurface('#201e1b', ground))).toBeGreaterThan(8);
  });

  it('무채색에 가까운 사진도 색으로 보인다', () => {
    // 이 둘이 회색으로 나오던 것이 채도 바닥값을 넣은 이유다. 그냥 섞기만 하면 폭이 3~4였다.
    expect(spread(tintedSurface('#201e1b', PHOTO_TONES.loficafe))).toBeGreaterThan(12);
    expect(spread(tintedSurface('#201e1b', PHOTO_TONES.rainiywindow))).toBeGreaterThan(12);
  });

  it('이미 진한 배경은 제 채도를 그대로 쓴다', () => {
    // 노을은 바닥값(18%)보다 채도가 높아서 끌어올려지지 않는다.
    expect(spread(tintedSurface('#201e1b', PHOTO_TONES.sunset))).toBeGreaterThan(
      spread(tintedSurface('#201e1b', PHOTO_TONES.loficafe)),
    );
  });

  it('hex가 아닌 색은 섞기로 돌아간다', () => {
    // MVP에서 마이그레이션된 공간은 배경으로 아무 CSS 문자열이나 들고 있을 수 있다.
    expect(tintedSurface('#201e1b', 'rebeccapurple')).toBe(
      'color-mix(in srgb, #201e1b 65%, rebeccapurple)',
    );
    expect(tintedSurface('#201e1b', 'linear-gradient(red, blue)')).toContain('color-mix');
  });
});
