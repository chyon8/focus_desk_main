/**
 * The contract with the native helper (D-038) — the one place platform code
 * lives. Porting to Windows means reimplementing these verbs and nothing else.
 *
 * `appKey` is opaque above this layer: a bundle id on macOS, an exe path on
 * Windows. Nothing outside the helper is allowed to parse it.
 */

export interface AppInfo {
  appKey: string;
  name: string;
  /** PNG data URI, or null when the icon could not be read. */
  icon: string | null;
}

/** Screen coordinates, top-left origin, in points — the units Electron reports. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HelperCmd =
  | { cmd: 'list' }
  | { cmd: 'launch'; appKey: string }
  /** Subscribe to frontmost-application changes. */
  | { cmd: 'watch' }
  | { cmd: 'permissions' }
  /** Move the app's main window onto this rectangle and raise it. */
  | { cmd: 'place'; appKey: string; rect: Rect }
  /** Bring the app's window back to the front, on top of Focus Desk. */
  | { cmd: 'raise'; appKey: string }
  /** Put the window back where it was before the first `place`. */
  | { cmd: 'restore'; appKey: string }
  /** One frame of the app's biggest window, for the widget's thumbnail. */
  | { cmd: 'capture'; appKey: string; maxWidth: number }
  | { cmd: 'ask-capture-access' };

export type HelperEvent =
  | { ev: 'apps'; apps: AppInfo[] }
  | { ev: 'frontmost'; appKey: string | null }
  | { ev: 'permissions'; accessibility: boolean; screenRecording: boolean }
  /** Where the window actually landed, and whether it accepted a size at all. */
  | { ev: 'placed'; appKey: string; resizable: boolean; rect: Rect }
  /** A JPEG data URI. */
  | { ev: 'capture'; appKey: string; image: string }
  | { ev: 'error'; cmd: string; reason: string };

export interface Permissions {
  accessibility: boolean;
  screenRecording: boolean;
}

export type PlaceFailure =
  | 'accessibility'
  /** In native fullscreen, so macOS has given it a desktop of its own. */
  | 'fullscreen'
  /** Its window is on another Space; no public API can carry it across. */
  | 'otherSpace'
  | 'notRunning'
  | 'noWindow'
  | 'minimized'
  | 'unknown';

export type PlaceResult =
  /** `resizable` is false when the app owns its size and only its position moved. */
  | { ok: true; resizable: boolean; rect: Rect }
  | { ok: false; reason: PlaceFailure };
