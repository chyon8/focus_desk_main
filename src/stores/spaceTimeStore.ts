import { create } from 'zustand';
import { addSpaceSeconds, dropSpace, SpaceTime } from '../focus/spaceTime';

const KEY = 'space-time-v1';
/** Ticks land every second; writing to disk that often would be silly. */
const SAVE_EVERY_MS = 10_000;

interface SpaceTimeState {
  time: SpaceTime;
  isLoaded: boolean;

  load: () => Promise<void>;
  /** Banks seconds against a space, on today's date unless one is given. */
  add: (spaceId: string, seconds: number, date?: string) => void;
  forget: (spaceId: string) => void;
  /** Writes immediately — on leaving the app, and before the window closes. */
  flush: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useSpaceTimeStore = create<SpaceTimeState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) return; // Already waiting; the timer writes whatever is latest.
    saveTimer = setTimeout(() => {
      saveTimer = null;
      // Never write ahead of the load, or the history is replaced by this run.
      if (get().isLoaded) void window.store?.set(KEY, get().time);
    }, SAVE_EVERY_MS);
  };

  return {
    time: {},
    isLoaded: false,

    load: async () => {
      const stored = (await window.store?.get(KEY)) as SpaceTime | undefined;
      // Anything banked while loading (the tick starts straight away) wins over
      // the stored copy for those spaces, so nothing is lost to the round trip.
      set((state) => ({
        time: mergeTime(stored ?? {}, state.time),
        isLoaded: true,
      }));
    },

    add: (spaceId, seconds, date) => {
      const time = addSpaceSeconds(get().time, spaceId, seconds, date);
      if (time === get().time) return;
      set({ time });
      scheduleSave();
    },

    forget: (spaceId) => {
      const time = dropSpace(get().time, spaceId);
      if (time === get().time) return;
      set({ time });
      void window.store?.set(KEY, time);
    },

    flush: () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const { time, isLoaded } = get();
      // Writing before the load finished would overwrite the history with a
      // few seconds of this run.
      if (!isLoaded) return;
      if (window.store?.setSync) window.store.setSync(KEY, time);
      else void window.store?.set(KEY, time);
    },
  };
});

function mergeTime(base: SpaceTime, extra: SpaceTime): SpaceTime {
  const merged: SpaceTime = { ...base };
  for (const [spaceId, days] of Object.entries(extra)) {
    const existing = merged[spaceId] ?? {};
    const combined = { ...existing };
    for (const [date, seconds] of Object.entries(days)) {
      combined[date] = (combined[date] ?? 0) + seconds;
    }
    merged[spaceId] = combined;
  }
  return merged;
}
