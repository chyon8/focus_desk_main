import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { assetUrl, isLightBackground } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';
import { useGround } from './useTheme';
import { sceneForPolarity } from './themes';
import { ParticleLayer } from './ParticleLayer';
import type { Atmosphere, Glow, SceneSpec, Theme } from './types';

function sceneStyle(scene: SceneSpec): React.CSSProperties {
  switch (scene.kind) {
    case 'image':
      return {
        backgroundImage: `url(${assetUrl(scene.src)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    case 'gradient':
      return { backgroundImage: scene.value };
    case 'color':
      return { backgroundColor: scene.value };
  }
}

/** Veils the scene so widget text stays readable — heaviest at the top and bottom
 *  edges where the chrome sits, lightest through the middle of the picture. */
function scrimStyle({ scrim, scrimTint }: Atmosphere): React.CSSProperties {
  return {
    backgroundImage: `linear-gradient(to bottom,
      rgba(${scrimTint}, ${scrim * 0.95}) 0%,
      rgba(${scrimTint}, ${scrim * 0.3}) 30%,
      rgba(${scrimTint}, ${scrim * 0.42}) 68%,
      rgba(${scrimTint}, ${scrim * 0.88}) 100%)`,
  };
}

function glowStyle(glow: Glow): React.CSSProperties {
  const size = glow.radius * 100;
  return {
    backgroundImage: `radial-gradient(circle ${size}vmax at ${glow.x * 100}% ${glow.y * 100}%,
      ${glow.color} 0%, transparent 70%)`,
  };
}

/**
 * The full backdrop stack, bottom to top: scene, scrim, light, weather, vignette,
 * grain.
 *
 * The backdrop does not move with the camera. It was tried — panning and zooming
 * shifted it slightly for depth — but zoom-to-cursor changes the camera's x and y
 * as well, so every zoom made the wallpaper slide. A backdrop that reacts to
 * navigation is a distraction, not depth.
 *
 * A space's own background, when the user has picked one, overrides the theme's scene.
 */
export const SceneLayer: React.FC<{ theme: Theme }> = ({ theme }) => {
  // 배경을 뒤집어 놓았어도 비네트는 그림 위 장식이라 그림이 실제로 어떤지를
  // 따른다. 그래서 light가 아니라 autoLight다.
  const { autoLight, light } = useGround(theme);
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const particlesChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.particles);
  const patternChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.pattern);
  const { atmosphere } = theme;

  // The space's own weather wins over the theme's; 'none' is a real choice, so
  // it has to be told apart from "never picked" (D-066).
  const particles = particlesChoice ?? theme.particles;

  const scene: SceneSpec = override
    ? override.type === 'IMAGE'
      ? { kind: 'image', src: override.value }
      : { kind: 'color', value: override.value }
    : sceneForPolarity(theme, light);

  // Changing theme or wallpaper crossfades rather than cutting.
  const sceneKey = scene.kind === 'image' ? scene.src : scene.value;

  // scrim과 glow는 사진 위에서 글자가 읽히게 하려고 테마가 자기 사진에 맞춰 정해둔
  // 것이다. 단색 배경에 그대로 얹으면 고른 색이 그 색으로 안 나온다 — Amber Lake의
  // 따뜻한 scrim 아래에서 Mist(#f1f5f9)가 탁한 회색으로 보이던 원인이다.
  const flat = scene.kind === 'color';
  // 비네트도 실제로 뒤에 깔린 색을 따라간다. 사진일 때 theme.mood를 보면
  // 오버라이드 사진(Meadow·Cabin)에서 테마가 적어둔 값과 실제 사진이 갈린다 —
  // useGround가 그 사진의 평균 색을 읽어 이미 답을 갖고 있다.
  const lightBackdrop = flat ? isLightBackground(scene.value) : autoLight;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        <motion.div
          key={sceneKey}
          className="absolute inset-0"
          style={sceneStyle(scene)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {!flat && <div className="absolute inset-0" style={scrimStyle(atmosphere)} />}

      {!flat && atmosphere.glow && (
        <div
          className={`absolute inset-0 scene-glow ${
            atmosphere.glow.flicker ? 'scene-glow-flicker' : 'scene-glow-breathe'
          }`}
          style={glowStyle(atmosphere.glow)}
        />
      )}

      {particles && particles.kind !== 'none' && (
        <ParticleLayer kind={particles.kind} density={particles.density} />
      )}

      {/* 무늬는 단색 위에만 깐다. 사진 위 격자는 얼룩으로 보인다. 공간이 고른 게
          없으면 테마가 정한다 — Swiss Editorial은 격자, 나머지는 없음. */}
      {flat && (patternChoice ?? (theme.flat ? 'grid' : 'none')) === 'grid' && (
        <div className="absolute inset-0 scene-grid" />
      )}

      {!theme.flat && <div
        className={`absolute inset-0 ${
          lightBackdrop ? 'scene-vignette-light' : 'scene-vignette'
        }`}
      />}
      {!theme.flat && <div className="absolute inset-0 scene-grain" />}
    </div>
  );
};
