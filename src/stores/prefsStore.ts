import { create } from 'zustand';

const KEY = 'prefs-v1';

/**
 * How the printed widgets — the note, the photo, the sketch — are lit.
 * `theme` follows the space's own colours; `light` keeps them on white paper
 * whatever the room is doing (D-084).
 */
export type PaperMode = 'theme' | 'light';

interface Prefs {
  paper: PaperMode;
  /** Web pages inside browser and web app widgets ask sites for their dark theme. */
  webDark: boolean;
}

interface PrefsState extends Prefs {
  load: () => Promise<void>;
  setPaper: (paper: PaperMode) => void;
  setWebDark: (webDark: boolean) => void;
}

/** Dark, because five of the six themes are. */
const DEFAULTS: Prefs = { paper: 'theme', webDark: true };

/**
 * Settings that belong to the person rather than to a space (D-084). A space
 * carries its own mood — theme, wallpaper, weather — but how bright a sheet of
 * paper is, and whether websites are asked for their dark theme, is one answer
 * for the whole app.
 */
export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...DEFAULTS,

  load: async () => {
    const stored = ((await window.store?.get(KEY)) ?? {}) as Partial<Prefs>;
    const prefs = { ...DEFAULTS, ...stored };
    set(prefs);
    void window.windowMode?.setWebDark(prefs.webDark);
  },

  setPaper: (paper) => {
    set({ paper });
    void window.store?.set(KEY, { paper, webDark: get().webDark });
  },

  setWebDark: (webDark) => {
    set({ webDark });
    void window.store?.set(KEY, { paper: get().paper, webDark });
    // The switch is the main process's to throw: `prefers-color-scheme` is a
    // property of the whole app, not of one page.
    void window.windowMode?.setWebDark(webDark);
  },
}));
