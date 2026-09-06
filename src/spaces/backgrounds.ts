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

/**
 * 배경색의 색조를 얹은 면 색.
 *
 * 예전에는 `color-mix`로 바탕과 배경색을 65:35로 섞기만 했는데, sRGB에서 무채색에
 * 가까운 바탕과 섞으면 원래 옅던 색조가 더 죽는다. loficafe(평균 `#444a59`)와
 * rainiywindow(`#646976`)는 그렇게 섞고 나면 R·G·B 차이가 3~4까지 줄어서 눈에는
 * 그냥 회색이었다 — 값은 들어갔는데 색으로는 안 보였다.
 *
 * 그래서 **색조·채도는 배경에서 가져오고, 밝기는 섞은 색의 휘도에 맞춘다.**
 * HSL 밝기를 맞추는 것으로는 부족하다 — 대비는 휘도로 정해지는데 같은 HSL 밝기라도
 * 채도를 올리면 휘도가 떨어진다(Sand `#fdf6e3`에 Dark를 걸면 4.62에서 4.21로
 * 내려가 AA를 깼다). 휘도를 맞추면 대비가 섞기만 하던 때와 같은 자리에 남는다.
 */
const GROUND_SHARE = 0.35;
/** 옅은 사진에 주는 바닥값. 이미 진한 배경은 제 채도가 이보다 높아서 안 건드려진다. */
const SATURATION_FLOOR = 0.18;
/** 흰색·검정에 가까운 색은 HSL 채도가 뻥튀기된다(Sand는 86%로 나온다). 천장을 둔다. */
const SATURATION_CAP = 0.32;

/**
 * `#rgb`·`#rrggbb`만 읽는다. 그 밖이면 null이다 — MVP에서 마이그레이션된 공간은
 * 배경 색으로 아무 CSS 문자열이나 들고 있을 수 있고([migrate.ts](./migrate.ts)의
 * `legacy.backgroundUrl`), 그걸 숫자로 읽으면 NaN이 되어 색이 통째로 사라진다.
 */
function toRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return null;
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** 위 `luminance`와 같은 식인데 채널을 그대로 받는다. 이분법이 hex를 안 거치게. */
function luminanceOf([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function hueOf([r, g, b]: [number, number, number]): number {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  const d = max - min;
  if (max === rn) return ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  if (max === gn) return ((bn - rn) / d + 2) / 6;
  return ((rn - gn) / d + 4) / 6;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

export function tintedSurface(base: string, ground: string): string {
  const baseRgb = toRgb(base);
  const groundRgb = toRgb(ground);
  // 읽을 수 없는 색이면 색조를 못 뽑는다. 브라우저는 아는 색일 수 있으므로 섞기만
  // 하던 예전 방식으로 돌아간다 — 색조는 죽지만 아무 색도 안 나오진 않는다.
  if (!baseRgb || !groundRgb) {
    return `color-mix(in srgb, ${base} ${Math.round((1 - GROUND_SHARE) * 100)}%, ${ground})`;
  }

  const mixed = baseRgb.map((c, i) =>
    Math.round(c * (1 - GROUND_SHARE) + groundRgb[i] * GROUND_SHARE),
  ) as [number, number, number];
  const target = luminanceOf(mixed);

  const hue = hueOf(groundRgb);
  const max = Math.max(...groundRgb);
  const min = Math.min(...groundRgb);
  // HSV 채도(`d / max`)를 쓴다. HSL 채도는 밝기 극단에서 터진다.
  const chroma = max === 0 ? 0 : (max - min) / max;
  const saturation = Math.min(SATURATION_CAP, Math.max(SATURATION_FLOOR, chroma));

  // 그 색조·채도에서 휘도가 섞은 색과 같아지는 밝기를 찾는다. 휘도는 밝기에 대해
  // 단조증가라 이분법으로 스무 번이면 1/255보다 촘촘하다.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (luminanceOf(hslToRgb(hue, saturation, mid)) < target) low = mid;
    else high = mid;
  }
  const lightness = (low + high) / 2;

  return `hsl(${(hue * 360).toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(lightness * 100).toFixed(1)}%)`;
}

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
     * **면은 그 공간의 색을 띤다.** 처음엔 배경색을 14%만 섞어서, 공간을 바꿔도
     * 사이드바가 극성 두 값(밝음/어두움)으로만 보였다 — 사이드바가 그 공간의 색을
     * 띠는 것이 공간을 바꿨다는 걸 가장 먼저 알려주는 신호다.
     *
     * 색조를 어떻게 얹는지는 `tintedSurface`에 있다. 그냥 섞기만 하면 옅은 사진에서
     * 색이 죽어서, 색조는 배경에서 가져오고 밝기만 섞은 값에서 가져온다.
     */
    surface: named?.surface ?? tintedSurface(light ? LIGHT_SURFACE : DARK_SURFACE, value),
    panelBorder:
      named?.border ?? (light ? 'rgba(30, 28, 25, 0.16)' : 'rgba(255, 255, 255, 0.14)'),
  };
}
