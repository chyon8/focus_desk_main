import { create } from 'zustand';

const KEY = 'prefs-v1';

interface Prefs {
  /**
   * Whether an app widget seats the real window in its slot. Off by default: it
   * needs accessibility access and it hides the other applications, and neither
   * should happen to someone who has not asked for it. Off, an app
   * widget is a tile that launches the app.
   */
  attachApps: boolean;
}

interface PrefsState extends Prefs {
  load: () => Promise<void>;
  setAttachApps: (attachApps: boolean) => void;
}

const DEFAULTS: Prefs = { attachApps: false };

/**
 * Preferences that belong to the person rather than to a space. A space carries
 * its own mood; app-window placement is the only global preference left.
 */
export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...DEFAULTS,

  load: async () => {
    const stored = ((await window.store?.get(KEY)) ?? {}) as Partial<Prefs>;
    const prefs = { ...DEFAULTS, ...stored };
    set(prefs);
  },

  setAttachApps: (attachApps) => {
    set({ attachApps });
    save(get());
  },
}));

function save({ attachApps }: Prefs) {
  void window.store?.set(KEY, { attachApps });
}
