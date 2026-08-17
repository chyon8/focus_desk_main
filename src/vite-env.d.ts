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
      /** Everything installed, fetched once and cached in the main process. */
      list: () => Promise<AppData[]>;
      launch: (appKey: string) => Promise<void>;
      /** Which of the two macOS permissions this feature needs are granted. */
      permissions: () => Promise<{ accessibility: boolean; screenRecording: boolean }>;
      askCaptureAccess: () => Promise<void>;
      /** Opens the Accessibility pane and reveals the binary to add; returns its path. */
      showAccessibilitySettings: () => Promise<string>;
      /** One frame of the app's window as a JPEG data URI, or null if there is none. */
      capture: (appKey: string, maxWidth: number) => Promise<string | null>;
      /** Rect in window coordinates; the main process adds the window's origin. */
      place: (
        appKey: string,
        rect: { x: number; y: number; width: number; height: number }
      ) => Promise<import('./apps/useAppSurface').PlaceResult>;
      /** Puts the window back where it was and brings Focus Desk forward. */
      release: (appKey: string) => Promise<void>;
      /** Which apps count as "still at the desk" while this space is open. */
      setSpaceApps: (appKeys: string[]) => Promise<void>;
      onFrontmost: (handler: (appKey: string | null) => void) => () => void;
    };
    spaces?: {
      list: () => Promise<unknown[]>;
      save: (doc: unknown) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    images?: {
      save: (buffer: ArrayBuffer, fileName: string) => Promise<string>;
      /** Everything currently sitting in the public/wallpapers folder. */
      wallpapers: () => Promise<string[]>;
    };
    windowMode?: {
      setMini: (enabled: boolean) => Promise<void>;
      toggleFullscreen: () => Promise<boolean>;
      onGuestKey: (handler: (key: string) => void) => () => void;
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
