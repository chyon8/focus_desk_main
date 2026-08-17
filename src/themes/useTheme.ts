import { useEffect } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { getTheme } from './themes';
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
  useEffect(() => {
    const { style } = document.documentElement;
    const { ink, inkSoft, panel, surface, panelBorder, accent, font } = theme.tokens;
    style.setProperty('--ink', ink);
    style.setProperty('--ink-soft', inkSoft);
    style.setProperty('--panel', panel);
    style.setProperty('--surface', surface);
    style.setProperty('--panel-border', panelBorder);
    style.setProperty('--accent', accent);
    style.setProperty('--font-ui', FONT_STACKS[font]);
  }, [theme]);
}
