import type { Theme } from './types';

export const REFERENCE_THEMES: Theme[] = [
  {
    id: 'swiss',
    // 배경 패널 윗줄이 네 칸이 되면서 "Swiss Editorial"이 잘려서 줄였다(2026-09-13).
    name: 'Editorial',
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
  {
    id: 'paper',
    name: 'Paper',
    mood: 'light',
    // 바탕은 랜딩 페이지(design-ref/landing-canvas/landing.css의 --paper)와 같은 색이다.
    // 면은 앱의 카드 두 값(흰색 / #1f1f21, backgrounds.ts `LIGHT_SURFACE`)이고 글자는
    // 앱의 기본 밝은 값(DESIGN.md 2장)이다. 다크 바탕은 랜딩의 어두운 면이다. Editorial과 달리 위젯 모양·폰트는 앱 기본 그대로다.
    scene: { kind: 'color', value: '#efe7d9' },
    atmosphere: { scrim: 0, scrimTint: '0, 0, 0' },
    tokens: {
      ink: '#1e1c19', inkSoft: '#5c574f', inkFaint: '#726c62',
      surface: '#ffffff', panelBorder: 'rgba(30, 28, 25, 0.16)',
    },
    flat: {
      darkBackground: '#1b1613',
      darkTokens: {
        ink: '#f0ede7', inkSoft: '#a6a39e', inkFaint: '#8e8b87',
        surface: '#1f1f21', panelBorder: 'rgba(255, 255, 255, 0.14)',
      },
    },
  },
];
