/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />

import type { AppData } from './spaces/types';

declare global {
  interface Window {
    // Exposed by electron/preload.ts. Undefined when running in a plain browser.
    store?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<void>;
      /** Blocking write, for the last save before the window closes. */
      setSync: (key: string, value: unknown) => void;
    };
    /** Whether the user is at the app: window focused, machine awake. */
    activity?: {
      state: () => Promise<boolean>;
      onChange: (handler: (active: boolean) => void) => () => void;
    };
    /** Real applications: the native helper's side of app widgets (D-038). */
    apps?: {
      /** Every app worth offering, cached briefly in the main process. */
      list: () => Promise<{ apps: AppData[]; spotlight: boolean }>;
      /** `activate: false` starts it in the background, for a space being entered. */
      launch: (appKey: string, activate?: boolean) => Promise<void>;
      /** The app's open windows on this desktop, plus a count of the ones elsewhere. */
      windows: (appKey: string) => Promise<{
        running: boolean;
        windows: { title: string | null; width: number; height: number; minimized: boolean }[];
        elsewhere: number;
      }>;
      /** Whether macOS lets Focus Desk move windows yet. */
      permissions: () => Promise<{ accessibility: boolean }>;
      /** Opens the Accessibility pane and reveals the binary to add; returns its path. */
      showAccessibilitySettings: () => Promise<string>;
      /** Opens the Spotlight pane, where indexing and its exclusions are set. */
      showSpotlightSettings: () => Promise<void>;
      /** Rect in window coordinates; the main process adds the window's origin. */
      place: (
        appKey: string,
        rect: { x: number; y: number; width: number; height: number },
        window?: { title?: string; avoid?: string[] },
        /** False while it is only following its widget, so it keeps its place in the stack. */
        raise?: boolean
      ) => Promise<import('./apps/useAppSurface').PlaceResult>;
      /** Position only, for a window following its widget across the canvas. */
      move: (
        appKey: string,
        rect: { x: number; y: number; width: number; height: number }
      ) => Promise<void>;
      /**
       * Puts the window back where it was. `park` keeps the slot claimed, for a
       * widget that has only slid off the canvas and is expected back (D-072).
       */
      release: (appKey: string, park?: boolean) => Promise<void>;
      /** Lets go of a window the user has moved somewhere themselves, untouched. */
      detach: (appKey: string) => Promise<void>;
      /** A placed window that moved or resized on its own, in window coordinates. */
      onWindowFrame: (
        handler: (
          appKey: string,
          rect: { x: number; y: number; width: number; height: number }
        ) => void
      ) => () => void;
      /** Brings the app's window back in front of Focus Desk. */
      raise: (appKey: string) => Promise<void>;
      /** Whether the real windows are on their slots right now. */
      staged: () => Promise<boolean>;
      /** Asks for the two states; opening an app widget is one of the two ways in. */
      setStaged: (staged: boolean) => Promise<void>;
      /** The desk moved between its two states (⌃⌥D, or a widget click). */
      onStaged: (handler: (staged: boolean) => void) => () => void;
      /** Applications outside this space were hidden to keep the desk visible. */
      onHidden: (handler: (count: number) => void) => () => void;
      /** A placed app quit; its widget goes back to being a launcher. */
      onGone: (handler: (appKey: string) => void) => () => void;
      /** Which apps count as "still at the desk" while this space is open. */
      setSpaceApps: (appKeys: string[]) => Promise<void>;
      onFrontmost: (handler: (appKey: string | null) => void) => () => void;
    };
    spaces?: {
      list: () => Promise<unknown[]>;
      save: (doc: unknown) => Promise<void>;
      /** Blocking save, for the last write before the window goes away. */
      saveSync: (doc: unknown) => void;
      delete: (id: string) => Promise<void>;
    };
    images?: {
      save: (buffer: ArrayBuffer, fileName: string) => Promise<string>;
      /** Everything currently sitting in the public/wallpapers folder. */
      wallpapers: () => Promise<string[]>;
    };
    windowMode?: {
      toggleFullscreen: () => Promise<boolean>;
      onGuestKey: (handler: (key: string, contentsId?: number) => void) => () => void;
      onGuestOpenUrl: (handler: (url: string, contentsId: number) => void) => () => void;
    };
  }

  // Electron's <webview>, used by the browser widget.
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        webview: React.DetailedHTMLProps<
          React.HTMLAttributes<Electron.WebviewTag> & {
            src?: string;
            partition?: string;
            allowpopups?: boolean;
          },
          Electron.WebviewTag
        >;
      }
    }
  }
}

export {};
