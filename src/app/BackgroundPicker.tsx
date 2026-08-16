import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { SOLID_COLORS, WALLPAPERS } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';

export const BackgroundPicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const setBackground = useSpaceStore((s) => s.setBackground);
  const current = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background.value);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploadWallpaper = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) setBackground({ type: 'IMAGE', value: url });
  };

  return (
    <div className="fixed top-9 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Background"
        className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg"
      >
        <ImageIcon size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
              Wallpaper
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {WALLPAPERS.map((url) => (
                <button
                  key={url}
                  onClick={() => setBackground({ type: 'IMAGE', value: url })}
                  className={`aspect-video rounded-lg bg-cover bg-center border-2 transition-all ${
                    current === url ? 'border-indigo-400' : 'border-transparent hover:border-white/30'
                  }`}
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}

              <button
                onClick={() => fileInput.current?.click()}
                title="Use your own image"
                className="aspect-video rounded-lg border-2 border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 flex items-center justify-center transition-colors"
              >
                <Upload size={14} />
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

            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
              Color
            </div>
            <div className="grid grid-cols-6 gap-2">
              {SOLID_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBackground({ type: 'COLOR', value: color })}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    current === color ? 'border-indigo-400' : 'border-white/10 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
