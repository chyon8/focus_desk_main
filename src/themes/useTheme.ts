import { useEffect, useMemo, useState } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { getTheme, tokensForGround } from './themes';
import { assetUrl, isLightBackground } from '../spaces/backgrounds';
import { photoTone } from '../spaces/photoTone';
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

/**
 * 실제로 화면 뒤에 깔린 사진의 주소. 공간이 고른 것이 테마의 것을 덮는다 —
 * SceneLayer가 배경을 고르는 것과 같은 순서다.
 */
function scenePhoto(
  background: { type: 'COLOR' | 'IMAGE'; value: string } | null | undefined,
  theme: Theme,
): string | null {
  if (background) return background.type === 'IMAGE' ? assetUrl(background.value) : null;
  return theme.scene.kind === 'image' ? assetUrl(theme.scene.src) : null;
}

/**
 * UI가 실제로 놓인 색과 그 밝기.
 *
 * 면·극성·그림자가 다 여기서 나온다. Atmosphere 패널도 "이 배경을 밝다고 읽었는지"를
 * 보여주려고 같은 값을 읽는다 — 두 군데서 따로 계산하면 언젠가 갈린다.
 */
export function useGround(theme: Theme): { ground: string; light: boolean; autoLight: boolean } {
  const background = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const chosenPolarity = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.polarity);

  // 사진의 평균 색. UI가 놓인 색이 곧 이것이라, 면·극성·그림자를 여기서 뽑는다.
  const photo = scenePhoto(background, theme);
  const [photoHex, setPhotoHex] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) {
      setPhotoHex(null);
      return;
    }
    let wanted = true;
    void photoTone(photo).then((hex) => {
      if (wanted) setPhotoHex(hex);
    });
    return () => {
      wanted = false;
    };
  }, [photo]);

  // UI가 실제로 놓인 색. 단색이면 그 색, 사진이면 그 사진의 평균 색이다.
  // 사진을 아직 못 읽었으면 테마가 적어둔 면 색으로 버틴다.
  const ground =
    background?.type === 'COLOR' ? background.value : (photoHex ?? theme.tokens.surface);

  // 배경이 정하는 값. 사진이면 평균 색의 밝기, 단색이면 그 색의 밝기다.
  const autoLight =
    photoHex || background?.type === 'COLOR'
      ? isLightBackground(ground)
      : theme.mood === 'light';

  // 실제로 쓰는 값. 사용자가 뒤집었으면 그게 이긴다.
  // 헤일로·그림자 세기·윗변 빛이 여기서 갈린다.
  const light = chosenPolarity != null ? chosenPolarity === 'light' : autoLight;

  return { ground, light, autoLight };
}

/** Publishes the theme's tokens as CSS variables so the whole UI can read them. */
export function useThemeVariables(theme: Theme) {
  const background = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const { ground, light } = useGround(theme);

  const tokens = useMemo(
    () => tokensForGround(theme, Boolean(background), ground, light),
    [background, ground, theme, light],
  );

  // 그림자 색조는 UI가 실제로 놓인 색에서 뽑는다.
  const tint = shadowTint(ground);

  useEffect(() => {
    document.documentElement.setAttribute('data-polarity', light ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme.id);
  }, [light, theme.id]);

  useEffect(() => {
    document.documentElement.style.setProperty('--shadow-tint', tint);
  }, [tint]);

  useEffect(() => {
    const { style } = document.documentElement;
    const { ink, inkSoft, inkFaint, surface, panelBorder } = tokens;
    style.setProperty('--ink', ink);
    style.setProperty('--ink-soft', inkSoft);
    style.setProperty('--ink-faint', inkFaint);
    style.setProperty('--surface', surface);
    style.setProperty('--panel-border', panelBorder);
  }, [tokens]);
}
