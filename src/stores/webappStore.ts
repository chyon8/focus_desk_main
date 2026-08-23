import { create } from 'zustand';
import type { WebAppIcon } from '../spaces/types';

const KEY = 'webapps-v1';

/**
 * A web app the user has saved: a name, where it opens, and how it is drawn
 * (D-073). Kept outside the space documents on purpose — a saved web app is the
 * user's, not the project's, so the same one can stand in several spaces. Each
 * of those is signed in separately, since sessions are per space (D-074).
 */
export interface WebApp {
  id: string;
  name: string;
  url: string;
  icon: WebAppIcon | null;
}

interface WebAppState {
  apps: Record<string, WebApp>;
  isLoaded: boolean;
  load: () => Promise<void>;
  /** Adds or replaces one, and hands it back so the caller can fill a widget in. */
  save: (app: Omit<WebApp, 'id'> & { id?: string }) => WebApp;
  remove: (id: string) => void;
  /**
   * The site reported a favicon. Kept as the icon unless the user has chosen an
   * emoji — their choice is not something a page load gets to overwrite.
   */
  noteFavicon: (id: string, src: string) => void;
}

function persist(apps: Record<string, WebApp>) {
  void window.store?.set(KEY, Object.values(apps));
}

export const useWebAppStore = create<WebAppState>((set, get) => ({
  apps: {},
  isLoaded: false,

  load: async () => {
    const stored = ((await window.store?.get(KEY)) ?? []) as WebApp[];
    const apps: Record<string, WebApp> = {};
    for (const app of stored) if (app?.id) apps[app.id] = app;
    set({ apps, isLoaded: true });
  },

  save: (input) => {
    const app: WebApp = { ...input, id: input.id ?? crypto.randomUUID() };
    set((s) => {
      const apps = { ...s.apps, [app.id]: app };
      persist(apps);
      return { apps };
    });
    return app;
  },

  remove: (id) =>
    set((s) => {
      const apps = { ...s.apps };
      delete apps[id];
      persist(apps);
      return { apps };
    }),

  noteFavicon: (id, src) => {
    const existing = get().apps[id];
    if (!existing || existing.icon?.kind === 'emoji') return;
    if (existing.icon?.kind === 'image' && existing.icon.src === src) return;
    get().save({ ...existing, icon: { kind: 'image', src } });
  },
}));
