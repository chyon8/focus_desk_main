import React, { useEffect } from 'react';
import { Briefcase, ChevronDown, ChevronUp, Coffee, Pause, Play, RotateCcw } from 'lucide-react';
import { TimerData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TimerWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<TimerData>(id);

  useEffect(() => {
    if (!data.isRunning) return;
    if (data.timeLeft <= 0) {
      update({ isRunning: false });
      return;
    }
    const interval = setInterval(() => update({ timeLeft: data.timeLeft - 1 }), 1000);
    return () => clearInterval(interval);
  }, [data.isRunning, data.timeLeft, update]);

  const adjust = (minutes: number) => {
    const duration = Math.max(60, data.duration + minutes * 60);
    update({ duration, timeLeft: duration, isRunning: false });
  };

  const switchMode = (mode: 'FOCUS' | 'BREAK') => {
    const duration = mode === 'BREAK' ? 5 * 60 : 25 * 60;
    update({ mode, duration, timeLeft: duration, isRunning: mode === 'BREAK' });
  };

  return (
    <div className="h-full w-full flex flex-col p-6 items-center justify-center relative">
      <div className="t-soft absolute top-4 w-full px-6 flex justify-between items-center text-xs font-medium tracking-wider uppercase">
        <span>{data.mode === 'BREAK' ? 'On Break' : 'Timer'}</span>
        <button
          onClick={() => switchMode(data.mode === 'FOCUS' ? 'BREAK' : 'FOCUS')}
          className="chrome-button flex items-center gap-1 px-2 py-1 rounded-md"
        >
          {data.mode === 'FOCUS' ? (
            <>
              <Coffee size={12} /> Take a Break
            </>
          ) : (
            <>
              <Briefcase size={12} /> Back to Work
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center mb-8 relative group">
        <div
          className="text-6xl font-bold font-mono tracking-wider drop-shadow-2xl tabular-nums"
          style={{ color: data.mode === 'BREAK' ? 'var(--accent)' : 'var(--ink)' }}
        >
          {formatTime(data.timeLeft)}
        </div>

        {!data.isRunning && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => adjust(1)}
              className="chrome-button p-1 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => adjust(-1)}
              className="chrome-button p-1 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6 items-center">
        <button
          onClick={() => update({ isRunning: !data.isRunning })}
          className={`w-16 h-16 flex items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-lg ${
            data.isRunning ? 'chrome-button-on' : 'glass chrome-button'
          }`}
        >
          {data.isRunning ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-1" />
          )}
        </button>

        <button
          onClick={() => update({ isRunning: false, timeLeft: data.duration })}
          className="glass chrome-button w-12 h-12 flex items-center justify-center rounded-xl active:scale-95"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};
