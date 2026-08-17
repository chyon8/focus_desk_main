import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw, Search } from 'lucide-react';
import { useAppSurface, type PlaceFailure } from '../apps/useAppSurface';
import { useAppThumbnail } from '../apps/useAppThumbnail';
import { secondsOnApp } from '../focus/appTime';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { AppData } from '../spaces/types';
import { useAppTimeStore } from '../stores/appTimeStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { useWidgetData } from './useWidgetData';

/**
 * Why a window could not be moved here. Every one of these is the user's to
 * undo — macOS offers no way to carry a window across a Space boundary, and a
 * fullscreen app is given a Space entirely of its own.
 */
const PLACE_PROBLEMS: Record<PlaceFailure, string> = {
  accessibility: 'Focus Desk is not allowed to move windows yet.',
  fullscreen:
    'It is fullscreen, which macOS gives a desktop of its own. Leave fullscreen (⌃⌘F) and click again.',
  otherSpace:
    'Its window is on another desktop — fullscreen apps get one to themselves. Bring it to this desktop, then click again.',
  notRunning: 'It would not start.',
  noWindow: 'It has no window open yet.',
  minimized: 'Its window is minimised.',
  unknown: 'macOS would not let its window be moved.',
};

/**
 * A real application standing in the space (D-038). Maximise it and the actual
 * window comes and sits here; on the canvas it is a launcher that also knows how
 * long this space has spent in that app.
 */
export const AppWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<AppData>(id);

  return data.appKey ? (
    <AppFace id={id} data={data} onClear={() => update({ appKey: '', name: '', icon: null })} />
  ) : (
    <AppPicker onPick={update} />
  );
};

const AppFace: React.FC<{ id: string; data: AppData; onClear: () => void }> = ({
  id,
  data,
  onClear,
}) => {
  const today = useToday();
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const seconds = useAppTimeStore((s) => secondsOnApp(s.time, spaceId, today, data.appKey));
  // The real window is placed over this element, so it is what gets measured.
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { isLive, placement } = useAppSurface(id, data.appKey, surfaceRef);
  const thumbnail = useAppThumbnail(data.appKey, !isLive, surfaceRef);
  const [permissions, setPermissions] = useState({ accessibility: true, screenRecording: true });

  // Re-read on going live: this is when the user is asked, and when the answer
  // decides whether anything happens at all.
  useEffect(() => {
    void window.apps?.permissions().then(setPermissions);
  }, [isLive]);

  if (isLive) {
    const resting = permissions.accessibility && placement?.ok;
    return (
      <div
        ref={surfaceRef}
        onClick={resting ? () => void window.apps?.raise(data.appKey) : undefined}
        className={`t-ink h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center ${resting ? 'cursor-pointer' : ''}`}
      >
        {permissions.accessibility ? (
          placement && !placement.ok ? (
            <>
              <span className="t-ink text-sm">Can’t bring {data.name} here</span>
              <span className="t-faint text-xs max-w-[40ch]">
                {PLACE_PROBLEMS[placement.reason]}
              </span>
              {/* Failing to seat it in the space is no reason to also block the
                  user from the app they asked for. */}
              <button
                onClick={() => void window.apps?.launch(data.appKey)}
                className="chrome-button mt-1 px-3 h-7 rounded-md text-[11px]"
              >
                Open it anyway
              </button>
            </>
          ) : placement?.ok ? (
            // Two real windows share no z-order, so any click on Focus Desk
            // buries the app behind it with no way back on its own — clicking
            // this surface (the whole card, via the container's onClick) is that
            // way back. Seen whenever Focus Desk comes forward, which is often,
            // so it must read as a resting state, not as something wrong.
            <span className="t-faint text-xs">
              {data.name} is here · click to return, or ⌥Space
            </span>
          ) : (
            <span className="t-faint text-xs">Bringing {data.name} here…</span>
          )
        ) : (
          <>
            <span className="t-ink text-sm">Accessibility access needed</span>
            <span className="t-faint text-xs max-w-[38ch]">
              Bringing {data.name} here means moving its real window, which macOS guards. Allow
              Focus Desk once, then click this widget again.
            </span>
            <button
              onClick={() => void window.apps?.showAccessibilitySettings()}
              className="chrome-button mt-1 px-3 h-7 rounded-md text-[11px]"
            >
              Open Accessibility settings
            </button>
            <span className="t-faint text-[10px] max-w-[38ch]">
              If nothing is listed, drag in the file that Finder just revealed.
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={surfaceRef} className="t-ink h-full w-full flex flex-col p-3 gap-2">
      {/* Clicking brings the app into the space rather than switching away to it,
          which is the whole point of the widget. Leaving is the ↗ button. */}
      <button
        onClick={() => useUiStore.getState().toggleMaximized(id)}
        title={`Bring ${data.name} here`}
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5"
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            draggable={false}
            className="border-hair max-w-full max-h-full object-contain rounded-lg border"
          />
        ) : data.icon ? (
          <img src={data.icon} alt="" className="w-16 h-16" draggable={false} />
        ) : (
          <div className="glass w-16 h-16 rounded-2xl" />
        )}
        {!thumbnail && <span className="text-sm font-medium truncate max-w-full">{data.name}</span>}
      </button>

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="t-soft text-[11px] tabular-nums truncate">
          {placement?.ok && !placement.resizable
            ? `${data.name} · sets its own size`
            : seconds > 0
              ? `${formatDuration(seconds)} today`
              : data.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {!permissions.screenRecording && (
            <button
              onClick={() => void window.apps?.askCaptureAccess()}
              title="Show this app's window in the widget"
              className="t-faint hover:t-ink text-[10px] uppercase tracking-widest"
            >
              Preview
            </button>
          )}
          <button
            onClick={() => void window.apps?.launch(data.appKey)}
            title={`Switch to ${data.name} outside Focus Desk`}
            className="t-faint hover:t-ink"
          >
            <ArrowUpRight size={12} />
          </button>
          <button onClick={onClear} title="Pick a different app" className="t-faint hover:t-ink">
            <RotateCcw size={10} />
          </button>
        </div>
      </div>
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
