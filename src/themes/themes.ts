import type { Theme } from './types';
import { backgroundTokens } from '../spaces/backgrounds';
import { REFERENCE_THEMES } from './referenceThemes';

export const DEFAULT_THEME_ID = 'golden-hour';

export const THEMES: Theme[] = [
  ...REFERENCE_THEMES,
  {
    id: 'golden-hour',
    name: 'Amber Lake',
    mood: 'dark',
    scene: { kind: 'image', src: '/wallpapers/amber-lake.webp' },
    atmosphere: {
      scrim: 0.34,
      scrimTint: '44, 22, 14',
      glow: { color: 'rgba(255, 186, 116, 0.22)', x: 0.5, y: 0.34, radius: 1.05 },
    },
    tokens: {
      ink: '#fff3e6',
      inkSoft: 'rgba(255, 243, 230, 0.6)',
      inkFaint: 'rgba(255, 243, 230, 0.32)',
      surface: '#2e1c1a',
      panelBorder: 'rgba(255, 208, 168, 0.17)',
    },
  },
  {
    id: 'rainy-night',
    name: 'Rainy Night',
    mood: 'dark',
    scene: {
      kind: 'gradient',
      value: 'radial-gradient(ellipse 120% 85% at 50% 0%, #1b3a4b 0%, #12232e 45%, #0a1319 100%)',
    },
    atmosphere: {
      scrim: 0.18,
      scrimTint: '4, 12, 18',
      // The moon behind the cloud, off to one side.
      glow: { color: 'rgba(150, 208, 232, 0.16)', x: 0.68, y: 0.14, radius: 0.7 },
    },
    particles: { kind: 'rain', density: 0.55 },
    tokens: {
      ink: '#e8f2f6',
      inkSoft: 'rgba(232, 242, 246, 0.5)',
      inkFaint: 'rgba(232, 242, 246, 0.3)',
      surface: '#101f28',
      panelBorder: 'rgba(168, 220, 240, 0.15)',
    },
  },
  {
    id: 'snowfall',
    name: 'Snowfall',
    mood: 'dark',
    scene: {
      kind: 'gradient',
      value: 'radial-gradient(ellipse 120% 85% at 50% 10%, #2a3550 0%, #1a2136 50%, #0f1220 100%)',
    },
    atmosphere: {
      scrim: 0.18,
      scrimTint: '8, 10, 22',
      glow: { color: 'rgba(168, 190, 250, 0.15)', x: 0.5, y: 0.12, radius: 0.95 },
    },
    particles: { kind: 'snow', density: 0.4 },
    tokens: {
      ink: '#eef1f8',
      inkSoft: 'rgba(238, 241, 248, 0.5)',
      inkFaint: 'rgba(238, 241, 248, 0.3)',
      surface: '#161c2e',
      panelBorder: 'rgba(200, 214, 245, 0.15)',
    },
  },
];

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

/**
 * `overridden`은 공간이 배경을 따로 골랐다는 뜻이다.
 *
 * Swiss Editorial처럼 값이 고정된 테마는 제 바탕(`#f7f7f5`/`#050505`) 위에서만 그
 * 값을 그대로 쓴다. 사용자가 단색을 고르면 UI가 놓인 색이 그 색이므로, 면·글자는
 * 다른 테마와 같은 식으로 그 색에서 뽑는다 — 이게 Swiss Editorial의 밝기 조절이다.
 */
export function tokensForGround(
  theme: Theme,
  ground: string,
  light: boolean,
  overridden = false,
) {
  if (theme.flat && !overridden) return light ? theme.tokens : theme.flat.darkTokens;
  return backgroundTokens(ground, theme.tokens, light);
}

export function sceneForPolarity(theme: Theme, light: boolean): Theme['scene'] {
  return theme.flat && !light
    ? { kind: 'color', value: theme.flat.darkBackground }
    : theme.scene;
}
