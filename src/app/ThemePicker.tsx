import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, CloudRain, Flame, Palette, Snowflake, Sparkles, Upload, type LucideIcon } from 'lucide-react';
import { assetUrl, SOLID_COLORS } from '../spaces/backgrounds';
import type { ParticlesChoice } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { getTheme, THEMES } from '../themes/themes';
import type { SceneSpec } from '../themes/types';

function thumbStyle(scene: SceneSpec): React.CSSProperties {
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

/** The weather a space can be given, independent of its theme (D-066). */
const WEATHER: { kind: ParticlesChoice['kind']; label: string; icon: LucideIcon }[] = [
  { kind: 'none', label: 'Clear', icon: Ban },
  { kind: 'rain', label: 'Rain', icon: CloudRain },
  { kind: 'snow', label: 'Snow', icon: Snowflake },
  { kind: 'embers', label: 'Embers', icon: Flame },
  { kind: 'dust', label: 'Dust', icon: Sparkles },
];

// What a kind starts at when the space has no density of its own to carry over.
const DEFAULT_DENSITY = 0.4;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="t-soft text-[10px] font-semibold uppercase tracking-[0.14em] mb-2">{children}</div>
);

export const ThemePicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const setTheme = useSpaceStore((s) => s.setTheme);
  const setBackground = useSpaceStore((s) => s.setBackground);
  const setParticles = useSpaceStore((s) => s.setParticles);
  const themeId = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.themeId);
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const particlesChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.particles);
  const fileInput = useRef<HTMLInputElement>(null);
  const [wallpapers, setWallpapers] = useState<string[]>([]);

  // Re-read the folder every time the panel opens, so a picture dropped in
  // while the app is running is there the moment you look for it.
  useEffect(() => {
    if (isOpen) void window.images?.wallpapers().then(setWallpapers);
  }, [isOpen]);

  const uploadWallpaper = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) setBackground({ type: 'IMAGE', value: url });
  };

  // What is actually falling right now: the space's own choice, or the theme's.
  const weather: ParticlesChoice = particlesChoice ??
    getTheme(themeId).particles ?? { kind: 'none', density: DEFAULT_DENSITY };

  // A selected card gets a ring in the theme's own accent colour.
  const ring = (selected: boolean) =>
    selected ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined;

  return (
    <div className="fixed top-9 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Theme"
        className="glass chrome-button p-2.5 rounded-xl shadow-lg"
      >
        <Palette size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel absolute right-0 mt-2 w-72 p-4 rounded-2xl shadow-2xl"
          >
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className="group rounded-xl overflow-hidden text-left transition-transform hover:scale-[1.03]"
                  style={ring(themeId === theme.id && !override)}
                >
                  <div className="aspect-[4/3] w-full" style={thumbStyle(theme.scene)} />
                  <div
                    className="t-ink px-2 py-1.5 text-[11px] font-medium"
                    style={{ background: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
                  >
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>

            <Label>Weather</Label>
            <div className="flex items-center gap-1 mb-2">
              {WEATHER.map(({ kind, label, icon: Icon }) => (
                <button
                  key={kind}
                  onClick={() =>
                    setParticles({
                      kind,
                      // Keep the strength you already had when only swapping kind.
                      density: weather.kind === 'none' ? DEFAULT_DENSITY : weather.density,
                    })
                  }
                  title={label}
                  className={`chrome-button flex-1 h-9 flex items-center justify-center rounded-lg ${
                    weather.kind === kind ? 'chrome-button-on' : ''
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5 px-0.5">
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(weather.density * 100)}
                disabled={weather.kind === 'none'}
                onChange={(e) =>
                  setParticles({ kind: weather.kind, density: Number(e.target.value) / 100 })
                }
                title="How much of it"
                className="ambience-slider flex-1 h-1 rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-default"
              />
              <span className="t-faint w-7 text-right text-[10px] tabular-nums">
                {weather.kind === 'none' ? '—' : Math.round(weather.density * 100)}
              </span>
            </div>

            <Label>My wallpaper</Label>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
              {wallpapers.map((url) => (
                <button
                  key={url}
                  onClick={() => setBackground({ type: 'IMAGE', value: url })}
                  className="aspect-video rounded-lg bg-cover bg-center transition-transform hover:scale-[1.06]"
                  style={{ backgroundImage: `url(${assetUrl(url)})`, ...ring(override?.value === url) }}
                />
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                title="Use your own image"
                className="border-hair t-soft aspect-video rounded-lg border border-dashed flex items-center justify-center transition-colors"
              >
                <Upload size={13} />
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadWallpaper(file);
              }}
            />

            <div className="grid grid-cols-6 gap-2">
              {SOLID_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBackground({ type: 'COLOR', value: color })}
                  className="aspect-square rounded-lg transition-transform hover:scale-[1.1]"
                  style={{ backgroundColor: color, ...ring(override?.value === color) }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
