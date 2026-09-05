import { useEffect, useMemo } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { getTheme } from './themes';
import { backgroundTokens } from '../spaces/backgrounds';
import type { Theme } from './types';

const FONT_STACKS: Record<Theme['tokens']['font'], string> = {
  sans: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "'Iowan Old Style', Palatino, 'Palatino Linotype', ui-serif, Georgia, serif",
  hand: "'Bradley Hand', 'Snell Roundhand', 'Segoe Script', cursive",
};

export function useActiveTheme(): Theme {
  const themeId = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.themeId);
  return getTheme(themeId);
}

/** Publishes the theme's tokens as CSS variables so the whole UI can read them. */
export function useThemeVariables(theme: Theme) {
  const background = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);

  // 공간이 단색 배경을 골랐으면 UI가 그 색 위에 놓이므로 토큰을 거기서 뽑는다.
  // 사진 배경은 테마가 자기 사진에 맞춰 정해둔 값이 맞으므로 그대로 둔다.
  const tokens = useMemo(
    () =>
      background?.type === 'COLOR'
        ? backgroundTokens(background.value, theme.tokens)
        : theme.tokens,
    [background, theme],
  );

  useEffect(() => {
    const { style } = document.documentElement;
    const { ink, inkSoft, panel, surface, panelBorder, accent, font } = tokens;
    style.setProperty('--ink', ink);
    style.setProperty('--ink-soft', inkSoft);
    style.setProperty('--panel', panel);
    style.setProperty('--surface', surface);
    style.setProperty('--panel-border', panelBorder);
    style.setProperty('--accent', accent);
    style.setProperty('--font-ui', FONT_STACKS[font]);
  }, [tokens]);
}
