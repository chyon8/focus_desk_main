import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, Coffee, Flame, Volume2 } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { AmbienceEngine, AmbienceLayer, SILENT_AMBIENCE } from './engine';

const LAYERS: { key: AmbienceLayer; label: string; icon: typeof CloudRain; accent: string }[] = [
  { key: 'rain', label: 'Rain', icon: CloudRain, accent: 'accent-blue-400' },
  { key: 'fire', label: 'Fire', icon: Flame, accent: 'accent-orange-400' },
  { key: 'cafe', label: 'Cafe', icon: Coffee, accent: 'accent-yellow-600' },
];

export const AmbienceDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ambience = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.ambience ?? SILENT_AMBIENCE);
  const setAmbience = useSpaceStore((s) => s.setAmbience);
  const engineRef = useRef<AmbienceEngine | null>(null);

  useEffect(() => {
    engineRef.current ??= new AmbienceEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Follows the active space, so switching spaces changes the soundscape.
  useEffect(() => {
    engineRef.current?.setLevels(ambience);
  }, [ambience]);

  const isPlaying = ambience.rain + ambience.fire + ambience.cafe > 0;

  return (
    <div className="fixed top-9 right-20 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Ambience"
        className={`p-2.5 rounded-xl backdrop-blur-md border transition-all shadow-lg ${
          isPlaying
            ? 'bg-indigo-500/30 border-indigo-400/40 text-indigo-200'
            : 'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <Volume2 size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-64 p-4 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              Ambience
            </div>

            <div className="space-y-3">
              {LAYERS.map(({ key, label, icon: Icon, accent }) => (
                <div key={key} className="flex items-center gap-3 group">
                  <Icon size={16} className="text-white/50 group-hover:text-white/80 transition-colors" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ambience[key]}
                    onChange={(e) => setAmbience({ ...ambience, [key]: Number(e.target.value) })}
                    className={`flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer ${accent}`}
                    title={label}
                  />
                  <span className="w-7 text-right text-[10px] tabular-nums text-white/40">
                    {ambience[key]}
                  </span>
                </div>
              ))}
            </div>

            {isPlaying && (
              <button
                onClick={() => setAmbience({ ...SILENT_AMBIENCE })}
                className="mt-4 w-full py-1.5 rounded-lg text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                Silence
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
