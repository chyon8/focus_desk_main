import type { Theme } from './types';

export const REFERENCE_THEMES: Theme[] = [
  {
    id: 'swiss',
    name: 'Swiss Editorial',
    mood: 'light',
    // Source: the design-language.css of the techbukket.com dictionary site.
    scene: { kind: 'color', value: '#f7f7f5' },
    atmosphere: { scrim: 0, scrimTint: '0, 0, 0' },
    tokens: {
      ink: '#141414', inkSoft: '#424242', inkFaint: '#686868',
      surface: '#ffffff', panelBorder: '#d9d9d4',
    },
    flat: {
      darkBackground: '#050505',
      darkTokens: {
        ink: '#f4f4f5', inkSoft: '#b8b8bc', inkFaint: '#81828a',
        surface: '#0b0b0b', panelBorder: '#252525',
      },
    },
  },
];
