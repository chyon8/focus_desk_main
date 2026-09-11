import type { Theme } from './types';

export const REFERENCE_THEMES: Theme[] = [
  {
    id: 'bako',
    name: 'Swiss Editorial',
    mood: 'light',
    // Source: techbukket.com/bako-dictionary/assets/design-language.DEpywmip.css
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
  {
    id: 'editorial',
    name: 'Editorial',
    mood: 'light',
    // Screenshot pixels: RGB(254,248,233) ground and RGB(17,17,17) ink/rules.
    scene: { kind: 'color', value: '#fef8e9' },
    atmosphere: { scrim: 0, scrimTint: '0, 0, 0' },
    tokens: {
      ink: '#111111', inkSoft: '#111111', inkFaint: '#111111',
      surface: '#fef8e9', panelBorder: '#111111',
    },
    // The reference has no dark version. These are a matching app palette.
    flat: {
      darkBackground: '#191815',
      darkTokens: {
        ink: '#fef8e9', inkSoft: '#d5cfc2', inkFaint: '#b8b2a6',
        surface: '#211f1b', panelBorder: '#b8b2a6',
      },
    },
  },
];
