import { create } from 'zustand';
import { newPartition, SHARED_ID, SHARED_SIGN_IN, type SignIn } from '../spaces/signIns';

const KEY = 'signins-v1';

interface SignInState {
  /** Shared first, then the named ones. Widgets hold an id from here. */
  signIns: Record<string, SignIn>;
  isLoaded: boolean;
  load: () => Promise<void>;
  /** Makes one and hands it back, so the caller can put its id on a widget. */
  add: (name: string) => SignIn;
  rename: (id: string, name: string) => void;
  /** Forgets the jar. Its cookies are cleared by the caller (`session:clear`). */
  remove: (id: string) => void;
  /**
   * Puts jars the spaces were carrying into the list, for the move from a jar per
   * space to a jar per widget (`migrate`). Ids already in the list are left alone.
   */
  adopt: (incoming: SignIn[]) => void;
}

/** Shared is not stored: it is not the user's to rename or delete. */
function persist(signIns: Record<string, SignIn>) {
  void window.store?.set(
    KEY,
    Object.values(signIns).filter((signIn) => signIn.id !== SHARED_ID)
  );
}

/**
 * The named sign-ins, which belong to the person rather than to a space — the
 * same one is used by widgets in several spaces, so a space document is the
 * wrong place for the list (the same reason web apps are kept out of them).
 */
export const useSignInStore = create<SignInState>((set, get) => ({
  signIns: { [SHARED_ID]: SHARED_SIGN_IN },
  isLoaded: false,

  load: async () => {
    const stored = ((await window.store?.get(KEY)) ?? []) as SignIn[];
    const signIns: Record<string, SignIn> = { [SHARED_ID]: SHARED_SIGN_IN };
    for (const signIn of stored) {
      if (signIn?.id && signIn.id !== SHARED_ID && signIn.partition) signIns[signIn.id] = signIn;
    }
    set({ signIns, isLoaded: true });
  },

  add: (name) => {
    const id = crypto.randomUUID();
    const signIn: SignIn = { id, name: name.trim() || 'Sign-in', partition: newPartition(id) };
    set((s) => {
      const signIns = { ...s.signIns, [id]: signIn };
      persist(signIns);
      return { signIns };
    });
    return signIn;
  },

  rename: (id, name) =>
    set((s) => {
      const current = s.signIns[id];
      if (!current || id === SHARED_ID) return {};
      const signIns = { ...s.signIns, [id]: { ...current, name: name.trim() || current.name } };
      persist(signIns);
      return { signIns };
    }),

  remove: (id) =>
    set((s) => {
      if (id === SHARED_ID || !s.signIns[id]) return {};
      const signIns = { ...s.signIns };
      delete signIns[id];
      persist(signIns);
      return { signIns };
    }),

  adopt: (incoming) => {
    const missing = incoming.filter((signIn) => !get().signIns[signIn.id]);
    if (!missing.length) return;
    set((s) => {
      const signIns = { ...s.signIns };
      for (const signIn of missing) signIns[signIn.id] = signIn;
      persist(signIns);
      return { signIns };
    });
  },
}));
