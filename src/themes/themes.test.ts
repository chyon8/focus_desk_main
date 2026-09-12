import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, sceneForPolarity, THEMES, tokensForGround } from './themes';

describe('reference themes', () => {
  it('puts Swiss Editorial first', () => {
    expect(THEMES[0]).toMatchObject({ id: 'swiss', name: 'Swiss Editorial' });
  });

  it('preserves the previous fallback theme', () => {
    expect(getTheme('missing').id).toBe(DEFAULT_THEME_ID);
  });

  it('falls back for the removed Editorial and Paper themes', () => {
    for (const id of ['editorial', 'paper']) {
      expect(getTheme(id).id).toBe(DEFAULT_THEME_ID);
    }
  });

  it('keeps Swiss Editorial exact in both polarities whatever the ground', () => {
    const theme = getTheme('swiss');
    for (const ground of ['#ffffff', '#050505', '#ff0000']) {
      expect(tokensForGround(theme, ground, true)).toEqual(theme.tokens);
      expect(tokensForGround(theme, ground, false)).toEqual(theme.flat!.darkTokens);
    }
    expect(sceneForPolarity(theme, true)).toEqual(theme.scene);
    expect(sceneForPolarity(theme, false)).toEqual({ kind: 'color', value: theme.flat!.darkBackground });
  });

  it('does not recolour existing scenes when UI polarity changes', () => {
    for (const id of ['golden-hour', 'rainy-night', 'snowfall']) {
      const theme = getTheme(id);
      expect(sceneForPolarity(theme, false)).toEqual(theme.scene);
      expect(sceneForPolarity(theme, true)).toEqual(theme.scene);
    }
  });
});
