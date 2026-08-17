import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSpaceStore } from '../stores/spaceStore';
import { ParticleLayer } from './ParticleLayer';
import type { Atmosphere, Glow, SceneSpec, Theme } from './types';

function sceneStyle(scene: SceneSpec): React.CSSProperties {
  switch (scene.kind) {
    case 'image':
      return {
        backgroundImage: `url(${scene.src})`,
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
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const { atmosphere } = theme;

  const scene: SceneSpec = override
    ? override.type === 'IMAGE'
      ? { kind: 'image', src: override.value }
      : { kind: 'color', value: override.value }
    : theme.scene;

  // Changing theme or wallpaper crossfades rather than cutting.
  const sceneKey = scene.kind === 'image' ? scene.src : scene.value;

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

      <div className="absolute inset-0" style={scrimStyle(atmosphere)} />

      {atmosphere.glow && (
        <div
          className={`absolute inset-0 scene-glow ${
            atmosphere.glow.flicker ? 'scene-glow-flicker' : 'scene-glow-breathe'
          }`}
          style={glowStyle(atmosphere.glow)}
        />
      )}

      {theme.particles && (
        <ParticleLayer kind={theme.particles.kind} density={theme.particles.density} />
      )}

      <div
        className={`absolute inset-0 ${
          theme.mood === 'light' ? 'scene-vignette-light' : 'scene-vignette'
        }`}
      />
      <div className="absolute inset-0 scene-grain" />
    </div>
  );
};
