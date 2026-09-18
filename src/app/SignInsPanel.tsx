import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, X } from 'lucide-react';
import { centreCamera } from '../canvas/layout';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { isFromSpace, partitionFor, SHARED_ID, type SignIn } from '../spaces/signIns';
import { useSignInStore } from '../stores/signInStore';
import { siteOf } from '../widgets/browserAddress';
import type { SpaceDoc, WidgetDoc } from '../spaces/types';

type SignIns = Record<string, SignIn>;

/** Every page widget on this sign-in, and how many spaces they are spread over. */
function usage(spaces: Record<string, SpaceDoc>, partition: string, signIns: SignIns) {
  const widgets: { widget: WidgetDoc; spaceId: string }[] = [];
  const spaceIds = new Set<string>();
  for (const space of Object.values(spaces)) {
    for (const widget of Object.values(space.widgets)) {
      if (widget.type !== 'browser' && widget.type !== 'webapp') continue;
      if (partitionFor(widget.data as { signIn?: string }, signIns) !== partition) continue;
      widgets.push({ widget, spaceId: space.id });
      spaceIds.add(space.id);
    }
  }
  return { widgets, spaceCount: spaceIds.size };
}

/**
 * The widgets of the space on screen by site, so a row can offer to go and look
 * at one. Only this space: selecting widgets in another would mean switching to
 * it from inside a settings panel.
 */
function bySiteHere(used: { widget: WidgetDoc; spaceId: string }[], activeSpaceId: string) {
  const bySite = new Map<string, WidgetDoc[]>();
  for (const { widget, spaceId } of used) {
    if (spaceId !== activeSpaceId) continue;
    const url = (widget.data as { url?: string }).url;
    if (!url) continue;
    let site: string | null = null;
    try {
      site = siteOf(new URL(url).hostname);
    } catch {
      continue;
    }
    if (!site) continue;
    bySite.set(site, [...(bySite.get(site) ?? []), widget]);
  }
  return bySite;
}

function widgetsLine(count: number) {
  if (count === 0) return 'No widgets';
  return count === 1 ? '1 widget' : `${count} widgets`;
}

/** A name field, used for making one and for renaming one. */
const NameField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className?: string;
}> = ({ value, onChange, onCommit, onCancel, className = '' }) => (
  <input
    autoFocus
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onCommit}
    onKeyDown={(e) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      if (e.key === 'Escape') onCancel();
    }}
    placeholder="Work, Personal, Client…"
    aria-label="Sign-in name"
    className={`name-input outline-none ${className}`}
  />
);

/** The list: one row per sign-in, saying what is on it. */
const SignInList: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const spaces = useSpaceStore((s) => s.spaces);
  const signIns = useSignInStore((s) => s.signIns);
  const [isNaming, setIsNaming] = useState(false);
  const [draft, setDraft] = useState('');

  const rows = useMemo(
    () => [signIns[SHARED_ID], ...Object.values(signIns).filter((s) => s.id !== SHARED_ID)],
    [signIns]
  );

  const make = () => {
    const name = draft.trim();
    setDraft('');
    setIsNaming(false);
    if (name) onOpen(useSignInStore.getState().add(name).id);
  };

  return (
    <>
      {rows.map((signIn) => {
        const count = usage(spaces, signIn.partition, signIns).widgets.length;
        return (
          <button
            key={signIn.id}
            onClick={() => onOpen(signIn.id)}
            className="row w-full flex items-center gap-2 px-2 py-2 rounded-control"
          >
            <span className="min-w-0 flex-1 text-left">
              <span className="t-ink block text-ui truncate">{signIn.name}</span>
              <span className="t-faint block text-micro">
                {widgetsLine(count)}
                {/* A sign-in nothing uses is nearly always one left behind by the
                    move from a jar per space — say so, rather than leaving a row
                    the user cannot account for. */}
                {count === 0 && signIn.id !== SHARED_ID && ' — safe to delete'}
              </span>
            </span>
            <ChevronRight size={12} className="t-faint shrink-0" />
          </button>
        );
      })}

      <div className="border-hair mt-1.5 pt-1.5 border-t">
        {/* The row itself becomes the line being typed, icon and all, so the list
            does not jump and a half-typed name is still a row of this list. */}
        {isNaming ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <Plus size={12} className="t-soft shrink-0" />
            <NameField
              value={draft}
              onChange={setDraft}
              onCommit={make}
              onCancel={() => setIsNaming(false)}
              className="min-w-0 flex-1 text-ui"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsNaming(true)}
            className="row w-full flex items-center gap-2 px-2 py-2 rounded-control"
          >
            <Plus size={12} className="t-soft shrink-0" />
            <span className="t-ink flex-1 text-left text-ui">New sign-in</span>
          </button>
        )}
      </div>
    </>
  );
};

/**
 * One sign-in on its own: where it is signed in, and what can be done to it.
 *
 * Rename, empty and delete are behind the ⋯ menu. They are three lines nobody
 * reads until they want one of them, and two of them cannot be undone.
 */
const SignInDetail: React.FC<{
  signIn: SignIn;
  onBack: () => void;
  onClose: () => void;
}> = ({ signIn, onBack, onClose }) => {
  const { id, name, partition } = signIn;
  const spaces = useSpaceStore((s) => s.spaces);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const signIns = useSignInStore((s) => s.signIns);
  const { widgets, spaceCount } = useMemo(
    () => usage(spaces, partition, signIns),
    [spaces, partition, signIns]
  );
  const bySite = useMemo(() => bySiteHere(widgets, activeSpaceId), [widgets, activeSpaceId]);

  const [sites, setSites] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState<'empty' | 'delete' | null>(null);

  const read = useCallback(() => {
    setSites(null);
    void window.session?.summary(partition).then((summary) => setSites(summary.sites));
  }, [partition]);

  useEffect(read, [read]);

  /** Selects this site's widgets in the space on screen and takes the camera there. */
  const showSite = (site: string) => {
    const found = bySite.get(site);
    if (!found?.length) return;
    useUiStore.getState().setSelection(found.map((widget) => widget.id));
    useSpaceStore.getState().setCamera(centreCamera(getCamera(), found[0], canvasArea()));
    onClose();
  };

  const signOutSite = async (site: string) => {
    setBusy(site);
    await window.session?.clearSite(partition, site);
    setBusy(null);
    read();
  };

  const empty = async () => {
    await window.session?.clear(partition);
    setConfirming(null);
    read();
  };

  /**
   * Deleting forgets the sign-in and empties it. The widgets naming it are left
   * as they are: `partitionFor` sends an id that is gone back to Main, so a
   * widget in a space that is not open never has to be found and rewritten.
   */
  const remove = async () => {
    await window.session?.clear(partition);
    useSignInStore.getState().remove(id);
    onBack();
  };

  const menuItems = [
    { label: 'Rename', run: () => setIsRenaming(true) },
    { label: 'Sign out of everything', run: () => setConfirming('empty') },
    { label: 'Delete this sign-in', run: () => setConfirming('delete'), danger: true },
  ];

  return (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        <button onClick={onBack} title="All sign-ins" className="press t-faint hover:t-ink shrink-0">
          <ChevronLeft size={14} />
        </button>
        {isRenaming ? (
          <NameField
            value={draft}
            onChange={setDraft}
            onCommit={() => {
              useSignInStore.getState().rename(id, draft);
              setIsRenaming(false);
            }}
            onCancel={() => {
              setDraft(name);
              setIsRenaming(false);
            }}
            className="min-w-0 flex-1 text-ui font-semibold"
          />
        ) : (
          <span className="t-ink min-w-0 flex-1 text-ui font-semibold truncate">{name}</span>
        )}
        {id !== SHARED_ID && (
          <div className="relative shrink-0">
            <button
              onClick={() => setIsMenuOpen((open) => !open)}
              title="Rename, sign out, delete"
              className="press t-faint hover:t-ink"
            >
              <MoreHorizontal size={14} />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onPointerDown={() => setIsMenuOpen(false)} />
                <div className="glass-panel absolute right-0 top-6 z-[101] w-44 p-1.5 rounded-surface">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setIsMenuOpen(false);
                        item.run();
                      }}
                      className={`row w-full px-2 py-1.5 rounded-control text-left text-meta ${
                        item.danger ? 't-danger' : 't-ink'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button onClick={onClose} className="press t-faint hover:t-ink shrink-0">
          <X size={12} />
        </button>
      </div>

      <p className="t-faint mb-3 px-1 text-micro leading-snug">
        {widgetsLine(widgets.length)}
        {spaceCount > 1 && ` in ${spaceCount} spaces`}
        {widgets.length === 0 && id !== SHARED_ID && ' — nothing is using it'}
        {isFromSpace(signIn) && `. It came from a space that used to sign in on its own`}
      </p>

      {confirming && (
        <div className="glass border-hair mb-3 p-3 rounded-control border">
          <p className="t-ink text-meta leading-snug mb-2">
            {confirming === 'empty'
              ? `Sign ${name} out of every site? Its cookies, storage and caches are deleted.`
              : `Delete “${name}”? Its cookies are deleted${
                  widgets.length
                    ? ` and ${widgetsLine(
                        widgets.length
                      ).toLowerCase()} go back to Main, signed out`
                    : ''
                }.`}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirming(null)}
              className="row flex-1 py-1 rounded-control text-meta"
            >
              Cancel
            </button>
            <button
              onClick={() => void (confirming === 'empty' ? empty() : remove())}
              className="chrome-button flex-1 py-1 rounded-control text-meta font-medium t-danger"
            >
              {confirming === 'empty' ? 'Sign out' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Sites, not accounts: this is read from cookies that outlive the visit
          (`isLoginCookie`), and no API hands over whose account they are. */}
      <p className="t-soft mb-1 px-1 text-micro font-semibold uppercase tracking-[0.14em]">
        Sites with saved data
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {sites === null ? (
          <div className="space-y-0.5" aria-label="Reading">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <div className="skeleton w-4 h-4 shrink-0" />
                <div className="skeleton h-3" style={{ width: `${52 - i * 10}%` }} />
              </div>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <p className="t-faint px-2 py-1 text-meta leading-snug">
            Nothing yet. Open a page on this sign-in and sign in there.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sites.map((site) => {
              const here = bySite.get(site)?.length ?? 0;
              return (
                <div key={site} className="row flex items-center gap-2 px-2 py-1.5 rounded-control">
                  {/* A letter, not a favicon. Fetching icons for this list would
                      hand every site the user is signed in to to whichever icon
                      service — from the panel whose whole point is that these
                      sessions are kept apart. */}
                  <span className="glass t-soft w-4 h-4 shrink-0 rounded-mark flex items-center justify-center text-micro uppercase">
                    {site[0]}
                  </span>
                  <button
                    onClick={() => showSite(site)}
                    disabled={!here}
                    title={here ? `Select the ${widgetsLine(here).toLowerCase()} on ${site}` : site}
                    className="min-w-0 flex-1 flex items-baseline gap-2 text-left disabled:cursor-default"
                  >
                    <span className="t-ink text-ui truncate">{site}</span>
                    {here > 0 && (
                      <span className="t-faint shrink-0 text-micro">
                        {here > 1 ? `${here} here` : '1 here'}
                      </span>
                    )}
                  </button>
                  {/* Always visible, not on hover: signing out of one site is the
                      thing this panel is for. */}
                  <button
                    onClick={() => void signOutSite(site)}
                    disabled={busy === site}
                    title={`Sign out of ${site} on ${name}`}
                    className="chrome-button shrink-0 px-2 py-0.5 rounded-control text-micro disabled:opacity-40"
                  >
                    Sign out
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

/**
 * The sign-ins (D-074), and everything done to them: made, renamed, emptied,
 * deleted, and signed out of one site at a time.
 *
 * A widget picks which one it runs on in its own address row or right-click menu
 * (`SignInMenu`); this panel is about the set of them rather than about one
 * page. The list comes first and one sign-in opens at a time — five of them with
 * their sites all open at once is a wall of rows nobody reads to the end.
 */
export const SignInsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const signIns = useSignInStore((s) => s.signIns);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? signIns[openId] : undefined;

  return (
    <>
      <div className="fixed inset-0 z-[98]" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed bottom-4 left-[88px] z-[99] w-[21rem] max-h-[70vh] flex flex-col p-4 rounded-surface"
      >
        {open ? (
          <SignInDetail signIn={open} onBack={() => setOpenId(null)} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="t-soft text-meta font-semibold uppercase tracking-widest">
                Sign-ins
              </span>
              <button onClick={onClose} className="press t-faint hover:t-ink ml-auto shrink-0">
                <X size={12} />
              </button>
            </div>
            <p className="t-faint mb-3 text-meta leading-snug">
              Widgets share Main unless you give one another sign-in, which is how the same site can
              be two accounts at once. A widget&apos;s own sign-in is picked in its address row, or
              by right-clicking it.
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
              <SignInList onOpen={setOpenId} />
            </div>
          </>
        )}
      </motion.div>
    </>
  );
};
