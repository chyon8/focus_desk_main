

import React, { useState } from 'react';
import { FocusSessionState, WidgetType, RadioState, RADIO_STATIONS } from '../types';
import { Play, Pause, Square, ChevronDown, Scroll, ListTodo, Trello, SkipForward, Volume2, Coffee, Briefcase, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  session: FocusSessionState;
  updateSession: (updates: Partial<FocusSessionState>) => void;
  onStop: () => void;
  addWidget: (type: WidgetType) => void;
  radioState: RadioState;
  radioControls: {
    toggleRadio: () => void;
    setRadioVolume: (vol: number) => void;
    nextStation: () => void;
  };
}

export const FocusSessionBar: React.FC<Props> = ({ session, updateSession, onStop, addWidget, radioState, radioControls }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Format seconds into HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${minsStr}:${secsStr}`;
    }
    return `${minsStr}:${secsStr}`;
  };

  const togglePause = () => {
    updateSession({ isPaused: !session.isPaused });
  };

  const toggleMode = () => {
    if (session.mode === 'FOCUS') {
      updateSession({ mode: 'BREAK' });
    } else {
      updateSession({ mode: 'FOCUS' });
    }
  };

  const activeTime = session.mode === 'BREAK' ? session.breakTime : session.elapsedTime;
  const isBreak = session.mode === 'BREAK';

  // If not active, do NOT show the pill. Start is only via Task.
  if (!session.isActive) {
    return null;
  }

  // Active Session HUD - Zen Mode (Hidden until hover)
  return (
    <div 
        className="fixed top-0 left-0 right-0 z-[6000] flex justify-center pt-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsExpanded(false); }}
    >
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center group/hud"
      >
        {/* Main HUD Capsule */}
        <motion.div 
            layout
            className={`
                bg-[#121215] border rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] 
                flex items-center gap-5 z-20 transition-all duration-500 ease-spring
                ${isHovered ? 'p-1.5 pr-2 min-w-[240px] border-white/10' : 'p-2 border-transparent w-[36px] h-[36px] justify-center gap-0'}
            `}
        >
            
            {/* Zen Mode State (Small Dot when not hovered) */}
            {!isHovered && (
                 <div className="relative">
                     <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${session.isPaused ? 'bg-yellow-500' : (isBreak ? 'bg-emerald-500' : 'bg-red-500')}`} />
                     <div className={`relative w-2 h-2 rounded-full ${session.isPaused ? 'bg-yellow-500' : (isBreak ? 'bg-emerald-500' : 'bg-red-500')}`} />
                 </div>
            )}

            {/* Left: Status Indicator (Only visible on hover) */}
            {isHovered && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 pl-3"
                >
                    <div className="relative">
                        {!session.isPaused && (
                            <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isBreak ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        )}
                        <div className={`relative w-2.5 h-2.5 rounded-full ${session.isPaused ? 'bg-yellow-500' : (isBreak ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]')}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] leading-none mb-0.5 ${isBreak ? 'text-emerald-500/50' : 'text-white/30'}`}>
                            {session.isPaused ? 'PAUSED' : (isBreak ? 'ON BREAK' : 'FOCUS')}
                        </span>
                        <span className="text-xl font-mono font-medium text-white tracking-widest leading-none">
                            {formatTime(activeTime)}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Right: Controls (Only visible on hover) */}
            {isHovered && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1"
                >
                    <button 
                        onClick={toggleMode}
                        className={`p-2 rounded-full transition-colors ${
                            isBreak 
                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                            : 'text-white/40 hover:text-indigo-400 hover:bg-white/5'
                        }`}
                        title={isBreak ? "Back to Work" : "Take a Break"}
                    >
                        {isBreak ? <Briefcase size={14} /> : <Coffee size={14} />}
                    </button>
                    <button 
                        onClick={togglePause}
                        className={`p-2 rounded-full transition-colors ${
                            session.isPaused 
                            ? 'bg-white/10 text-white hover:bg-white/20' 
                            : 'text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {session.isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                    </button>
                    <button 
                        onClick={onStop}
                        className="p-2 rounded-full text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                    >
                        <Square size={14} fill="currentColor" />
                    </button>
                </motion.div>
            )}
        </motion.div>

        {/* Expansion Handle (Only visible on hover) */}
        {isHovered && (
            <motion.button 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    h-3 w-12 bg-[#121215] border-b border-l border-r border-white/10 rounded-b-lg flex items-center justify-center -mt-[1px] z-10 transition-all duration-300 cursor-pointer hover:h-4
                    ${isExpanded ? 'border-white/20' : 'opacity-50 hover:opacity-100'}
                `}
            >
                <ChevronDown size={10} className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </motion.button>
        )}

        {/* Active Task Name Indicator (Below Capsule) */}
        {isHovered && session.activeTaskName && !isExpanded && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5"
             >
                 <Target size={10} className="text-indigo-400" />
                 <span className="text-xs text-white/80 font-medium max-w-[200px] truncate">
                    {session.activeTaskName}
                 </span>
             </motion.div>
        )}

        {/* Expansion Panel (Quick Tools) */}
        <AnimatePresence>
            {isExpanded && isHovered && (
                <motion.div
                    initial={{ height: 0, opacity: 0, scale: 0.95 }}
                    animate={{ height: 'auto', opacity: 1, scale: 1 }}
                    exit={{ height: 0, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                    className="overflow-hidden w-full max-w-[280px] -mt-2"
                >
                    <div className="bg-[#121215]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl mt-3 mx-1">
                        
                        {/* Active Task Display (Inside Panel) */}
                        {session.activeTaskName && (
                            <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                                <Target size={14} className="shrink-0" />
                                <span className="text-xs font-medium truncate">{session.activeTaskName}</span>
                            </div>
                        )}

                        {/* Quick Widgets */}
                        <div className="flex justify-between gap-2 mb-3">
                            {[
                                { id: 'NEW_MEMO', icon: Scroll, label: 'Memo' },
                                { id: 'TODO', icon: ListTodo, label: 'Tasks' },
                                { id: 'KANBAN', icon: Trello, label: 'Board' }
                            ].map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={() => addWidget(item.id as WidgetType)} 
                                    className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all group"
                                >
                                    <item.icon size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                                    <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Mini Music Player */}
                        <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                     <div className={`w-1.5 h-1.5 rounded-full ${radioState.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                                     <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">
                                        {radioState.isCustomPlaying ? 'Custom Stream' : RADIO_STATIONS.find(s => s.id === radioState.activeStationId)?.name}
                                     </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={radioControls.toggleRadio} className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                                        {radioState.isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                    </button>
                                    <button onClick={radioControls.nextStation} className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                                        <SkipForward size={12} fill="currentColor" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Volume2 size={10} className="text-white/30" />
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={radioState.volume}
                                    onChange={(e) => radioControls.setRadioVolume(parseInt(e.target.value))}
                                    className="flex-1 h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-indigo-300"
                                />
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};