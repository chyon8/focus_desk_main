import { create } from 'zustand';
import { addCompletedTask, addFocusTime, FocusStats } from '../focus/stats';

const STATS_KEY = 'focus-stats-v1';

interface FocusState {
  stats: FocusStats;
  /** Wall-clock start of the running session, or null when stopped. */
  startedAt: number | null;
  /** Seconds banked before the current run (across pauses). */
  banked: number;
  taskName: string | null;

  load: () => Promise<void>;
  start: (taskName?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  completeTask: () => void;
  elapsed: () => number;
}

function persist(stats: FocusStats) {
  void window.store?.set(STATS_KEY, stats);
}

export const useFocusStore = create<FocusState>((set, get) => ({
  stats: {},
  startedAt: null,
  banked: 0,
  taskName: null,

  load: async () => {
    const stats = (await window.store?.get(STATS_KEY)) as FocusStats | undefined;
    if (stats) set({ stats });
  },

  elapsed: () => {
    const { startedAt, banked } = get();
    return startedAt === null ? banked : banked + Math.floor((Date.now() - startedAt) / 1000);
  },

  start: (taskName) => set({ startedAt: Date.now(), banked: 0, taskName: taskName ?? null }),

  pause: () => {
    const { startedAt, banked } = get();
    if (startedAt === null) return;
    set({ startedAt: null, banked: banked + Math.floor((Date.now() - startedAt) / 1000) });
  },

  resume: () => {
    if (get().startedAt !== null) return;
    set({ startedAt: Date.now() });
  },

  stop: () => {
    const seconds = get().elapsed();
    const stats = addFocusTime(get().stats, seconds);
    persist(stats);
    set({ stats, startedAt: null, banked: 0, taskName: null });
  },

  completeTask: () => {
    const stats = addCompletedTask(get().stats);
    persist(stats);
    set({ stats });
  },
}));
