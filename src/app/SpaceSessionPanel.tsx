import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, LogOut, X } from 'lucide-react';
import { centreCamera } from '../canvas/layout';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { partitionOf } from '../spaces/signIns';
import { siteOf } from '../widgets/browserAddress';
import type { WidgetDoc } from '../spaces/types';

/**
 * The open widgets of this space by site, so a row can say whether the sign-in
 * has anything showing it. A closed widget leaves its cookies behind — the jar
 * belongs to the space, not the widget — so most rows in a used space have none.
 */
function widgetsBySite(widgets: Record<string, WidgetDoc>) {
  const bySite = new Map<string, WidgetDoc[]>();
  for (const widget of Object.values(widgets)) {
    if (widget.type !== 'browser' && widget.type !== 'webapp') continue;
    const url = (widget.data as { url?: string }).url;
    if (!url) continue;
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    const site = siteOf(host);
    if (!site) continue;
    bySite.set(site, [...(bySite.get(site) ?? []), widget]);
  }
  return bySite;
}

/**
 * What this space is signed in to (D-074).
 *
 * A space signs in with the jar every shared space uses, or with its own, where
 * the same site can be another account. The panel says which, switches it, and
 * empties the jar it shows — and says when that reaches other spaces too.
 */
export const SpaceSessionPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const spaceName = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.name ?? '');
  const separate = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.signIns === 'separate');
  const partition = useSpaceStore((s) => partitionOf(s.spaces[s.activeSpaceId]));
  /** The other spaces a sign-out here also reaches. */
  const sharedWith = useSpaceStore(
    (s) =>
      Object.values(s.spaces).filter((space) => space.id !== s.activeSpaceId && space.signIns !== 'separate')
        .length
  );
  const widgets = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.widgets);
  const bySite = useMemo(() => widgetsBySite(widgets ?? {}), [widgets]);
  const [sites, setSites] = useState<string[] | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const read = useCallback(() => {
    setSites(null);
    void window.session?.summary(partition).then((summary) => setSites(summary.sites));
  }, [partition]);

  useEffect(read, [read]);

  /** Selects this site's widgets and takes the camera to them. */
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

  const signOutAll = async () => {
    await window.session?.clear(partition);
    setConfirmingAll(false);
    read();
  };

  return (
    <>
      <div className="fixed inset-0 z-[98]" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed bottom-24 left-4 z-[99] w-[21rem] max-h-[60vh] flex flex-col p-4 rounded-surface"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-meta font-semibold uppercase tracking-widest truncate">
            {spaceName} · sign-ins
          </span>
          <button onClick={onClose} className="press t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>
        <p className="t-faint mb-3 text-meta leading-snug">
          {separate
            ? 'This space keeps its own sign-ins. The same site can be a different account in another space, and signing out here leaves the others alone.'
            : sharedWith > 0
            ? `Shared with ${sharedWith === 1 ? '1 other space' : `${sharedWith} other spaces`}. Signing in or out here does the same there.`
            : 'Shared. New spaces sign in with these too.'}{' '}
          Sites stay listed after their widget is closed.
        </p>

        <button
          onClick={() => useSpaceStore.getState().setSignIns(separate ? 'shared' : 'separate')}
          className={`chrome-button w-full h-9 shrink-0 flex items-center justify-center gap-1.5 mb-1 rounded-control text-meta ${
            separate ? 'chrome-button-on' : ''
          }`}
        >
          <KeyRound size={13} />
          Keep this space's sign-ins separate
        </button>
        <p className="t-faint mb-3 px-0.5 text-micro leading-snug">
          {separate
            ? 'Off, this space uses the shared sign-ins. Its own are kept for when you turn this back on.'
            : 'On, this space uses sign-ins of its own.'}{' '}
          Pages in this space reload.
        </p>

        {sites === null ? (
          <div className="space-y-0.5" aria-label="Reading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <div className="skeleton w-4 h-4 shrink-0" />
                <div className="skeleton h-3" style={{ width: `${52 - i * 10}%` }} />
              </div>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="t-faint text-ui leading-snug">
            Not signed in anywhere yet. Sign in to a site in a browser or web app widget and it will
            be listed here.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-0.5">
            {sites.map((site) => {
              const open = bySite.get(site)?.length ?? 0;
              return (
                <div
                  key={site}
                  className={`row group flex items-center gap-3 px-2 py-1.5 rounded-control ${
                    open ? '' : 'opacity-50'
                  }`}
                >
                  {/* A letter, not a favicon. Fetching icons for this list would
                      hand every site the user is signed in to to whichever icon
                      service — from the panel whose whole point is that these
                      sessions are kept apart. */}
                  <span className="glass t-soft w-4 h-4 shrink-0 rounded-mark flex items-center justify-center text-micro uppercase">
                    {site[0]}
                  </span>
                  <button
                    onClick={() => showSite(site)}
                    disabled={!open}
                    title={
                      open
                        ? `Select the ${open === 1 ? 'widget' : `${open} widgets`} on ${site}`
                        : `No widget in this space is open on ${site}`
                    }
                    className="flex-1 min-w-0 flex items-baseline gap-2 text-left disabled:cursor-default"
                  >
                    <span className="t-ink text-ui truncate">{site}</span>
                    <span className="t-faint shrink-0 text-micro">
                      {open ? (open > 1 ? `${open} widgets` : '1 widget') : 'no open widget'}
                    </span>
                  </button>
                  <button
                    onClick={() => void signOutSite(site)}
                    disabled={busy === site}
                    title={
                      separate
                        ? `Sign this space out of ${site}`
                        : `Sign out of ${site} in every shared space`
                    }
                    className="press t-faint t-danger shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <LogOut size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {confirmingAll ? (
          <div className="glass border-hair shrink-0 mt-3 p-3 rounded-control border">
            <p className="t-ink text-meta leading-snug mb-2">
              {separate
                ? `Sign “${spaceName}” out of every site? Its cookies, storage and caches are deleted. Other spaces keep theirs.`
                : `Sign ${sharedWith > 0 ? `this and ${sharedWith === 1 ? '1 other space' : `${sharedWith} other spaces`}` : 'the shared sign-ins'} out of every site? Cookies, storage and caches are deleted. Separate spaces keep theirs.`}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setConfirmingAll(false)}
                className="row flex-1 py-1 rounded-control text-meta"
              >
                Cancel
              </button>
              <button
                onClick={() => void signOutAll()}
                className="chrome-button flex-1 py-1 rounded-control text-meta font-medium t-danger"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingAll(true)}
            disabled={!sites || sites.length === 0}
            className="row shrink-0 mt-3 flex items-center justify-center gap-2 py-1.5 rounded-control text-meta disabled:opacity-40"
          >
            <LogOut size={11} />
            {separate ? 'Sign out of everything here' : 'Sign out of everything, in every shared space'}
          </button>
        )}
      </motion.div>
    </>
  );
};
