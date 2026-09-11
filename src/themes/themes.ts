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
  {
    id: 'paper',
    name: 'Paper',
    mood: 'light',
    scene: { kind: 'color', value: '#d7cdbd' },
    atmosphere: {
      scrim: 0.08,
      scrimTint: '255, 248, 232',
      glow: { color: 'rgba(255, 226, 176, 0.4)', x: 0.5, y: 0.16, radius: 1.1 },
    },
    tokens: {
      ink: '#3b3128',
      inkSoft: 'rgba(59, 49, 40, 0.55)',
      inkFaint: 'rgba(59, 49, 40, 0.3)',
      surface: '#eee7da',
      panelBorder: 'rgba(74, 61, 48, 0.2)',
    },
  },
];

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

export function tokensForGround(
  theme: Theme,
  hasCustomBackground: boolean,
  ground: string,
  light: boolean,
) {
  if (theme.flat) return light ? theme.tokens : theme.flat.darkTokens;
  const derived = backgroundTokens(ground, theme.tokens, light);
  // Paper keeps its ivory material only in light mode. Keeping it in dark mode
  // puts light text on the same light surface.
  return theme.id === 'paper' && !hasCustomBackground && light
    ? {
        ...derived,
        surface: theme.tokens.surface,
        panelBorder: theme.tokens.panelBorder,
      }
    : derived;
}

export function sceneForPolarity(theme: Theme, light: boolean): Theme['scene'] {
  return theme.flat && !light
    ? { kind: 'color', value: theme.flat.darkBackground }
    : theme.scene;
}
