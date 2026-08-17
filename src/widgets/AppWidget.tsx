import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { secondsOnApp } from '../focus/appTime';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { AppData } from '../spaces/types';
import { useAppTimeStore } from '../stores/appTimeStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useWidgetData } from './useWidgetData';

/**
 * A real application standing in the space (D-038). Phase A launches it and
 * counts the time; thumbnails and live placement come later.
 */
export const AppWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<AppData>(id);

  return data.appKey ? (
    <AppFace data={data} onClear={() => update({ appKey: '', name: '', icon: null })} />
  ) : (
    <AppPicker onPick={update} />
  );
};

const AppFace: React.FC<{ data: AppData; onClear: () => void }> = ({ data, onClear }) => {
  const today = useToday();
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const seconds = useAppTimeStore((s) => secondsOnApp(s.time, spaceId, today, data.appKey));

  return (
    <div className="t-ink h-full w-full flex flex-col items-center justify-center gap-3 p-5 text-center">
      <button
        onClick={() => void window.apps?.launch(data.appKey)}
        title={`Open ${data.name}`}
        className="flex flex-col items-center gap-3 min-w-0"
      >
        {data.icon ? (
          <img src={data.icon} alt="" className="w-16 h-16" draggable={false} />
        ) : (
          <div className="glass w-16 h-16 rounded-2xl" />
        )}
        <span className="text-sm font-medium truncate max-w-full">{data.name}</span>
      </button>

      <span className="t-soft text-xs tabular-nums">
        {seconds > 0 ? `${formatDuration(seconds)} today` : 'Not opened today'}
      </span>

      <button
        onClick={onClear}
        title="Pick a different app"
        className="t-faint hover:t-ink flex items-center gap-1 text-[10px] uppercase tracking-widest"
      >
        <RotateCcw size={10} />
        Change
      </button>
    </div>
  );
};

const AppPicker: React.FC<{ onPick: (app: AppData) => void }> = ({ onPick }) => {
  const [apps, setApps] = useState<AppData[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    // No bridge means a plain browser, where there is nothing to list.
    if (!window.apps) {
      setApps([]);
      return;
    }
    void window.apps.list().then((list) => {
      if (alive) setApps(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => {
    if (!apps) return [];
    const needle = query.trim().toLowerCase();
    return needle ? apps.filter((app) => app.name.toLowerCase().includes(needle)) : apps;
  }, [apps, query]);

  return (
    <div className="t-ink h-full w-full flex flex-col p-5">
      <span className="t-soft text-xs font-semibold uppercase tracking-widest mb-3">App</span>

      <div className="border-hair flex items-center gap-2 pb-2 mb-2 border-b">
        <Search size={14} className="t-faint shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search installed apps"
          autoFocus
          className="field flex-1 min-w-0 !bg-transparent outline-none text-sm"
        />
      </div>

      {apps === null ? (
        <div className="t-faint text-xs">Looking for apps…</div>
      ) : matches.length === 0 ? (
        <div className="t-faint text-xs">
          {apps.length === 0 ? 'No apps found on this machine.' : 'Nothing matches.'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0.5 -mx-2 px-2">
          {matches.map((app) => (
            <button
              key={app.appKey}
              onClick={() => onPick(app)}
              className="row !text-[inherit] w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left"
            >
              {app.icon ? (
                <img src={app.icon} alt="" className="w-5 h-5 shrink-0" draggable={false} />
              ) : (
                <div className="glass w-5 h-5 rounded shrink-0" />
              )}
              <span className="text-sm truncate">{app.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
