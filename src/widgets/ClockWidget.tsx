import React, { useEffect, useState } from 'react';

export const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsRatio = time.getSeconds() / 60;
  const minutesRatio = (secondsRatio + time.getMinutes()) / 60;
  const hoursRatio = (minutesRatio + time.getHours()) / 12;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative p-6">
      <div className="clock-face relative w-56 h-56 rounded-full flex items-center justify-center">
        {Array.from({ length: 60 }, (_, i) => {
          const isHour = i % 5 === 0;
          return (
            <div
              key={i}
              className={`absolute origin-bottom ${isHour ? 'w-[2px] h-3' : 'w-[1px] h-1.5'}`}
              style={{
                top: '12px',
                left: '50%',
                background: 'var(--ink)',
                opacity: isHour ? 0.55 : 0.22,
                transform: `translateX(-50%) rotate(${i * 6}deg)`,
                transformOrigin: '50% 100px',
              }}
            />
          );
        })}

        <div
          className="absolute w-1.5 h-14 rounded-full origin-bottom z-10 shadow-sm"
          style={{
            bottom: '50%',
            left: 'calc(50% - 3px)',
            background: 'var(--ink)',
            transform: `rotate(${hoursRatio * 360}deg)`,
          }}
        />
        <div
          className="absolute w-1 h-20 rounded-full origin-bottom z-10 shadow-sm"
          style={{
            bottom: '50%',
            left: 'calc(50% - 2px)',
            background: 'var(--ink-soft)',
            transform: `rotate(${minutesRatio * 360}deg)`,
          }}
        />
        <div
          className="absolute w-0.5 h-24 rounded-full origin-bottom z-20"
          style={{
            bottom: '50%',
            left: 'calc(50% - 1px)',
            background: 'var(--accent)',
            transform: `rotate(${secondsRatio * 360}deg)`,
            filter: 'drop-shadow(0 0 4px var(--accent))',
          }}
        >
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-4 rounded-full -mt-1"
            style={{ background: 'var(--accent)' }}
          />
        </div>

        <div
          className="absolute w-3 h-3 rounded-full z-30 shadow-md"
          style={{ background: 'var(--ink)' }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="t-soft mt-8 text-xs font-medium tracking-widest uppercase">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};
