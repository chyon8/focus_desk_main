import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, Coffee, Flame, Volume2 } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { AmbienceEngine, AmbienceLayer, SILENT_AMBIENCE } from './engine';

const LAYERS: { key: AmbienceLayer; label: string; icon: typeof CloudRain }[] = [
  { key: 'rain', label: 'Rain', icon: CloudRain },
  { key: 'fire', label: 'Fire', icon: Flame },
  { key: 'cafe', label: 'Cafe', icon: Coffee },
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
        className={`p-2.5 rounded-xl border transition-all shadow-lg ${
          isPlaying ? 'chrome-button-on' : 'glass chrome-button'
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
            className="glass-panel absolute right-0 mt-2 w-64 p-4 rounded-2xl shadow-2xl"
          >
            <div className="t-faint text-[10px] font-bold uppercase tracking-widest mb-3">
              Ambience
            </div>

            <div className="space-y-3">
              {LAYERS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center gap-3 group">
                  <Icon size={16} className="t-soft group-hover:opacity-100 transition-opacity" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ambience[key]}
                    onChange={(e) => setAmbience({ ...ambience, [key]: Number(e.target.value) })}
                    className="ambience-slider flex-1 h-1 rounded-lg appearance-none cursor-pointer"
                    title={label}
                  />
                  <span className="t-faint w-7 text-right text-[10px] tabular-nums">
                    {ambience[key]}
                  </span>
                </div>
              ))}
            </div>

            {isPlaying && (
              <button
                onClick={() => setAmbience({ ...SILENT_AMBIENCE })}
                className="row mt-4 w-full py-1.5 rounded-lg text-[10px] font-medium"
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
