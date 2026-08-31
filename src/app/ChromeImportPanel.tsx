import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, X } from 'lucide-react';
import { spacesFrom, windowChoices, type WindowChoice } from '../spaces/chromeImport';
import { canvasArea } from '../stores/uiStore';
import { newSpace, useSpaceStore } from '../stores/spaceStore';
import { hostOf } from '../widgets/browserAddress';

/**
 * Bringing the windows open in Chrome in as spaces (D-096).
 *
 * One window becomes one space, ticked by window rather than by tab: somebody
 * running several windows has already split their work up, and importing that
 * split means the app never has to explain what a space is.
 *
 * Nothing here writes to Chrome. The panel says so before it asks for anything,
 * because the permission prompt macOS shows says "control" — which sounds like
 * the app is about to close the user's tabs.
 */

type State =
  | { step: 'intro' }
  | { step: 'reading' }
  | { step: 'choose'; choices: WindowChoice[] }
  | { step: 'none' }
  | { step: 'denied' }
  | { step: 'failed'; message: string };

export const ChromeImportPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [state, setState] = useState<State>({ step: 'intro' });
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});

  const read = async () => {
    setState({ step: 'reading' });
    const result = await window.chromeImport?.tabs();
    if (!result) {
      setState({ step: 'failed', message: 'This build cannot read Chrome.' });
      return;
    }
    if (!result.ok) {
      setState(
        result.reason === 'denied'
          ? { step: 'denied' }
          : { step: 'failed', message: result.message }
      );
      return;
    }
    const choices = windowChoices(result.windows);
    if (choices.length === 0) {
      setState({ step: 'none' });
      return;
    }
    setTicked(new Set(choices.map((choice) => choice.id)));
    setNames(Object.fromEntries(choices.map((choice) => [choice.id, choice.name])));
    setState({ step: 'choose', choices });
  };

  const chosen = useMemo(
    () =>
      state.step === 'choose'
        ? state.choices
            .filter((choice) => ticked.has(choice.id))
            .map((choice) => ({ ...choice, name: names[choice.id] ?? choice.name }))
        : [],
    [state, ticked, names]
  );

  const bring = () => {
    useSpaceStore.getState().addSpaces(spacesFrom(chosen, newSpace, canvasArea()));
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[98]" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed left-1/2 top-1/2 z-[99] w-[28rem] max-h-[70vh] -translate-x-1/2 -translate-y-1/2 flex flex-col p-5 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-[11px] font-semibold uppercase tracking-widest">
            Import from Chrome
          </span>
          <button onClick={onClose} className="t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>

        {state.step === 'intro' && (
          <>
            <p className="t-ink mt-2 text-xs leading-relaxed">
              Focus Desk can read the windows and tabs open in Chrome and lay each window out as a
              space.
            </p>
            <p className="t-soft mt-2 text-[11px] leading-relaxed">
              Your tabs stay in Chrome. Nothing is closed and nothing is moved — only the addresses
              and titles are read. macOS will ask to let Focus Desk “control” Chrome, which is the
              only permission it has for this.
            </p>
            <button
              onClick={() => void read()}
              className="chrome-button mt-4 py-1.5 rounded-lg text-[11px] font-medium"
            >
              Read my Chrome windows
            </button>
          </>
        )}

        {state.step === 'reading' && <div className="t-faint mt-3 text-xs">Reading Chrome…</div>}

        {state.step === 'none' && (
          <p className="t-soft mt-2 text-xs leading-relaxed">
            No open Chrome windows with web pages in them. Open the windows you want and try again,
            or pick the tools you use instead.
          </p>
        )}

        {state.step === 'denied' && (
          <>
            <p className="t-ink mt-2 text-xs leading-relaxed">
              macOS is not letting Focus Desk read Chrome.
            </p>
            <p className="t-soft mt-2 text-[11px] leading-relaxed">
              It only asks once, so this has to be turned on by hand: System Settings → Privacy &
              Security → Automation → Focus Desk → Google Chrome.
            </p>
            <button
              onClick={() =>
                void window.chromeImport?.showAutomationSettings()
              }
              className="chrome-button mt-4 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-medium"
            >
              <ExternalLink size={11} />
              Open System Settings
            </button>
          </>
        )}

        {state.step === 'failed' && (
          <p className="t-soft mt-2 text-xs leading-relaxed">
            Chrome could not be read. {state.message}
          </p>
        )}

        {state.step === 'choose' && (
          <>
            <p className="t-soft mt-1 mb-3 text-[11px] leading-snug">
              {state.choices.length === 1
                ? 'One Chrome window. It becomes one space — your tabs stay in Chrome.'
                : `${state.choices.length} Chrome windows. Each becomes a space — your tabs stay in Chrome.`}
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1.5">
              {state.choices.map((choice) => {
                const on = ticked.has(choice.id);
                return (
                  <div
                    key={choice.id}
                    className={`row flex flex-col gap-1.5 p-2.5 rounded-xl ${on ? '' : 'opacity-50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() =>
                          setTicked((was) => {
                            const next = new Set(was);
                            if (!next.delete(choice.id)) next.add(choice.id);
                            return next;
                          })
                        }
                        title={on ? 'Leave this window out' : 'Bring this window in'}
                        className={`glass w-4 h-4 shrink-0 rounded-[4px] flex items-center justify-center ${
                          on ? 't-ink' : 't-faint'
                        }`}
                      >
                        {on && <Check size={10} />}
                      </button>
                      <input
                        value={names[choice.id] ?? choice.name}
                        onChange={(e) =>
                          setNames((was) => ({ ...was, [choice.id]: e.target.value }))
                        }
                        disabled={!on}
                        title="What this space will be called"
                        className="t-ink flex-1 min-w-0 bg-transparent text-xs outline-none"
                      />
                      <span className="t-faint shrink-0 text-[10px] tabular-nums">
                        {choice.tabs.length} tabs
                      </span>
                    </div>
                    <div className="t-faint pl-[26px] text-[10px] truncate">
                      {choice.tabs
                        .slice(0, 5)
                        .map((t) => hostOf(t.url))
                        .join(' · ')}
                      {choice.tabs.length > 5 && ' …'}
                    </div>
                    {choice.dropped > 0 && (
                      <div className="t-faint pl-[26px] text-[10px]">
                        {choice.dropped} more tabs in this window are left in Chrome.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={bring}
              disabled={chosen.length === 0}
              className="chrome-button shrink-0 mt-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40"
            >
              {chosen.length === 1
                ? 'Bring in 1 space'
                : `Bring in ${chosen.length} spaces`}
            </button>
          </>
        )}
      </motion.div>
    </>
  );
};
