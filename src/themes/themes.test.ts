import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, sceneForPolarity, THEMES, tokensForGround } from './themes';

describe('Paper theme tokens', () => {
  const paper = getTheme('paper');
  const ground = paper.scene.kind === 'color' ? paper.scene.value : paper.tokens.surface;

  it('keeps the ivory surface in light mode', () => {
    expect(tokensForGround(paper, false, ground, true).surface).toBe(paper.tokens.surface);
  });

  it('uses a dark surface with dark mode text', () => {
    const tokens = tokensForGround(paper, false, ground, false);

    expect(tokens.surface).not.toBe(paper.tokens.surface);
    expect(tokens.ink).toBe('#f0ede7');
  });
});

describe('reference themes', () => {
  it('puts Swiss Editorial first', () => {
    expect(THEMES[0]).toMatchObject({ id: 'bako', name: 'Swiss Editorial' });
  });

  it('preserves the previous fallback theme', () => {
    expect(getTheme('missing').id).toBe(DEFAULT_THEME_ID);
  });

  it.each(['editorial', 'bako'])('%s keeps exact palettes with custom grounds and both polarities', (id) => {
    const theme = getTheme(id);
    for (const ground of ['#ffffff', '#050505', '#ff0000']) {
      for (const custom of [true, false]) {
        expect(tokensForGround(theme, custom, ground, true)).toEqual(theme.tokens);
        expect(tokensForGround(theme, custom, ground, false)).toEqual(theme.flat!.darkTokens);
      }
    }
    expect(sceneForPolarity(theme, true)).toEqual(theme.scene);
    expect(sceneForPolarity(theme, false)).toEqual({ kind: 'color', value: theme.flat!.darkBackground });
  });

  it('does not recolour existing scenes when UI polarity changes', () => {
    for (const id of ['paper', 'golden-hour', 'rainy-night', 'snowfall']) {
      const theme = getTheme(id);
      expect(sceneForPolarity(theme, false)).toEqual(theme.scene);
      expect(sceneForPolarity(theme, true)).toEqual(theme.scene);
    }
  });
});
