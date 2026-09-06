import type { ThemeTokens } from '../themes/types';

/**
 * Bundled wallpapers are stored as `/wallpapers/…`, but the packaged app loads
 * from `file://`, where a leading slash means the root of the disk. Addressing
 * them relative to the document works in both the dev server and the build.
 */
export function assetUrl(src: string) {
  return src.startsWith('/') ? `.${src}` : src;
}

export const SOLID_COLORS = [
  '#1e1e24', // charcoal
  '#12131a', // ink
  '#232135', // plum
  '#1a2420', // moss
];

/**
 * 최초 버전(legacy/components/AmbienceDock.tsx)의 `MINIMAL_THEMES` 값 그대로다.
 * 위 단색과 달리 배경 하나가 아니라 글자·강조·테두리까지 네 값을 들고 있다 —
 * 고르면 사이드바를 포함한 UI 전체가 이 값을 쓴다.
 * mist(`#f1f5f9`)와 sand(`#fdf6e3`)는 여기로 옮겼다. 위 단색 목록에 그대로 두면
 * 같은 색이 스와치 두 개로 나온다(누른 결과도 똑같다).
 */
interface MinimalTheme {
  name: string;
  bg: string;
  text: string;
  border: string;
  /** 위젯 안쪽 종이(`--paper`가 이걸 쓴다). 없으면 배경 밝기에서 뽑는다. */
  surface?: string;
}

export const MINIMAL_THEMES: MinimalTheme[] = [
  // 캔버스가 이미 거의 흰색이라 밝기로 뽑은 면이 캔버스와 1/255 차이로 붙었다.
  // slate 눈금을 하나 띄운다 — 캔버스 100 / 면 흰색.
  { name: 'Mist', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1',
    surface: '#ffffff' },
  { name: 'Deep Forest', bg: '#0f291e', text: '#d1fae5', border: '#064e3b' },
  { name: 'Stone', bg: '#292524', text: '#d6d3d1', border: '#44403c' },
  { name: 'Sand', bg: '#fdf6e3', text: '#5c534b', border: '#ebdcc1' },
];

/** sRGB relative luminance, 0(검정)~1(흰색). */
function luminance(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const lin = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Text on a light background needs dark ink; used to flip the shell's chrome.
 *  커스텀 색도 골라지므로 목록 비교가 아니라 밝기로 판정한다. */
export function isLightBackground(value: string) {
  return luminance(value) > 0.35;
}

/**
 * 공간이 단색 배경을 쓰면 UI는 테마의 사진이 아니라 그 색 위에 놓인다. 테마 토큰을
 * 그대로 두면 밝은 색을 골라도 사이드바·위젯이 어두운 채로 남는다 — 팔레트에서 색을
 * 바꿔도 사이드바가 안 따라오던 원인이다.
 *
 * Minimal 테마는 자기가 들고 있는 값을 쓰고(배경색으로 찾는다 — 공간 문서에는 색
 * 하나만 저장하면 되고 스키마가 그대로다), 나머지는 배경 밝기에서 뽑는다.
 */
/** 면·글자의 바탕. 극성이 정하고, 배경색은 색조로만 섞인다(DESIGN.md 2장). */
const LIGHT_SURFACE = '#f7f6f3';
const DARK_SURFACE = '#201e1b';
const LIGHT_INK = '#1e1c19';
const DARK_INK = '#f0ede7';

export function backgroundTokens<T extends ThemeTokens>(
  value: string,
  base: T,
  /** 사용자가 Atmosphere에서 뒤집었을 때. 없으면 색 밝기가 정한다. */
  forceLight?: boolean,
): T {
  const natural = isLightBackground(value);
  const light = forceLight ?? natural;
  /**
   * Minimal 테마는 배경 하나가 아니라 글자·테두리·면까지 든 값 세트다. 그런데 그
   * 세트는 자기 배경의 극성에 맞춰 정해진 값이라, 사용자가 극성을 뒤집으면 못 쓴다 —
   * 밝은 Mist에서 Dark를 골라도 세트가 이겨서 흰 면에 어두운 글자가 그대로 남았다.
   */
  const named =
    light === natural
      ? MINIMAL_THEMES.find((t) => t.bg.toLowerCase() === value.toLowerCase())
      : undefined;
  const ink = named?.text ?? (light ? LIGHT_INK : DARK_INK);
  return {
    ...base,
    ink,
    inkSoft: `color-mix(in srgb, ${ink} 60%, transparent)`,
    /**
     * 면은 글자를 이고 있으므로 불투명하고, **극성이 정한 바탕**에서 출발한다.
     * 예전에는 배경색에 흰색을 섞어서 만들었는데(어두우면 7%, 밝으면 70%), 그러면
     * 밝은 배경에 Dark를 걸어도 흰색을 조금 섞은 밝은 면이 나온다.
     *
     * **배경색을 35% 섞는다.** 처음엔 14%였는데 그러면 공간을 바꿔도 사이드바가
     * 극성 두 값(밝음/어두움)으로만 보였다 — 사이드바가 그 공간의 색을 띠는 것이
     * 이 앱에서 공간을 바꿨다는 걸 가장 먼저 알려주는 신호다.
     *
     * 35%가 상한이다. 이 값에서 실제 배경 12종(단색 4 · 사진 평균색 4 · Minimal 4)
     * 전부 글자 대비가 AA를 넘고, 가장 빠듯한 것이 밝은 사진에 Dark를 건 경우로
     * 4.62:1이다. 40%로 올리면 그게 3.97로 떨어져 본문 기준(4.5)을 깬다.
     */
    surface:
      named?.surface ??
      `color-mix(in srgb, ${light ? LIGHT_SURFACE : DARK_SURFACE} 65%, ${value})`,
    panelBorder:
      named?.border ?? (light ? 'rgba(30, 28, 25, 0.16)' : 'rgba(255, 255, 255, 0.14)'),
  };
}
