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
    };
    browserView?: {
      sync: (
        id: string,
        spaceId: string,
        url: string,
        rect: { x: number; y: number; width: number; height: number },
        zoom: number,
        area: { x: number; y: number; width: number; height: number },
        covered: boolean
      ) => Promise<string | null>;
      hibernate: (id: string) => Promise<string | null>;
      snapshot: (id: string) => Promise<string | null>;
      destroy: (id: string) => Promise<void>;
      clearSpaceSession: (spaceId: string) => Promise<void>;
    };
  }
}

export {};
