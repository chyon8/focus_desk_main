import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Layers, RotateCcw, Search, X } from 'lucide-react';
import { appWidgets, claimedWindowTitles } from '../apps/spaceApps';
import { useAppSurface, type PlaceFailure } from '../apps/useAppSurface';
import { secondsOnApp } from '../focus/appTime';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { AppData } from '../spaces/types';
import { useAppTimeStore } from '../stores/appTimeStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useActiveSpace, useSpaceStore } from '../stores/spaceStore';
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
    'That window is on another desktop, which macOS hides from other apps. Bring it to this desktop — or assign a different window — then click again.',
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
    <AppFace
      id={id}
      data={data}
      update={update}
      onClear={() => update({ appKey: '', name: '', icon: null, windowTitle: undefined })}
    />
  ) : (
    <AppPicker
      onPick={(app) => {
        update(app);
        // Picking is the asking. The widget was empty a moment ago and the user
        // just said what should stand here, so it opens in the slot rather than
        // waiting to be opened a second time. Not the space-entry auto-launch
        // that D-054 threw out — that one nobody asked for.
        if (!usePrefsStore.getState().attachApps) return;
        const ui = useUiStore.getState();
        if (!ui.openAppIds.includes(id)) ui.toggleAppOpen(id);
      }}
    />
  );
};

const AppFace: React.FC<{
  id: string;
  data: AppData;
  update: (patch: Partial<AppData>) => void;
  onClear: () => void;
}> = ({ id, data, update, onClear }) => {
  const today = useToday();
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const seconds = useAppTimeStore((s) => secondsOnApp(s.time, spaceId, today, data.appKey));
  // The real window is placed over this element, so it is what gets measured.
  const surfaceRef = useRef<HTMLDivElement>(null);
  const space = useActiveSpace();
  const choice = useMemo(
    () => ({ title: data.windowTitle, avoid: claimedWindowTitles(space, id, data.appKey) }),
    [space, id, data.appKey, data.windowTitle]
  );
  const { isOpen, isHere, isAway, isStaged, placement, aside, bringBack } = useAppSurface(
    id,
    data.appKey,
    surfaceRef,
    choice,
    (windowTitle) => update({ windowTitle })
  );
  const attachApps = usePrefsStore((s) => s.attachApps);
  const [permissions, setPermissions] = useState({ accessibility: true });
  const [picking, setPicking] = useState(false);

  // Re-read on opening: this is when the user is asked, and when the answer
  // decides whether anything happens at all.
  useEffect(() => {
    void window.apps?.permissions().then(setPermissions);
  }, [isOpen]);

  if (isOpen) {
    // Off stage the window is behind the desk, so this is what the user is
    // looking at — and clicking it is one of the two ways back (D-071).
    const offStage = permissions.accessibility && !isStaged;
    const resting = permissions.accessibility && isStaged && isHere && placement?.ok;
    return (
      <div
        ref={surfaceRef}
        onClick={
          offStage || resting ? () => void window.apps?.raise(data.appKey) : undefined
        }
        className={`t-ink h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center ${offStage || resting ? 'cursor-pointer' : ''}`}
      >
        {!permissions.accessibility ? (
          <>
            <span className="t-ink text-base">Accessibility access needed</span>
            <span className="t-faint text-sm max-w-[38ch]">
              Opening {data.name} here means moving its real window, which macOS guards. Allow
              Focus Desk once, then open it again.
            </span>
            <button
              onClick={() => void window.apps?.showAccessibilitySettings()}
              className="chrome-button mt-1 px-3 h-8 rounded-md text-sm"
            >
              Open Accessibility settings
            </button>
            <span className="t-faint text-[10px] max-w-[38ch]">
              If nothing is listed, drag in the file that Finder just revealed.
            </span>
          </>
        ) : placement && !placement.ok ? (
          <>
            <span className="t-ink text-base">Can’t bring {data.name} here</span>
            <span className="t-faint text-sm max-w-[36ch]">{PLACE_PROBLEMS[placement.reason]}</span>
            {/* Failing to seat it in the space is no reason to also block the
                user from the app they asked for. */}
            <button
              onClick={() => void window.apps?.launch(data.appKey)}
              className="chrome-button mt-1 px-3 h-8 rounded-md text-sm"
            >
              Open it anyway
            </button>
          </>
        ) : offStage ? (
          <>
            {data.icon ? (
              <img src={data.icon} alt="" className="w-10 h-10 rounded-[10px]" />
            ) : null}
            <span className="t-ink text-base">{data.name}</span>
            <span className="t-faint text-sm">
              {seconds > 0 ? `${formatDuration(seconds)} today` : 'Waiting behind the desk'}
            </span>
            <span className="t-faint text-xs">click, or ⌃⌥D, to bring it back</span>
          </>
        ) : isAway ? (
          // Its window would not stay on the slot: the app keeps putting it back
          // where it wants it. Arguing with that forever is worse than handing it
          // over — the widget is a launcher for it until the user asks again.
          <>
            <span className="t-ink text-base">{data.name} is out of its slot</span>
            <span className="t-faint text-sm max-w-[34ch]">
              Its window will not stay here — the app keeps moving it back.
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                bringBack();
              }}
              className="chrome-button mt-1 px-3 h-8 rounded-md text-sm"
            >
              Bring it back here
            </button>
          </>
        ) : aside ? (
          <>
            <span className="t-ink text-base">{data.name} is off screen</span>
            <span className="t-faint text-sm max-w-[34ch]">
              This widget is off the canvas, so its window is waiting.
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                bringBack();
              }}
              className="chrome-button mt-1 px-3 h-8 rounded-md text-sm"
            >
              Bring it back
            </button>
          </>
        ) : isHere && placement?.ok ? (
          <span className="t-faint text-sm">{data.name} is here · click it, or ⌃⌥D</span>
        ) : (
          <span className="t-faint text-sm">Bringing {data.name} here…</span>
        )}
      </div>
    );
  }

  if (picking) {
    return (
      <WindowPicker
        appKey={data.appKey}
        name={data.name}
        current={data.windowTitle}
        onPick={(windowTitle) => {
          update({ windowTitle });
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    );
  }

  return (
    <div ref={surfaceRef} className="t-ink h-full w-full flex flex-col p-3 gap-2">
      {/* Clicking brings the app into the space rather than switching away to it,
          which is the whole point of the widget. Leaving is the ↗ button. */}
      <button
        onClick={() => {
          // Without the switch the widget is a launcher: it starts the app or
          // switches to it, and no window is moved, so nothing needs permission.
          if (!attachApps) {
            void window.apps?.launch(data.appKey);
            return;
          }
          const ui = useUiStore.getState();
          // The helper remembers one window per app, so two widgets on the same
          // app cannot both be open — the second would take over the size the
          // first has to give back.
          for (const other of appWidgets(space)) {
            if (other.id !== id && other.data.appKey === data.appKey) ui.closeApp(other.id);
          }
          ui.toggleAppOpen(id);
        }}
        title={attachApps ? `Open ${data.name} here, at this size` : `Switch to ${data.name}`}
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5"
      >
        {data.icon ? (
          <img src={data.icon} alt="" className="w-16 h-16" draggable={false} />
        ) : (
          <div className="glass w-16 h-16 rounded-2xl" />
        )}
        <span className="text-sm font-medium truncate max-w-full">{data.name}</span>
      </button>

      {/* Which window this widget stands for. Its own row rather than a label on
          the icon, because it is also the way to change it (D-048). Hidden while
          nothing is placed: there is no window to choose between, and asking the
          helper for the list is itself an accessibility prompt. */}
      {attachApps && (
      <button
        onClick={() => setPicking(true)}
        title="Choose which window this widget opens"
        className="row t-faint hover:t-ink px-1.5 py-0.5 rounded-md text-[11px] flex items-center gap-1 min-w-0"
      >
        <Layers size={10} className="shrink-0" />
        <span className="truncate">{data.windowTitle ?? 'Any window'}</span>
      </button>
      )}

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="t-soft text-[11px] tabular-nums truncate">
          {placement?.ok && !placement.resizable
            ? `${data.name} · sets its own size`
            : seconds > 0
              ? `${formatDuration(seconds)} today`
              : data.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {attachApps && (
            <button
              onClick={() => void window.apps?.launch(data.appKey)}
              title={`Switch to ${data.name} outside Focus Desk`}
              className="t-faint hover:t-ink"
            >
              <ArrowUpRight size={12} />
            </button>
          )}
          <button onClick={onClear} title="Pick a different app" className="t-faint hover:t-ink">
            <RotateCcw size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

type AppWindows = Awaited<ReturnType<NonNullable<Window['apps']>['windows']>>;

/**
 * Assigns one of the app's open windows to this widget (D-048). Two widgets on
 * one editor is the case that needs it: without a choice they both open whichever
 * window was focused last, and the second space never gets its own project.
 *
 * Windows on another desktop cannot be listed — accessibility does not see them
 * and their titles would need Screen Recording — so all this can do is say how
 * many there are and ask for them to be brought over.
 */
const WindowPicker: React.FC<{
  appKey: string;
  name: string;
  current?: string;
  onPick: (title: string | undefined) => void;
  onClose: () => void;
}> = ({ appKey, name, current, onPick, onClose }) => {
  const [state, setState] = useState<AppWindows | null>(null);

  useEffect(() => {
    let alive = true;
    setState(null);
    void window.apps?.windows(appKey).then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [appKey]);

  return (
    <div className="t-ink h-full w-full flex flex-col p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="t-soft text-[11px] font-semibold uppercase tracking-widest truncate">
          {name} windows
        </span>
        <button onClick={onClose} className="t-faint hover:t-ink ml-auto shrink-0">
          <X size={12} />
        </button>
      </div>

      {state === null ? (
        <div className="t-faint text-xs">Looking…</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-0.5">
          <button
            onClick={() => onPick(undefined)}
            className={`row !text-[inherit] w-full px-2 py-1.5 rounded-lg text-left text-xs truncate ${
              current ? '' : 't-ink font-medium'
            }`}
          >
            Any window
          </button>

          {state.windows.map((entry, index) =>
            entry.title ? (
              <button
                key={entry.title + index}
                onClick={() => onPick(entry.title ?? undefined)}
                className={`row !text-[inherit] w-full px-2 py-1.5 rounded-lg text-left text-xs truncate ${
                  entry.title === current ? 't-ink font-medium' : ''
                }`}
              >
                {entry.title}
                {entry.minimized && <span className="t-faint"> · minimised</span>}
              </button>
            ) : (
              // No title means nothing to remember it by; the app is drawing its
              // own window frame (FL Studio does).
              <div key={index} className="t-faint px-2 py-1.5 text-xs truncate">
                Untitled window · can’t be assigned
              </div>
            )
          )}

          {!state.running && <div className="t-faint px-2 py-1.5 text-xs">Not running.</div>}
          {state.running && state.windows.length === 0 && state.elsewhere === 0 && (
            <div className="t-faint px-2 py-1.5 text-xs">No windows open.</div>
          )}
          {state.elsewhere > 0 && (
            <div className="t-faint px-2 pt-2 text-[11px] leading-snug">
              {state.elsewhere} more on another desktop or in fullscreen. macOS hides those from
              other apps — move them to this desktop, then open this list again.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AppPicker: React.FC<{ onPick: (app: AppData) => void }> = ({ onPick }) => {
  const [catalog, setCatalog] = useState<{ apps: AppData[]; spotlight: boolean } | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    // No bridge means a plain browser, where there is nothing to list.
    if (!window.apps) {
      setCatalog({ apps: [], spotlight: true });
      return;
    }
    void window.apps.list().then((next) => {
      if (alive) setCatalog(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return needle
      ? catalog.apps.filter((app) => app.name.toLowerCase().includes(needle))
      : catalog.apps;
  }, [catalog, query]);

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

      {catalog === null ? (
        <div className="t-faint text-xs">Looking for apps…</div>
      ) : matches.length === 0 ? (
        // Coming up empty is the one moment the search is worth explaining: an
        // app macOS has not indexed is invisible here however hard the user
        // looks for it, and only they can do anything about that (D-068).
        <div className="flex flex-col items-start gap-1.5">
          <span className="t-faint text-xs">
            {catalog.apps.length === 0 ? 'No apps found on this machine.' : 'Nothing matches.'}
          </span>
          <span className="t-faint text-[11px] max-w-[40ch]">
            {catalog.spotlight
              ? 'Apps are found through Spotlight. One in a folder Spotlight skips will not show up here.'
              : 'Spotlight indexing is off, so only apps in Applications are listed.'}
          </span>
          <button
            onClick={() => void window.apps?.showSpotlightSettings()}
            className="chrome-button mt-0.5 px-3 h-7 rounded-md text-[11px]"
          >
            Open Spotlight settings
          </button>
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
