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
  accent: string;
  border: string;
  /** 위젯 틀. 없으면 배경 밝기에서 뽑는다. */
  panel?: string;
  /** 위젯 안쪽 종이(`--paper`가 이걸 쓴다). 없으면 배경 밝기에서 뽑는다. */
  surface?: string;
}

export const MINIMAL_THEMES: MinimalTheme[] = [
  // 캔버스가 이미 거의 흰색이라 밝기로 뽑은 틀·종이가 서로 1/255 차이로 붙었다.
  // 세 층에 slate 눈금을 하나씩 준다 — 캔버스 100 / 틀 50 / 종이 흰색.
  // panel은 위젯이 겹칠 때 층이 보이도록 반투명이다(#f1f5f9 위에서 #f8fafc가 된다).
  { name: 'Mist', bg: '#f1f5f9', text: '#475569', accent: '#94a3b8', border: '#cbd5e1',
    panel: 'rgba(255, 255, 255, 0.5)', surface: '#ffffff' },
  { name: 'Deep Forest', bg: '#0f291e', text: '#d1fae5', accent: '#34d399', border: '#064e3b' },
  { name: 'Stone', bg: '#292524', text: '#d6d3d1', accent: '#78716c', border: '#44403c' },
  { name: 'Sand', bg: '#fdf6e3', text: '#5c534b', accent: '#dcb886', border: '#ebdcc1' },
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
export function backgroundTokens<T extends ThemeTokens>(value: string, base: T): T {
  const named = MINIMAL_THEMES.find((t) => t.bg.toLowerCase() === value.toLowerCase());
  const light = isLightBackground(value);
  const ink = named?.text ?? (light ? '#2b2f36' : '#f4f6fa');
  return {
    ...base,
    ink,
    inkSoft: `color-mix(in srgb, ${ink} 60%, transparent)`,
    // 위젯끼리 겹칠 때 층이 보이도록 반투명으로 둔다.
    panel: named?.panel ?? (light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.07)'),
    // surface는 배경이 안 비치는 창이 쓰므로 불투명해야 한다.
    surface: named?.surface ?? `color-mix(in srgb, #ffffff ${light ? 70 : 7}%, ${value})`,
    panelBorder: named?.border ?? (light ? 'rgba(40, 45, 55, 0.16)' : 'rgba(255, 255, 255, 0.14)'),
    accent: named?.accent ?? base.accent,
  };
}
