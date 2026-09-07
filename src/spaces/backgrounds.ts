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
 * 배경 단색. 색과 이름뿐이다 — 글자·면·테두리는 값 층(DESIGN.md 2장)이 정한다.
 *
 * 예전에는 Mist·Sand·Deep Forest·Stone이 `MINIMAL_THEMES`로 따로 있으면서 자기
 * `{text, border, surface}`를 들고 왔고, `backgroundTokens`가 그 값을 값 층보다
 * 위에 뒀다. 그래서 Mist는 면이 순백(`#ffffff`, DESIGN.md 7장이 금지한 값)이고
 * 글자가 차가운 회색(`#475569`, 대비 7.58)이라 라이트에서 검은색이 안 나왔다.
 * 색 값은 최초 버전 그대로고, 이제 배경색으로만 쓴다.
 *
 * 앞 일곱이 어두움, 뒤 일곱이 밝음이다. 팔레트가 한 줄에 일곱씩 두 줄로 세운다 —
 * 밝은 쪽이 Mist·Sand 둘뿐이라 배경을 골라서는 라이트 UI에 갈 길이 거의 없었다.
 *
 * **Black·Greige는 시안(A2.html)의 `solidDark`·`solidLight` 값 그대로다.** 앱의
 * 어두운 색은 전부 남색·자주·초록이 섞여 있어서 시안에 있는 따뜻한 무채색 검정이
 * 없었다. 가장 어두운 Ink(`#12131a`)도 남색이다.
 */
export const SOLID_COLORS: { value: string; name: string }[] = [
  { value: '#191715', name: 'Black' },
  { value: '#1e1e24', name: 'Charcoal' },
  { value: '#12131a', name: 'Ink' },
  { value: '#232135', name: 'Plum' },
  { value: '#1a2420', name: 'Moss' },
  { value: '#0f291e', name: 'Deep Forest' },
  { value: '#292524', name: 'Stone' },
  { value: '#e9e5de', name: 'Greige' },
  { value: '#f1f5f9', name: 'Mist' },
  { value: '#fdf6e3', name: 'Sand' },
  { value: '#efe7d9', name: 'Linen' },
  { value: '#dde4dc', name: 'Sage' },
  { value: '#e4dfea', name: 'Lilac' },
  { value: '#eddfda', name: 'Blush' },
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
/**
 * 배경색을 얼마나 섞는지. 극성마다 다르다.
 *
 * 어두운 바탕에 어두운 배경색을 35% 섞으면 휘도가 거의 안 움직이지만(charcoal은
 * 0.014 → 0.013), 밝은 바탕에 같은 배경색을 35% 섞으면 휘도가 0.92에서 0.40까지
 * 떨어진다. 그래서 Light를 손으로 걸어도 면이 밝지 않고 중간톤 라벤더(`#a8a8c3`)가
 * 나왔다. 밝은 쪽은 14%만 섞어 면을 0.69~0.92에 둔다.
 */
const GROUND_SHARE = 0.35;
const LIGHT_GROUND_SHARE = 0.14;
/** 옅은 사진에 주는 바닥값. 이미 진한 배경은 제 채도가 이보다 높아서 안 건드려진다. */
const SATURATION_FLOOR = 0.18;
/** 흰색·검정에 가까운 색은 HSL 채도가 뻥튀기된다(Sand는 86%로 나온다). 천장을 둔다. */
const SATURATION_CAP = 0.32;
/**
 * 밝은 면이 띠어야 할 최소 색폭(R·G·B 최대-최소, 0~1).
 *
 * HSL에서 실제로 보이는 색폭은 `(1 - |2L-1|) × S`다. 면이 아주 밝으면(L>0.94) 이
 * 값이 눌려서 채도를 넣어도 색이 안 남는다 — 밝은 배경 여섯 개가 전부 같은
 * 오프화이트로 나왔다(색폭 3~5). 어두운 면은 이미 12~40이라 안 건드린다.
 */
const BRIGHT_SURFACE_CHROMA = 0.05;

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

export function tintedSurface(base: string, ground: string, share = GROUND_SHARE): string {
  const baseRgb = toRgb(base);
  const groundRgb = toRgb(ground);
  // 읽을 수 없는 색이면 색조를 못 뽑는다. 브라우저는 아는 색일 수 있으므로 섞기만
  // 하던 예전 방식으로 돌아간다 — 색조는 죽지만 아무 색도 안 나오진 않는다.
  if (!baseRgb || !groundRgb) {
    return `color-mix(in srgb, ${base} ${Math.round((1 - share) * 100)}%, ${ground})`;
  }

  const mixed = baseRgb.map((c, i) =>
    Math.round(c * (1 - share) + groundRgb[i] * share),
  ) as [number, number, number];
  const target = luminanceOf(mixed);

  const hue = hueOf(groundRgb);
  const max = Math.max(...groundRgb);
  const min = Math.min(...groundRgb);
  // HSV 채도(`d / max`)를 쓴다. HSL 채도는 밝기 극단에서 터진다.
  const chroma = max === 0 ? 0 : (max - min) / max;
  let saturation = Math.min(SATURATION_CAP, Math.max(SATURATION_FLOOR, chroma));
  let lightness = lightnessFor(hue, saturation, target);

  // 밝은 면은 색폭이 밝기에 눌린다. 남는 폭에 맞춰 채도를 올리고 밝기를 다시 푼다 —
  // 휘도를 다시 맞추므로 대비는 그대로다.
  if (lightness > 0.5) {
    const reach = 1 - Math.abs(2 * lightness - 1);
    const needed = Math.min(1, BRIGHT_SURFACE_CHROMA / Math.max(reach, 0.001));
    if (needed > saturation) {
      saturation = needed;
      lightness = lightnessFor(hue, saturation, target);
    }
  }

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
    surface: tintedSurface(
      light ? LIGHT_SURFACE : DARK_SURFACE,
      value,
      light ? LIGHT_GROUND_SHARE : GROUND_SHARE,
    ),
    panelBorder: light ? 'rgba(30, 28, 25, 0.16)' : 'rgba(255, 255, 255, 0.14)',
  };
}
