import type { ThemeTokens } from '../themes/types';

/**
 * Bundled wallpapers are stored as `/wallpapers/…`, but the packaged app loads
 * from `file://`, where a leading slash means the root of the disk. Addressing
 * them relative to the document works in both the dev server and the build.
 */
export function assetUrl(src: string) {
  return src.startsWith('/') ? `.${src}` : src;
}

/**
 * 배경 단색. 색·이름과 그 위 카드의 기본 밝기(`cards`)다 — 글자·면·테두리 값은
 * 값 층(DESIGN.md 2장)이 정한다.
 *
 * 팔레트는 4열이고 이 순서로 줄이 찬다: 어두운 넷 → 밝은 넷 → 강한 색 넷(2026-09-15
 * 디자인 리뉴얼). 강한 색은 빨강·파랑·노랑·보라로 색 방향이 안 겹치게 골랐다 — 초록은
 * Forest가 있다. 둘만 두었을 때는 셋째 줄이 반만 차서 칸이 비어 보였다. 예전 밝은 줄(Rose·Mist·Sage·Lilac)은 전부 파스텔이라 회색·오프화이트·
 * 갈색 기 없는 검정이 없었다. Ink·Graphite는 무채색 어두움, Cloud·Canvas는 무채색
 * 밝음이고, Mist·Sage는 옛 값에서 채도를 낮췄다.
 *
 * **강한 색은 휘도와 상관없이 흰 카드를 건다**(Tomato·Cobalt·Violet은 휘도로는 어두운 쪽). 강한 색 위에서는
 * 흰 카드가 떠 보이고, 어두운 카드는 색에 묻힌다. 그래서 카드 밝기는 휘도 판정이 아니라
 * 이 목록 값을 따른다. 격자 선은 바탕 휘도를 따른다(SceneLayer).
 *
 * 버린 색(Black·Plum·Rose·Lilac, 옛 Mist·Sage)을 쓰던 공간은 그대로 둔다 — 값은
 * 문자열로 저장되어 있어서 계속 칠해지고, 팔레트에서 선택 표시만 안 된다.
 */
export const SOLID_COLORS: { value: string; name: string; cards: 'light' | 'dark' }[] = [
  { value: '#151515', name: 'Ink', cards: 'dark' },
  { value: '#2c2c2e', name: 'Graphite', cards: 'dark' },
  { value: '#111a2c', name: 'Midnight', cards: 'dark' },
  { value: '#0f2419', name: 'Forest', cards: 'dark' },
  { value: '#f4f5f7', name: 'Cloud', cards: 'light' },
  { value: '#e6e6e3', name: 'Canvas', cards: 'light' },
  { value: '#dce3ea', name: 'Mist', cards: 'light' },
  { value: '#d9dfd5', name: 'Sage', cards: 'light' },
  { value: '#e8553a', name: 'Tomato', cards: 'light' },
  { value: '#3552c8', name: 'Cobalt', cards: 'light' },
  { value: '#f0b429', name: 'Saffron', cards: 'light' },
  { value: '#6e56cf', name: 'Violet', cards: 'light' },
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

/** 단색 위 카드가 기본으로 밝은지. 팔레트 색은 `cards` 값, 목록에 없는 색은 휘도로 판정한다. */
export function cardsLightOn(value: string) {
  const solid = SOLID_COLORS.find((c) => c.value === value.toLowerCase());
  return solid ? solid.cards === 'light' : isLightBackground(value);
}

/**
 * 카드·레일·독·패널의 면. 극성마다 무채색 한 값이다(2026-09-14 디자인 리뉴얼).
 *
 * 예전에는 배경색·사진 평균 색의 색조를 면에 얹었다. 그러면 방마다 카드가 민트·분홍·
 * 보라로 나오고, 회색·흰색 바탕에서도 분홍 카드가 나왔다(무채색의 색상각 0 = 빨강에
 * 최소 색폭을 강제한 탓). 공간을 바꿨다는 신호는 배경 사진과 레일 썸네일이 준다.
 * 사진의 색은 그림자 색조(`useTheme`의 `shadowTint`)에만 남긴다.
 */
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#1f1f21';
const LIGHT_INK = '#1e1c19';
const DARK_INK = '#f0ede7';

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

/** 그 색조·채도에서 휘도가 `target`이 되는 HSL 밝기. 휘도는 밝기에 대해 단조증가라
 *  이분법으로 스무 번이면 1/255보다 촘촘하다. */
function lightnessFor(hue: number, saturation: number, target: number): number {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (luminanceOf(hslToRgb(hue, saturation, mid)) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/* --- 글자 3단 ---------------------------------------------------------------
   DESIGN.md 2장은 본문·보조·최하위 셋의 대비를 값으로 못박아 뒀다(밝음 15.73 /
   6.63 / 4.81, 어두움 14.23 / 6.59 / 5.07). 잉크의 알파로 어림하면 면 색에 따라
   대비가 달라지므로 **대비로 푼다.** 잉크의 색조·채도는 그대로 두고 밝기만 면 쪽으로
   옮겨서 목표 대비에 맞춘다. 면이 두 값으로 고정된 뒤에도 값을 손으로 적지 않고
   계산으로 두는 건, 면 값을 바꿨을 때 대비가 같이 따라오게 하려고서다. --- */

/** DESIGN.md 2장의 보조·최하위 대비. 양쪽 극성의 값이 거의 같아 하나로 쓴다. */
const INK_SOFT_CONTRAST = 6.6;
const INK_FAINT_CONTRAST = 4.9;

/**
 * 면 위에서 `target` 대비가 나오는 글자색.
 *
 * 본문 잉크보다 진해지지는 않는다. 밝은 배경에 Dark를 걸면 본문 자체가 5.05까지
 * 내려가서 6.6을 낼 자리가 없다 — 그런 배경에서는 세 단이 겹치고, 위계는 굵기가
 * 낸다(DESIGN.md 3장).
 */
function inkStep(ink: string, surface: string, target: number, light: boolean): string {
  const inkRgb = toRgb(ink);
  const surfaceRgb = toRgb(surface);
  if (!inkRgb || !surfaceRgb) return ink;

  const surfaceLum = luminanceOf(surfaceRgb);
  const inkLum = luminanceOf(inkRgb);
  const wanted = light
    ? Math.max(inkLum, (surfaceLum + 0.05) / target - 0.05)
    : Math.min(inkLum, target * (surfaceLum + 0.05) - 0.05);

  const hue = hueOf(inkRgb);
  const max = Math.max(...inkRgb);
  const min = Math.min(...inkRgb);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = lightnessFor(hue, saturation, Math.min(1, Math.max(0, wanted)));
  return `hsl(${(hue * 360).toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(lightness * 100).toFixed(1)}%)`;
}


export function backgroundTokens<T extends ThemeTokens>(
  value: string,
  base: T,
  /** 사용자가 Atmosphere에서 뒤집었을 때. 없으면 색 밝기가 정한다. */
  forceLight?: boolean,
): T {
  const light = forceLight ?? isLightBackground(value);
  const ink = light ? LIGHT_INK : DARK_INK;
  // 글자 셋이 다 이 면 위에 앉으므로 면을 먼저 정한다.
  const surface = light ? LIGHT_SURFACE : DARK_SURFACE;
  return {
    ...base,
    ink,
    inkSoft: inkStep(ink, surface, INK_SOFT_CONTRAST, light),
    inkFaint: inkStep(ink, surface, INK_FAINT_CONTRAST, light),
    /**
     * 면은 글자를 이고 있으므로 불투명하고, 극성이 정한 무채색 두 값 중 하나다.
     * 배경색은 섞지 않는다 — 이유는 `LIGHT_SURFACE` 주석.
     */
    surface,
    panelBorder: light ? 'rgba(30, 28, 25, 0.16)' : 'rgba(255, 255, 255, 0.14)',
  };
}
