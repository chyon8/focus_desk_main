import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { AppData } from '../spaces/types';

interface HiddenApp {
  appKey: string;
  name: string;
}

/** More icons than this in one row is a bar wider than it is useful. */
const MAX_CHIPS = 8;

/**
 * App windows sit on their widgets by keeping this window below them, which also
 * puts it below unrelated windows — so those apps are hidden when the desk comes
 * forward (D-072). Hiding someone's browser without saying so is not acceptable,
 * hence this.
 *
 * Three separate things kept it from ever being seen:
 *
 * **It was told about a change, not a state.** The helper only ever hid apps and
 * never brought any back, so the second call had nothing left to hide and said
 * nothing at all — the notice could fire at most once in a session. It now
 * receives the whole hidden set every time, so it shows what is true rather than
 * what just happened.
 *
 * **Where.** It sat at the bottom of the screen, which in the state it reports on
 * is *behind the app windows* — the desk is one level below them. It now sits in
 * the top strip: app windows are only ever placed inside the canvas area, which
 * starts at `canvasArea().y` (84px), so nothing above that can be covered.
 *
 * **How long.** Six seconds from the moment an app was hidden — which is while
 * the user is looking at the app they just opened, not at the desk. It now stays
 * while anything is hidden, and clicking an icon fetches that one back.
 *
 * None of the three was why it stayed empty. The helper recorded an app as hidden
 * only when `hide()` returned true, and `hide()` returns false while hiding the
 * app anyway — so the set this reads was always empty (D-076).
 */
export const HiddenAppsToast: React.FC = () => {
  const [apps, setApps] = useState<HiddenApp[]>([]);
  const [dismissedFor, setDismissedFor] = useState('');
  const icons = useAppIcons(apps.length > 0);

  useEffect(() => {
    void window.apps?.hiddenApps().then(setApps);
    return window.apps?.onHidden(setApps);
  }, []);

  // Dismissing answers for the apps that were gone at the time. The helper
  // re-reports the same set every time the desk is focused, so without this the
  // notice would come back on its own and could never be put away; a different
  // set is news again.
  const key = apps.map((app) => app.appKey).join('\n');
  const showing = apps.length > 0 && dismissedFor !== key;

  const chips = apps.slice(0, MAX_CHIPS);
  const rest = apps.length - chips.length;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          /* no-drag: the window's title bar drag strip runs under this, and a
             click meant for one of these buttons must not drag the window. */
          className="glass-panel no-drag fixed top-7 left-1/2 -translate-x-1/2 z-[95] max-w-[70vw] flex items-center gap-2 pl-4 pr-2 h-9 rounded-full shadow-2xl"
        >
          <span className="t-ink shrink-0 text-xs">
            {apps.length === 1 ? '1 app' : `${apps.length} apps`} hidden so this space stays
            visible
          </span>

          <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
            {chips.map((app) => (
              <button
                key={app.appKey}
                onClick={() => void window.apps?.unhide(app.appKey)}
                title={`Bring ${app.name} back`}
                className="chrome-button shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
              >
                {icons[app.appKey] ? (
                  <img
                    src={icons[app.appKey]!}
                    alt={app.name}
                    className="w-4 h-4"
                    draggable={false}
                  />
                ) : (
                  <span className="t-ink text-[9px] uppercase">{app.name[0]}</span>
                )}
              </button>
            ))}
            {rest > 0 && (
              <span
                className="t-faint shrink-0 px-1 text-[10px]"
                title={apps.slice(MAX_CHIPS).map((app) => app.name).join(', ')}
              >
                +{rest}
              </span>
            )}
          </div>

          <span className="t-faint shrink-0 text-[11px]">click one, or ⌃⌥D for all</span>

          <button
            onClick={() => setDismissedFor(key)}
            title="Dismiss"
            className="chrome-button shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
          >
            <X size={11} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Icons for the chips, read from the app catalogue rather than carried on the
 * hide event — that fires every time the desk is focused, and a base64 PNG per
 * app each time would be a lot of bytes for a row of 16px pictures.
 */
function useAppIcons(enabled: boolean) {
  const [icons, setIcons] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void window.apps?.list().then(({ apps }: { apps: AppData[] }) => {
      if (alive) setIcons(Object.fromEntries(apps.map((app) => [app.appKey, app.icon])));
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return icons;
}
