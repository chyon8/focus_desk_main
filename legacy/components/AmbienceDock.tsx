

import React, { useState, useRef } from 'react';
import { Space, DEFAULT_BACKGROUNDS, RADIO_STATIONS, RadioState } from '../types';
import { CloudRain, Flame, Coffee, Image as ImageIcon, Volume2, Palette, Upload, Play, Pause, Radio, Globe, Link as LinkIcon, Trash2, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  space: Space;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  visible: boolean;
  radioState: RadioState;
  radioControls: {
    toggleRadio: () => void;
    setRadioVolume: (vol: number) => void;
    setStation: (id: string) => void;
    setCustomRadio: (url: string) => void;
  };
}

const COLOR_PRESETS = [
  '#1e1e24', '#0f172a', '#334155', '#0f291e', '#2e1065', '#4a044e', '#451a03', '#000000',
];

const MINIMAL_THEMES = [
  { name: 'Mist', bg: '#f1f5f9', text: '#475569', accent: '#94a3b8', border: '#cbd5e1' },
  { name: 'Deep Forest', bg: '#0f291e', text: '#d1fae5', accent: '#34d399', border: '#064e3b' },
  { name: 'Stone', bg: '#292524', text: '#d6d3d1', accent: '#78716c', border: '#44403c' },
  { name: 'Sand', bg: '#fdf6e3', text: '#5c534b', accent: '#dcb886', border: '#ebdcc1' },
];

const CREATIVE_THEMES = [
  { name: 'Cyberpunk', bg: '#0A0E27', primary: '#FF006E', secondary: '#00F5FF' },
  { name: 'Lavender', bg: '#1A0F2E', primary: '#9D4EDD', secondary: '#C77DFF' },
  { name: 'Ocean', bg: '#0F1C1E', primary: '#006D77', secondary: '#83C5BE' },
  { name: 'Sunset', bg: '#1A0F0A', primary: '#FF5A5F', secondary: '#FFB400' },
];

export const AmbienceDock: React.FC<Props> = ({ space, updateSpace, visible, radioState, radioControls }) => {
  const [activeMenu, setActiveMenu] = useState<'NONE' | 'AMBIENCE' | 'BACKGROUND' | 'COLOR'>('NONE');
  const [localCustomUrl, setLocalCustomUrl] = useState(radioState.customUrl);
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (visible && activeMenu === 'BACKGROUND') {
        loadGallery();
    }
  }, [visible, activeMenu]);

  const loadGallery = async () => {
    try {
        setLoadingGallery(true);
        // @ts-ignore
        const images = await window.ipcRenderer.gallery.getImages();
        setCustomImages(images);
    } catch(e) { console.error("Failed to load gallery", e) } 
    finally { setLoadingGallery(false); }
  };

  const toggleMenu = (menu: 'AMBIENCE' | 'BACKGROUND' | 'COLOR') => {
    setActiveMenu(activeMenu === menu ? 'NONE' : menu);
  };

  const handleCustomImageDelete = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (confirm('Delete this image?')) {
        // @ts-ignore
        const success = await window.ipcRenderer.gallery.deleteImage(url);
        if (success) {
            setCustomImages(prev => prev.filter(img => img !== url));
            if (space.backgroundUrl === url) {
               updateSpace(space.id, { backgroundUrl: DEFAULT_BACKGROUNDS[0] });
            }
        }
    }
  };

  const handleBackgroundChange = (url: string) => {
    if (brokenImages.has(url)) return; // Prevent clicking broken images
    updateSpace(space.id, { backgroundUrl: url, backgroundType: 'IMAGE' });
  };

  const handleImageError = (url: string) => {
    setBrokenImages(prev => new Set(prev).add(url));
  };

  const handleColorChange = (color: string) => {
    updateSpace(space.id, { backgroundUrl: color, backgroundType: 'COLOR' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const buffer = await file.arrayBuffer();
        // @ts-ignore
        const localUrl = await window.ipcRenderer.invoke('save-image', buffer, file.name);
        
        // Refresh gallery
        await loadGallery();

        updateSpace(space.id, { 
            backgroundUrl: localUrl, 
            backgroundType: 'IMAGE' 
        });
      } catch (err) {
        console.error('Failed to save image:', err);
      }
    }
  };

  if (!visible) return null;

  const isLightTheme = space.backgroundType === 'COLOR' && 
    (space.backgroundUrl === '#f1f5f9' || space.backgroundUrl === '#fdf6e3');
  
  const getButtonStyle = (isActive: boolean) => {
    if (isLightTheme) {
       return isActive 
        ? 'bg-slate-800 text-white border-slate-600' 
        : 'bg-white/50 text-slate-800 border-black/10 hover:bg-white/80'; 
    }
    return isActive 
        ? 'bg-white/20 border-white/40 text-white' 
        : 'bg-black/30 border-white/10 text-white/70 hover:bg-black/40 hover:text-white';
  };

  const activeStation = RADIO_STATIONS.find(s => s.id === radioState.activeStationId);

  return (
    <div className="fixed top-6 right-6 z-[5500] flex flex-col gap-3 items-end no-capture">
      
      {/* Colors */}
      <div className="relative">
        <button 
            onClick={() => toggleMenu('COLOR')}
            className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg ${getButtonStyle(activeMenu === 'COLOR')}`}
            title="Solid Colors"
        >
            <Palette size={20} />
        </button>
        <AnimatePresence>
          {activeMenu === 'COLOR' && (
             <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: -16, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="absolute top-0 right-full bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-72 shadow-2xl origin-top-right max-h-[80vh] overflow-y-auto scrollbar-hide"
              >
                <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3 pb-2 border-b border-white/10">Solid Colors</div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {COLOR_PRESETS.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleColorChange(color)}
                      className={`w-full aspect-square rounded-full border-2 transition-all hover:scale-110 ${space.backgroundUrl === color && space.backgroundType === 'COLOR' ? 'border-white scale-110' : 'border-white/10'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <div className="border-t border-white/10 my-4" />
                <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Creative Themes</div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {CREATIVE_THEMES.map((theme, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleColorChange(theme.bg)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all hover:bg-white/5 ${space.backgroundUrl === theme.bg && space.backgroundType === 'COLOR' ? 'border-white/40 bg-white/5' : 'border-white/5 bg-transparent'}`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-white/10 shadow-sm" 
                        style={{ backgroundColor: theme.bg }} 
                      />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium text-white">{theme.name}</span>
                        <div className="flex gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.secondary }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 my-4" />
                
                <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Minimal Themes</div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {MINIMAL_THEMES.map((theme, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleColorChange(theme.bg)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all hover:bg-white/5 ${space.backgroundUrl === theme.bg && space.backgroundType === 'COLOR' ? 'border-white/40 bg-white/5' : 'border-white/5 bg-transparent'}`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-white/10 shadow-sm" 
                        style={{ backgroundColor: theme.bg }} 
                      />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium text-white">{theme.name}</span>
                        <div className="flex gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.text }} />
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 my-4" />

                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <input 
                        type="color" 
                        value={space.backgroundType === 'COLOR' && space.backgroundUrl.startsWith('#') ? space.backgroundUrl : '#000000'}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-xs text-white/50">Custom Color</span>
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backgrounds */}
      <div className="relative">
        <button 
            onClick={() => toggleMenu('BACKGROUND')}
            className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg ${getButtonStyle(activeMenu === 'BACKGROUND')}`}
            title="Change Wallpaper"
        >
            <ImageIcon size={20} />
        </button>
        <AnimatePresence>
          {activeMenu === 'BACKGROUND' && (
             <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: -16, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="absolute top-0 right-full bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-80 shadow-2xl origin-top-right"
              >
                <div className="mb-3 pb-3 border-b border-white/10">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-sm font-medium text-white"
                    >
                        <Upload size={16} />
                        <span>Upload Image</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 pr-1">
                   {/* Custom Gallery Section */}
                   {customImages.length > 0 && (
                     <div className="col-span-2 mb-2">
                        <div className="text-[10px] uppercase font-bold text-white/40 mb-2 px-1">My Wallpapers</div>
                        <div className="grid grid-cols-2 gap-2">
                            {customImages.map((imgUrl, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => handleBackgroundChange(imgUrl)} 
                                    className={`aspect-video rounded-lg overflow-hidden border-2 transition-all relative group ${space.backgroundUrl === imgUrl ? 'border-indigo-500 scale-105' : 'border-white/10 hover:border-white/30'}`}
                                >
                                    <img 
                                        src={imgUrl} 
                                        alt="custom" 
                                        className={`w-full h-full object-cover ${brokenImages.has(imgUrl) ? 'opacity-0' : ''}`}
                                        onError={() => handleImageError(imgUrl)} 
                                    />
                                    {/* Fallback for broken image */}
                                    {brokenImages.has(imgUrl) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/5 -z-10">
                                            <ImageOff className="text-white/20" size={20} />
                                        </div>
                                    )}

                                    {/* Delete Button */}
                                    <div 
                                        className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all cursor-pointer"
                                        onClick={(e) => handleCustomImageDelete(e, imgUrl)}
                                    >
                                        <Trash2 size={12} className="text-white" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-white/10 my-3" />
                     </div>
                   )}

                  {/* Standard Backgrounds */}
                   <div className="col-span-2 text-[10px] uppercase font-bold text-white/40 mb-2 px-1">Suggested</div>
                   {DEFAULT_BACKGROUNDS.filter(bg => !brokenImages.has(bg)).map((bg, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleBackgroundChange(bg)} 
                        className={`aspect-video rounded-lg overflow-hidden border-2 transition-all relative ${
                            space.backgroundUrl === bg && space.backgroundType === 'IMAGE' 
                                ? 'border-indigo-500 scale-105' 
                                : 'border-transparent hover:border-white/30'
                        }`}
                    >
                      <img 
                        src={bg} 
                        alt="bg" 
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(bg)} 
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Radio & Ambience */}
      <div className="relative">
        <button 
            onClick={() => toggleMenu('AMBIENCE')}
            className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg ${getButtonStyle(activeMenu === 'AMBIENCE')}`}
            title="Focus Radio"
        >
            <Radio size={20} />
        </button>
         <AnimatePresence>
          {activeMenu === 'AMBIENCE' && (
             <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: -16, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="absolute top-0 right-full bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-3xl w-80 shadow-2xl origin-top-right max-h-[85vh] overflow-y-auto scrollbar-hide"
              >
                {/* Compact Radio Display */}
                <div className="mb-4 bg-black/40 rounded-xl border border-white/10 p-3 relative overflow-hidden group">
                     
                     <div className="flex items-center justify-between relative z-10">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Frequency</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-mono font-bold text-white">
                                    {radioState.isCustomPlaying ? 'WEB' : (activeStation?.freq || '--.-')}
                                </span>
                                <span className="text-xs text-white/50 font-medium truncate max-w-[100px]">
                                    {radioState.isCustomPlaying ? 'Stream' : (activeStation?.name || 'Select Station')}
                                </span>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                            {radioState.isPlaying && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                            <span className={`text-[9px] font-bold tracking-wider ${radioState.isPlaying ? 'text-red-400' : 'text-white/20'}`}>
                                {radioState.isPlaying ? 'ON AIR' : 'OFF'}
                            </span>
                         </div>
                     </div>

                     {/* Compact Visualizer */}
                     <div className="absolute bottom-0 left-0 right-0 h-6 flex items-end justify-between px-1 gap-0.5 opacity-10 pointer-events-none">
                        {[...Array(32)].map((_, i) => (
                            <div 
                                key={i} 
                                className="w-full bg-indigo-500 rounded-t-sm transition-all duration-300 ease-linear"
                                style={{ 
                                    height: radioState.isPlaying ? `${Math.random() * 80 + 20}%` : '5%'
                                }}
                            />
                        ))}
                     </div>
                </div>
                
                {/* Volume Slider */}
                <div className="flex items-center gap-3 mb-4 px-1">
                    <Volume2 size={16} className="text-white/40" />
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={radioState.volume} 
                        onChange={(e) => radioControls.setRadioVolume(parseInt(e.target.value))} 
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-indigo-400" 
                    />
                </div>

                {/* Station Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {RADIO_STATIONS.map((station) => {
                        const isActive = radioState.activeStationId === station.id && !radioState.isCustomPlaying;
                        const isPlayingStation = isActive && radioState.isPlaying;
                        
                        return (
                            <button
                                key={station.id}
                                onClick={() => radioControls.setStation(station.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left relative overflow-hidden ${
                                    isActive 
                                    ? 'bg-white/10 border-white/30 text-white' 
                                    : 'bg-transparent border-white/5 text-white/60 hover:bg-white/5 hover:border-white/10 hover:text-white'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isActive ? 'bg-white text-black' : 'bg-white/10 text-white/50'}`}>
                                    {isPlayingStation ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-mono opacity-60 leading-tight">{station.freq}</span>
                                    <span className="text-[11px] font-medium truncate leading-tight">{station.name}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Custom URL Input */}
                <div className="bg-black/20 rounded-xl p-2 border border-white/5 mb-4">
                     <div className="flex gap-2">
                        <div className="flex-1 bg-black/40 rounded-lg border border-white/5 flex items-center px-2 py-1">
                            <LinkIcon size={12} className="text-white/20 shrink-0" />
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-none text-[10px] text-white p-1.5 outline-none placeholder-white/20 font-mono"
                                placeholder="Stream URL..."
                                value={localCustomUrl}
                                onChange={(e) => setLocalCustomUrl(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => radioControls.setCustomRadio(localCustomUrl)}
                            disabled={!localCustomUrl}
                            className={`px-3 rounded-lg flex items-center justify-center transition-all ${
                                radioState.isCustomPlaying && radioState.isPlaying
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                            }`}
                        >
                            <Globe size={14} />
                        </button>
                     </div>
                </div>

                <div className="border-t border-white/10 my-3" />

                {/* Ambience Mixer Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-widest"><Volume2 size={12} /><span>Environment</span></div>
                  
                  <div className="flex items-center gap-3 group">
                    <div className="w-6 flex justify-center"><CloudRain size={16} className="text-blue-300 opacity-60 group-hover:opacity-100 transition-opacity" /></div>
                    <input type="range" min="0" max="100" value={space.ambience.volumeRain} onChange={(e) => updateSpace(space.id, { ambience: { ...space.ambience, volumeRain: parseInt(e.target.value) }})} className="flex-1 accent-blue-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-6 flex justify-center"><Flame size={16} className="text-orange-300 opacity-60 group-hover:opacity-100 transition-opacity" /></div>
                    <input type="range" min="0" max="100" value={space.ambience.volumeFire} onChange={(e) => updateSpace(space.id, { ambience: { ...space.ambience, volumeFire: parseInt(e.target.value) }})} className="flex-1 accent-orange-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-6 flex justify-center"><Coffee size={16} className="text-yellow-600 opacity-60 group-hover:opacity-100 transition-opacity" /></div>
                    <input type="range" min="0" max="100" value={space.ambience.volumeCafe} onChange={(e) => updateSpace(space.id, { ambience: { ...space.ambience, volumeCafe: parseInt(e.target.value) }})} className="flex-1 accent-yellow-600 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};