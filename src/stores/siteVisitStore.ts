import { create } from 'zustand';
import { hostOf } from '../widgets/browserAddress';

const KEY = 'site-visits-v1';
/** How many sites to remember. Beyond this the tail is noise nobody revisits. */
const MAX_SITES = 60;

export interface SiteVisit {
  host: string;
  /** The full address last seen on this host, so a tile reopens where they were. */
  url: string;
  count: number;
  lastAt: number;
}

interface SiteVisitState {
  sites: Record<string, SiteVisit>;
  load: () => Promise<void>;
  /** One page load in a browser widget. */
  record: (url: string) => void;
  forget: (host: string) => void;
}

/**
 * Which sites this machine actually goes to (D-075).
 *
 * A browser widget used to open on `example.com`, which is nobody's website. The
 * start page needs something real to offer, and the only honest source is where
 * the user has been. Counts only, kept locally, never sent anywhere — this is a
 * new-tab page, not analytics.
 */
export const useSiteVisitStore = create<SiteVisitState>((set, get) => ({
  sites: {},

  load: async () => {
    const stored = ((await window.store?.get(KEY)) ?? []) as SiteVisit[];
    const sites: Record<string, SiteVisit> = {};
    for (const site of stored) if (site?.host) sites[site.host] = site;
    set({ sites });
  },

  record: (url) => {
    if (!/^https?:\/\//.test(url)) return;
    const host = hostOf(url);
    if (!host || host === url) return;
    set((s) => {
      const existing = s.sites[host];
      const sites = {
        ...s.sites,
        [host]: {
          host,
          url,
          count: (existing?.count ?? 0) + 1,
          lastAt: Date.now(),
        },
      };
      persist(sites);
      return { sites };
    });
  },

  forget: (host) =>
    set((s) => {
      const sites = { ...s.sites };
      delete sites[host];
      persist(sites);
      return { sites };
    }),
}));

function persist(sites: Record<string, SiteVisit>) {
  // Trimmed on the way out rather than on the way in, so a site the user is in
  // the middle of visiting is never dropped mid-session.
  const kept = ranked(sites).slice(0, MAX_SITES);
  void window.store?.set(KEY, kept);
}

/**
 * Most used first, recent breaking ties. Not recency alone: a start page that
 * reshuffles after every page load is one the user cannot build muscle memory
 * for.
 */
export function ranked(sites: Record<string, SiteVisit>): SiteVisit[] {
  return Object.values(sites).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}
