import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { centreCamera } from '../canvas/layout';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
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
 * Every space runs its browser and web app widgets on its own cookie jar, so the
 * same site is a different account in each one. Nothing said so and nothing could
 * undo it: the panel exists to make the separation visible and to empty one jar
 * without touching the others.
 */
export const SpaceSessionPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const spaceName = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.name ?? '');
  const widgets = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.widgets);
  const bySite = useMemo(() => widgetsBySite(widgets ?? {}), [widgets]);
  const [sites, setSites] = useState<string[] | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const read = useCallback(() => {
    setSites(null);
    void window.session?.summary(spaceId).then((summary) => setSites(summary.sites));
  }, [spaceId]);

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
    await window.session?.clearSite(spaceId, site);
    setBusy(null);
    read();
  };

  const signOutAll = async () => {
    await window.session?.clear(spaceId);
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
        className="glass-panel fixed bottom-24 left-4 z-[99] w-[21rem] max-h-[60vh] flex flex-col p-4 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-[11px] font-semibold uppercase tracking-widest truncate">
            {spaceName} · sign-ins
          </span>
          <button onClick={onClose} className="t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>
        <p className="t-faint mb-3 text-[11px] leading-snug">
          This space keeps its own cookies. The same site can be a different account in another
          space, and signing out here leaves the others alone. Sites stay listed after their widget
          is closed — the cookies belong to the space.
        </p>

        {sites === null ? (
          <div className="t-faint text-xs">Reading…</div>
        ) : sites.length === 0 ? (
          <div className="t-faint text-xs leading-snug">
            Not signed in anywhere yet. Open a site in a browser or web app widget in this space and
            it will be listed here.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-0.5">
            {sites.map((site) => {
              const open = bySite.get(site)?.length ?? 0;
              return (
                <div
                  key={site}
                  className={`row group flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${
                    open ? '' : 'opacity-50'
                  }`}
                >
                  {/* A letter, not a favicon. Fetching icons for this list would
                      hand every site the user is signed in to to whichever icon
                      service — from the panel whose whole point is that these
                      sessions are kept apart. */}
                  <span className="glass t-soft w-4 h-4 shrink-0 rounded-sm flex items-center justify-center text-[9px] uppercase">
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
                    <span className="t-ink text-xs truncate">{site}</span>
                    <span className="t-faint shrink-0 text-[10px]">
                      {open ? (open > 1 ? `${open} widgets` : '1 widget') : 'no open widget'}
                    </span>
                  </button>
                  <button
                    onClick={() => void signOutSite(site)}
                    disabled={busy === site}
                    title={`Sign this space out of ${site}`}
                    className="t-faint hover:!text-red-300 shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <LogOut size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {confirmingAll ? (
          <div className="glass border-hair shrink-0 mt-3 p-2.5 rounded-xl border">
            <p className="t-ink text-[11px] leading-snug mb-2">
              Sign “{spaceName}” out of every site? Its cookies, storage and caches are deleted.
              Other spaces keep theirs.
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setConfirmingAll(false)}
                className="row flex-1 py-1 rounded-md text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={() => void signOutAll()}
                className="chrome-button flex-1 py-1 rounded-md text-[11px] font-medium hover:!text-red-300"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingAll(true)}
            disabled={!sites || sites.length === 0}
            className="row shrink-0 mt-3 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] disabled:opacity-40"
          >
            <LogOut size={11} />
            Sign out of everything here
          </button>
        )}
      </motion.div>
    </>
  );
};
