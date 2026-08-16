
import React, { useEffect } from 'react';
import { TimerWidgetData } from '../../types';
import { Play, Pause, RotateCcw, Coffee, ChevronUp, ChevronDown, Briefcase } from 'lucide-react';

interface Props {
  data: TimerWidgetData;
  updateWidget: (id: string, updates: Partial<TimerWidgetData>) => void;
}

export const TimerWidget: React.FC<Props> = ({ data, updateWidget }) => {
  
  useEffect(() => {
    let interval: number;
    if (data.isRunning && data.timeLeft > 0) {
      interval = window.setInterval(() => {
        updateWidget(data.id, { timeLeft: data.timeLeft - 1 });
      }, 1000);
    } else if (data.timeLeft === 0 && data.isRunning) {
      updateWidget(data.id, { isRunning: false });
      // In a real app, play a sound here
    }
    return () => clearInterval(interval);
  }, [data.isRunning, data.timeLeft, data.id, updateWidget]);

  const toggleTimer = () => {
    updateWidget(data.id, { isRunning: !data.isRunning });
  };

  const resetTimer = () => {
    updateWidget(data.id, { 
      isRunning: false,
      timeLeft: data.duration 
    });
  };

  const adjustTime = (minutes: number) => {
    const newDuration = Math.max(60, data.duration + minutes * 60); // Min 1 minute
    updateWidget(data.id, {
      duration: newDuration,
      timeLeft: newDuration,
      isRunning: false
    });
  };

  const setBreakMode = () => {
    const breakDuration = 5 * 60; // 5 minutes default for break
    updateWidget(data.id, {
      mode: 'BREAK',
      duration: breakDuration,
      timeLeft: breakDuration,
      isRunning: true // Auto start break
    });
  };

  const setFocusMode = () => {
    const focusDuration = 25 * 60; // 25 minutes default for focus
    updateWidget(data.id, {
      mode: 'FOCUS',
      duration: focusDuration,
      timeLeft: focusDuration,
      isRunning: false
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full flex flex-col p-6 items-center justify-center relative bg-gradient-to-b from-transparent to-black/10">
      
      {/* Header / Mode Indicator */}
      <div className="absolute top-4 w-full px-6 flex justify-between items-center text-xs font-medium tracking-wider uppercase text-white/40">
        <span>{data.mode === 'BREAK' ? 'ON BREAK' : 'TIMER'}</span>
        
        {data.mode === 'FOCUS' ? (
          <button 
            onClick={setBreakMode} 
            className="hover:text-white flex items-center gap-1 transition-colors text-white/60 bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:bg-white/10"
          >
            <Coffee size={12} /> Take a Break
          </button>
        ) : (
          <button 
            onClick={setFocusMode} 
            className="hover:text-white flex items-center gap-1 transition-colors text-white/60 bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:bg-white/10"
          >
            <Briefcase size={12} /> Back to Work
          </button>
        )}
      </div>

      {/* Time Display */}
      <div className="flex flex-col items-center justify-center mb-8 relative group">
        <div className={`text-6xl font-bold font-mono tracking-wider drop-shadow-2xl tabular-nums transition-colors ${data.mode === 'BREAK' ? 'text-green-200' : 'text-white'}`}>
          {formatTime(data.timeLeft)}
        </div>
        
        {/* Time Adjusters (Visible on hover/paused) */}
        {!data.isRunning && (
           <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => adjustTime(1)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"><ChevronUp size={16}/></button>
              <button onClick={() => adjustTime(-1)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"><ChevronDown size={16}/></button>
           </div>
        )}
        {!data.isRunning && (
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => adjustTime(5)} className="p-1 hover:bg-white/10 rounded text-[10px] text-white/50 hover:text-white font-mono">+5m</button>
               <button onClick={() => adjustTime(-5)} className="p-1 hover:bg-white/10 rounded text-[10px] text-white/50 hover:text-white font-mono">-5m</button>
            </div>
         )}
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-center">
        <button 
          onClick={toggleTimer}
          className={`w-16 h-16 flex items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-lg ${
            data.isRunning 
              ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
          }`}
        >
          {data.isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        
        <button 
          onClick={resetTimer}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      
      {!data.isRunning && (
          <div className="absolute bottom-4 text-[10px] text-white/20">
            Hover time to adjust
          </div>
      )}
    </div>
  );
};