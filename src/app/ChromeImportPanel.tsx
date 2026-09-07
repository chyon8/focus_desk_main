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
    // Before the import: `addSpaces` makes its first document active, and the
    // list this ticks a line on is in the space the user is leaving.
    useSpaceStore.getState().checkHint('chrome');
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
        className="glass-panel fixed left-1/2 top-1/2 z-[99] w-[28rem] max-h-[70vh] -translate-x-1/2 -translate-y-1/2 flex flex-col p-4 rounded-surface"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-meta font-semibold uppercase tracking-widest">
            Import from Chrome
          </span>
          <button onClick={onClose} className="press t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>

        {state.step === 'intro' && (
          <>
            <p className="t-ink mt-2 text-ui leading-relaxed">
              Focus Desk can read the windows and tabs open in Chrome and lay each window out as a
              space.
            </p>
            <p className="t-soft mt-2 text-meta leading-relaxed">
              Your tabs stay in Chrome. Nothing is closed and nothing is moved. Only the addresses
              and titles are read. macOS will ask to let Focus Desk “control” Chrome, which is the
              only permission it has for this.
            </p>
            <button
              onClick={() => void read()}
              className="chrome-button mt-4 py-1.5 rounded-control text-meta font-medium"
            >
              Read my Chrome windows
            </button>
          </>
        )}

        {state.step === 'reading' && (
          <div className="mt-3 space-y-1.5" aria-label="Reading Chrome">
            {[0, 1].map((i) => (
              <div key={i} className="glass flex flex-col gap-1.5 p-3 rounded-control">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-4 h-4 shrink-0" />
                  <div className="skeleton h-3 flex-1" style={{ maxWidth: `${60 - i * 15}%` }} />
                </div>
                <div className="skeleton h-2" style={{ width: `${80 - i * 20}%` }} />
              </div>
            ))}
          </div>
        )}

        {state.step === 'none' && (
          <p className="t-soft mt-2 text-ui leading-relaxed">
            No open Chrome windows with web pages in them. Open the windows you want and try again,
            or pick the tools you use instead.
          </p>
        )}

        {state.step === 'denied' && (
          <>
            <p className="t-ink mt-2 text-ui leading-relaxed">
              macOS is not letting Focus Desk read Chrome.
            </p>
            <p className="t-soft mt-2 text-meta leading-relaxed">
              It only asks once, so this has to be turned on by hand: System Settings → Privacy &
              Security → Automation → Focus Desk → Google Chrome.
            </p>
            <button
              onClick={() =>
                void window.chromeImport?.showAutomationSettings()
              }
              className="chrome-button mt-4 flex items-center justify-center gap-2 py-1.5 rounded-control text-meta font-medium"
            >
              <ExternalLink size={11} />
              Open System Settings
            </button>
          </>
        )}

        {state.step === 'failed' && (
          <>
            <p className="mt-2 text-ui leading-relaxed" style={{ color: 'var(--danger)' }}>
              Chrome could not be read.
            </p>
            <p className="t-soft mt-2 text-meta leading-relaxed">{state.message}</p>
            <button
              onClick={() => void read()}
              className="chrome-button t-accent mt-4 py-1.5 rounded-control text-meta font-medium"
            >
              Try again
            </button>
          </>
        )}

        {state.step === 'choose' && (
          <>
            <p className="t-soft mt-1 mb-3 text-meta leading-snug">
              {state.choices.length === 1
                ? 'One Chrome window. It becomes one space, and your tabs stay in Chrome.'
                : `${state.choices.length} Chrome windows. Each becomes a space, and your tabs stay in Chrome.`}
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1.5">
              {state.choices.map((choice) => {
                const on = ticked.has(choice.id);
                return (
                  <div
                    key={choice.id}
                    className={`row flex gap-3 p-3 rounded-control ${on ? '' : 'opacity-50'}`}
                  >
                    <button
                      onClick={() =>
                        setTicked((was) => {
                          const next = new Set(was);
                          if (!next.delete(choice.id)) next.add(choice.id);
                          return next;
                        })
                      }
                      title={on ? 'Leave this window out' : 'Bring this window in'}
                      className={`press glass w-4 h-4 shrink-0 mt-0.5 rounded-mark flex items-center justify-center ${
                        on ? 't-ink' : 't-faint'
                      }`}
                    >
                      {on && <Check size={10} />}
                    </button>
                    {/* 아랫줄들이 이름과 나란히 서야 하는데, 들여쓰기 값을 손으로
                        적으면 체크박스 크기가 바뀔 때마다 어긋난다. 한 칸에 담는다. */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <input
                          value={names[choice.id] ?? choice.name}
                          onChange={(e) =>
                            setNames((was) => ({ ...was, [choice.id]: e.target.value }))
                          }
                          disabled={!on}
                          title="What this space will be called"
                          className="t-ink flex-1 min-w-0 bg-transparent text-ui outline-none"
                        />
                        <span className="t-faint shrink-0 text-micro tabular-nums">
                          {choice.tabs.length} tabs
                        </span>
                      </div>
                      <div className="t-faint text-micro truncate">
                        {choice.tabs
                          .slice(0, 5)
                          .map((t) => hostOf(t.url))
                          .join(' · ')}
                        {choice.tabs.length > 5 && ' …'}
                      </div>
                      {choice.dropped > 0 && (
                        <div className="t-faint text-micro">
                          {choice.dropped} more tabs in this window are left in Chrome.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={bring}
              disabled={chosen.length === 0}
              className="chrome-button shrink-0 mt-3 py-1.5 rounded-control text-meta font-medium disabled:opacity-40"
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
