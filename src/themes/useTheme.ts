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

  // 단색 배경 위에서는 유리의 blur가 흐릴 것이 없다. 대신 Chromium이 blur 반경만큼
  // 가장자리를 밝게 칠해서 위젯 안쪽에 25px짜리 테두리 띠가 생긴다 — 다시 그릴 때마다
  // 나타났다 사라져 깜빡인다. 사진 배경에서는 blur가 실제로 일을 하므로 그대로 둔다.
  const flat = background?.type === 'COLOR';

  useEffect(() => {
    document.documentElement.toggleAttribute('data-flat-bg', flat);
  }, [flat]);

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
