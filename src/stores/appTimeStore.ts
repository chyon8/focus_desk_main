import { create } from 'zustand';
import { addAppSeconds, AppTime, dropSpace, sanitizeAppTime } from '../focus/appTime';

// A key of its own, so the space totals in `space-time-v1` need no migration (D-039).
const KEY = 'space-app-time-v1';
const SAVE_EVERY_MS = 10_000;

interface AppTimeState {
  time: AppTime;
  isLoaded: boolean;

  load: () => Promise<void>;
  /** Banks seconds against an app in a space, on today's date unless one is given. */
  add: (spaceId: string, appKey: string, seconds: number, date?: string) => void;
  forget: (spaceId: string) => void;
  flush: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * The load runs once per process, however often it is asked for. It merges the
 * stored copy into whatever has been banked meanwhile, so a second call would
 * add the whole history to itself — which is exactly what StrictMode's repeated
 * effect did, doubling every total on every run.
 */
let loading: Promise<void> | null = null;

export const useAppTimeStore = create<AppTimeState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      // Never write ahead of the load, or the history is replaced by this run.
      if (get().isLoaded) void window.store?.set(KEY, get().time);
    }, SAVE_EVERY_MS);
  };

  return {
    time: {},
    isLoaded: false,

    load: () => {
      loading ??= (async () => {
        const stored = (await window.store?.get(KEY)) as AppTime | undefined;
        // Anything banked while loading wins over the stored copy, so nothing is
        // lost to the round trip.
        set((state) => ({
          time: mergeTime(sanitizeAppTime(stored ?? {}), state.time),
          isLoaded: true,
        }));
      })();
      return loading;
    },

    add: (spaceId, appKey, seconds, date) => {
      const time = addAppSeconds(get().time, spaceId, appKey, seconds, date);
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
      if (!isLoaded) return;
      if (window.store?.setSync) window.store.setSync(KEY, time);
      else void window.store?.set(KEY, time);
    },
  };
});

function mergeTime(base: AppTime, extra: AppTime): AppTime {
  const merged: AppTime = { ...base };
  for (const [spaceId, days] of Object.entries(extra)) {
    const mergedDays = { ...(merged[spaceId] ?? {}) };
    for (const [date, apps] of Object.entries(days)) {
      const combined = { ...(mergedDays[date] ?? {}) };
      for (const [appKey, seconds] of Object.entries(apps)) {
        combined[appKey] = (combined[appKey] ?? 0) + seconds;
      }
      mergedDays[date] = combined;
    }
    merged[spaceId] = mergedDays;
  }
  return merged;
}
