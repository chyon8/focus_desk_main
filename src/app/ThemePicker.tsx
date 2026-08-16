import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Palette, Upload } from 'lucide-react';
import { SOLID_COLORS, WALLPAPERS } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';
import { THEMES } from '../themes/themes';
import type { SceneSpec } from '../themes/types';

function thumbStyle(scene: SceneSpec): React.CSSProperties {
  switch (scene.kind) {
    case 'image':
      return { backgroundImage: `url(${scene.src})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    case 'gradient':
      return { backgroundImage: scene.value };
    case 'color':
      return { backgroundColor: scene.value };
  }
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
    style={{ color: 'var(--ink-soft)' }}
  >
    {children}
  </div>
);

export const ThemePicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const setTheme = useSpaceStore((s) => s.setTheme);
  const setBackground = useSpaceStore((s) => s.setBackground);
  const themeId = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.themeId);
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploadWallpaper = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) setBackground({ type: 'IMAGE', value: url });
  };

  // A selected card gets a ring in the theme's own accent colour.
  const ring = (selected: boolean) =>
    selected ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined;

  return (
    <div className="fixed top-9 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Theme"
        className="p-2.5 rounded-xl backdrop-blur-md border transition-all shadow-lg hover:brightness-125"
        style={{
          background: 'var(--panel)',
          borderColor: 'var(--panel-border)',
          color: 'var(--ink)',
        }}
      >
        <Palette size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-72 p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl"
            style={{ background: 'var(--panel)', borderColor: 'var(--panel-border)' }}
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
                    className="px-2 py-1.5 text-[11px] font-medium"
                    style={{ color: 'var(--ink)', background: 'rgba(0,0,0,0.25)' }}
                  >
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>

            <Label>My wallpaper</Label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {WALLPAPERS.map((url) => (
                <button
                  key={url}
                  onClick={() => setBackground({ type: 'IMAGE', value: url })}
                  className="aspect-video rounded-lg bg-cover bg-center transition-transform hover:scale-[1.06]"
                  style={{ backgroundImage: `url(${url})`, ...ring(override?.value === url) }}
                />
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                title="Use your own image"
                className="aspect-video rounded-lg border border-dashed flex items-center justify-center transition-colors"
                style={{ borderColor: 'var(--panel-border)', color: 'var(--ink-soft)' }}
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
