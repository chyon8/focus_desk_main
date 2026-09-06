import { useEffect, useMemo } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { getTheme } from './themes';
import { backgroundTokens, isLightBackground } from '../spaces/backgrounds';
import type { Theme } from './types';

/**
 * 그림자 색조. 배경색을 그대로 어둡게 눌러서 쓴다 — 순수 검정 그림자는 밝은 테마에서
 * 회색 얼룩이 된다. 색조를 유지하려면 채널을 같은 비율로 낮추는 것으로 충분하다.
 */
function shadowTint(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const ch = [0, 2, 4].map((i) => Math.round(parseInt(full.slice(i, i + 2), 16) * 0.18));
  return ch.join(', ');
}

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

  // 명암 극성. 헤일로·그림자 세기·윗변 빛이 여기서 갈린다.
  // 단색을 골랐으면 그 색의 밝기가, 아니면 테마가 자기 사진에 맞춰 적어둔 값이 정한다.
  const light =
    background?.type === 'COLOR' ? isLightBackground(background.value) : theme.mood === 'light';

  // 그림자 색조는 UI가 실제로 놓인 색에서 뽑는다.
  const tint = shadowTint(
    background?.type === 'COLOR' ? background.value : theme.tokens.surface,
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-polarity', light ? 'light' : 'dark');
  }, [light]);

  useEffect(() => {
    document.documentElement.style.setProperty('--shadow-tint', tint);
  }, [tint]);

  useEffect(() => {
    const { style } = document.documentElement;
    const { ink, inkSoft, surface, panelBorder } = tokens;
    style.setProperty('--ink', ink);
    style.setProperty('--ink-soft', inkSoft);
    style.setProperty('--surface', surface);
    style.setProperty('--panel-border', panelBorder);
  }, [tokens]);
}
