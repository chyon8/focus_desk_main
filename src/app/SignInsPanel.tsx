import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { centreCamera } from '../canvas/layout';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { partitionOf, SHARED_PARTITION } from '../spaces/signIns';
import { siteOf } from '../widgets/browserAddress';
import type { SpaceDoc, WidgetDoc } from '../spaces/types';

/**
 * The open widgets of a space by site, so a row can say whether the sign-in has
 * anything showing it. A closed widget leaves its cookies behind — the jar is
 * not the widget's — so most rows in a used jar have none.
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
 * One jar: the shared one, or a separate space's own.
 *
 * Only the space on screen can show where a site is open — selecting widgets in
 * another space would mean switching to it from inside a settings panel.
 */
const Jar: React.FC<{
  partition: string;
  title: string;
  note: string;
  onClose: () => void;
}> = ({ partition, title, note, onClose }) => {
  const activeWidgets = useSpaceStore((s) =>
    partitionOf(s.spaces[s.activeSpaceId]) === partition ? s.spaces[s.activeSpaceId]?.widgets : undefined
  );
  const bySite = useMemo(() => widgetsBySite(activeWidgets ?? {}), [activeWidgets]);
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
    <section className="mb-4 last:mb-0">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="t-ink text-ui font-semibold truncate">{title}</span>
        <span className="t-faint shrink-0 text-micro">{note}</span>
      </div>

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
        <div className="t-faint px-2 py-1 text-meta leading-snug">No site has saved data yet.</div>
      ) : (
        <div className="space-y-0.5">
          {sites.map((site) => {
            const open = bySite.get(site)?.length ?? 0;
            return (
              <div key={site} className="row group flex items-center gap-3 px-2 py-1.5 rounded-control">
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
                  title={open ? `Select the ${open === 1 ? 'widget' : `${open} widgets`} on ${site}` : site}
                  className="flex-1 min-w-0 flex items-baseline gap-2 text-left disabled:cursor-default"
                >
                  <span className="t-ink text-ui truncate">{site}</span>
                  {open > 0 && (
                    <span className="t-faint shrink-0 text-micro">
                      {open > 1 ? `${open} widgets here` : '1 widget here'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => void signOutSite(site)}
                  disabled={busy === site}
                  title={`Sign out of ${site} (${title})`}
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
        <div className="glass border-hair mt-2 p-3 rounded-control border">
          <p className="t-ink text-meta leading-snug mb-2">
            Sign {title} out of every site? Cookies, storage and caches are deleted. The other
            sign-ins are kept.
          </p>
          <div className="flex gap-1.5">
            <button onClick={() => setConfirmingAll(false)} className="row flex-1 py-1 rounded-control text-meta">
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
        sites !== null &&
        sites.length > 0 && (
          <button
            onClick={() => setConfirmingAll(true)}
            className="row mt-1 flex items-center gap-2 px-2 py-1 rounded-control text-meta t-soft"
          >
            <LogOut size={11} />
            Sign out of everything
          </button>
        )
      )}
    </section>
  );
};

/**
 * Where the app is signed in (D-074).
 *
 * Spaces sign in with one shared jar unless a space is kept separate — that
 * switch is in the space's own menu. The list lives in settings because the
 * shared sign-ins belong to the app, not to the space on screen.
 */
export const SignInsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const spaces = useSpaceStore((s) => s.spaces);
  const { shared, separate } = useMemo(() => {
    const all = Object.values(spaces);
    return {
      shared: all.filter((space) => space.signIns !== 'separate'),
      separate: all.filter((space) => space.signIns === 'separate') as SpaceDoc[],
    };
  }, [spaces]);

  return (
    <>
      <div className="fixed inset-0 z-[98]" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed bottom-4 left-[88px] z-[99] w-[21rem] max-h-[70vh] flex flex-col p-4 rounded-surface"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-meta font-semibold uppercase tracking-widest">Sites with saved data</span>
          <button onClick={onClose} className="press t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>
        {/* Listed by long-lived httpOnly cookies (`isLoginCookie`), not by an actual
            sign-in, so a site the user never signed in to can be here too. */}
        <p className="t-faint mb-3 text-meta leading-snug">
          Sites that kept cookies here, which is usually a sign-in. Spaces share one set of sign-ins. A space kept separate has its own, so the same site can
          be another account there — right-click a space to switch.
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {shared.length > 0 && (
            <Jar
              partition={SHARED_PARTITION}
              title="Shared"
              note={shared.length === 1 ? '1 space' : `${shared.length} spaces`}
              onClose={onClose}
            />
          )}
          {separate.map((space) => (
            <Jar
              key={space.id}
              partition={partitionOf(space)}
              title={space.name}
              note="separate"
              onClose={onClose}
            />
          ))}
        </div>
      </motion.div>
    </>
  );
};
