/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />

declare global {
  interface Window {
    // Exposed by electron/preload.ts. Undefined when running in a plain browser.
    store?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<void>;
    };
    spaces?: {
      list: () => Promise<unknown[]>;
      save: (doc: unknown) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    images?: {
      save: (buffer: ArrayBuffer, fileName: string) => Promise<string>;
    };
    windowMode?: {
      setMini: (enabled: boolean) => Promise<void>;
      toggleFullscreen: () => Promise<boolean>;
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
