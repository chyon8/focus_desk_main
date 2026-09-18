import React, { useState } from 'react';
import { Check, Plus, Settings2, UserRound } from 'lucide-react';
import { SHARED_ID } from '../spaces/signIns';
import { useSignInStore } from '../stores/signInStore';
import { useUiStore } from '../stores/uiStore';

/**
 * Which sign-in a page runs on.
 *
 * The same menu is the widget's address row button and its right-click menu, so
 * a card that has no address row is not a dead end. Making and managing them is
 * not done here — this is the picking; the panel (Settings → Sign-ins) is where
 * they are renamed, emptied and deleted.
 */
export const SignInMenu: React.FC<{
  value: string | undefined;
  onPick: (signIn: string | undefined) => void;
  onDone: () => void;
}> = ({ value, onPick, onDone }) => {
  const signIns = useSignInStore((s) => s.signIns);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');
  const currentId = value && signIns[value] ? value : SHARED_ID;
  const list = [signIns[SHARED_ID], ...Object.values(signIns).filter((s) => s.id !== SHARED_ID)];

  const pick = (id: string) => {
    onPick(id === SHARED_ID ? undefined : id);
    onDone();
  };

  const make = () => {
    const name = draft.trim();
    if (!name) return;
    pick(useSignInStore.getState().add(name).id);
  };

  return (
    <div className="w-56 p-1.5">
      <p className="t-soft px-2 pt-0.5 pb-1.5 text-micro font-semibold uppercase tracking-[0.14em]">
        Sign-in
      </p>

      {list.map((signIn) => (
        <button
          key={signIn.id}
          onClick={() => pick(signIn.id)}
          className="row w-full flex items-center gap-2 px-2 py-1.5 rounded-control"
        >
          <span className="t-ink flex-1 text-left text-ui truncate">{signIn.name}</span>
          {signIn.id === currentId && <Check size={12} className="t-soft shrink-0" />}
        </button>
      ))}

      <div className="border-hair mt-1.5 pt-1.5 border-t">
        {/* The row becomes the line being typed, icon and all — a box dropped into
            the menu would read as a form stuck under a list. */}
        {naming ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Plus size={12} className="t-soft shrink-0" />
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setNaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') make();
                if (e.key === 'Escape') setNaming(false);
              }}
              placeholder="Work, Personal, Client…"
              aria-label="New sign-in name"
              className="name-input min-w-0 flex-1 text-ui outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setNaming(true)}
            className="row w-full flex items-center gap-2 px-2 py-1.5 rounded-control"
          >
            <Plus size={12} className="t-soft shrink-0" />
            <span className="t-ink flex-1 text-left text-ui">New sign-in</span>
          </button>
        )}
        <button
          onClick={() => {
            useUiStore.getState().setSignInsOpen(true);
            onDone();
          }}
          className="row w-full flex items-center gap-2 px-2 py-1.5 rounded-control"
        >
          <Settings2 size={12} className="t-soft shrink-0" />
          <span className="t-ink flex-1 text-left text-ui">Manage sign-ins…</span>
        </button>
      </div>

      <p className="t-faint px-2 pt-1.5 text-micro leading-snug">
        The page opens again on the sign-in you pick.
      </p>
    </div>
  );
};

/** The address row's button: the name it is on, and the menu above. */
export const SignInPicker: React.FC<{
  value: string | undefined;
  onPick: (signIn: string | undefined) => void;
}> = ({ value, onPick }) => {
  const signIns = useSignInStore((s) => s.signIns);
  const [isOpen, setIsOpen] = useState(false);
  const current = (value && signIns[value]) || signIns[SHARED_ID];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        title={`Sign-in: ${current.name}`}
        className={`chrome-button ${
          isOpen ? 'chrome-button-on' : ''
        } h-7 px-1.5 flex items-center gap-1 rounded-control`}
      >
        <UserRound size={12} />
        {/* Main is the default, so naming it here would label nearly every
            widget with the same word. */}
        {current.id !== SHARED_ID && (
          <span className="text-micro max-w-[5rem] truncate">{current.name}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[40]" onPointerDown={() => setIsOpen(false)} />
          <div className="glass-panel absolute right-0 top-8 z-[41] rounded-surface">
            <SignInMenu value={value} onPick={onPick} onDone={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
};
