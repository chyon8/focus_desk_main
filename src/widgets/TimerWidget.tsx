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
      {/* top-10: float 헤더(30px)와 겹치지 않게 아래로 내렸다 */}
      <div className="t-soft absolute top-10 w-full px-6 flex justify-between items-center text-ui font-medium tracking-wider uppercase">
        <span>{data.mode === 'BREAK' ? 'On Break' : 'Timer'}</span>
        <button
          onClick={() => switchMode(data.mode === 'FOCUS' ? 'BREAK' : 'FOCUS')}
          className="chrome-button press flex items-center gap-1 px-2 py-1 rounded-control"
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
        {/* 글자 6단의 맨 위(--text-display 34px). 60px에 순수 검정 drop-shadow를
            달고 있었다 — 크기는 눈금 밖이었고 그림자는 광원 규칙 밖이었다.
            큰 글자라 트래킹은 음수로 조인다. */}
        <div
          className="text-display font-bold font-mono tabular-nums"
          style={{
            color: data.mode === 'BREAK' ? 'var(--accent)' : 'var(--ink)',
            letterSpacing: '-0.035em',
          }}
        >
          {formatTime(data.timeLeft)}
        </div>

        {!data.isRunning && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => adjust(1)}
              className="chrome-button press p-1 rounded-mark"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => adjust(-1)}
              className="chrome-button press p-1 rounded-mark"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 재생은 강조색으로 채운 알약 + 글자, 리셋은 옅은 원(2026-09-15 디자인 리뉴얼).
          전에는 64px 네모에 테두리와 그림자를 달아 카드 위에 입체 버튼이 하나 더 떠 있었다. */}
      <div className="flex gap-3 items-center">
        <button
          onClick={() => update({ isRunning: !data.isRunning })}
          className="btn-primary press h-11 pl-4 pr-5 flex items-center gap-2 rounded-full text-ui"
        >
          {data.isRunning ? (
            <>
              <Pause size={16} fill="currentColor" /> Pause
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" /> Start
            </>
          )}
        </button>

        <button
          onClick={() => update({ isRunning: false, timeLeft: data.duration })}
          className="chrome-button press w-11 h-11 flex items-center justify-center rounded-full"
          style={{ background: 'var(--surface-2)' }}
          title="Reset"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};
