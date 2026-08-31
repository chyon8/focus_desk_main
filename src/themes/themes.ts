import type { Theme } from './types';

export const DEFAULT_THEME_ID = 'golden-hour';

export const THEMES: Theme[] = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    mood: 'dark',
    scene: { kind: 'image', src: '/wallpapers/sunset_landscape.png' },
    atmosphere: {
      scrim: 0.34,
      scrimTint: '44, 22, 14',
      glow: { color: 'rgba(255, 186, 116, 0.22)', x: 0.5, y: 0.34, radius: 1.05 },
    },
    tokens: {
      ink: '#fff3e6',
      inkSoft: 'rgba(255, 243, 230, 0.6)',
      panel: 'rgba(50, 28, 26, 0.46)',
      surface: '#2e1c1a',
      panelBorder: 'rgba(255, 208, 168, 0.17)',
      accent: '#ffb27a',
      font: 'sans',
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
      panel: 'rgba(13, 29, 38, 0.5)',
      surface: '#101f28',
      panelBorder: 'rgba(168, 220, 240, 0.15)',
      accent: '#7fc8d8',
      font: 'sans',
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
      panel: 'rgba(21, 27, 45, 0.5)',
      surface: '#161c2e',
      panelBorder: 'rgba(200, 214, 245, 0.15)',
      accent: '#a8b8e8',
      font: 'sans',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    mood: 'light',
    scene: { kind: 'color', value: '#fdf6e3' },
    atmosphere: {
      scrim: 0.08,
      scrimTint: '255, 248, 232',
      glow: { color: 'rgba(255, 226, 176, 0.4)', x: 0.5, y: 0.16, radius: 1.1 },
    },
    tokens: {
      ink: '#3b3128',
      inkSoft: 'rgba(59, 49, 40, 0.55)',
      panel: 'rgba(255, 252, 244, 0.7)',
      surface: '#fbf6ea',
      panelBorder: 'rgba(90, 70, 50, 0.14)',
      accent: '#b07d4a',
      font: 'hand',
    },
  },
];

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
