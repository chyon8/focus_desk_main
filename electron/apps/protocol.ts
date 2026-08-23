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

/**
 * The picker's whole world: every app worth offering, plus whether the Spotlight
 * index was part of finding them. When it was not, the list is only what sits in
 * the standard folders — an app kept anywhere else is missing and the user is the
 * only one who can fix that (D-068).
 */
export interface AppCatalog {
  apps: AppInfo[];
  spotlight: boolean;
}

/** Screen coordinates, top-left origin, in points — the units Electron reports. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How a widget says which window it means, for the apps that have several. Both
 * fields are hints — the helper falls back to its usual choice when neither
 * matches anything (D-045).
 */
export interface WindowChoice {
  /** The window this widget was placed on last time. */
  title?: string;
  /** Titles other widgets in this space already stand for. */
  avoid?: string[];
}

export type HelperCmd =
  | { cmd: 'list' }
  /** `activate: false` starts it without taking the front away (space entry). */
  | { cmd: 'launch'; appKey: string; activate?: boolean }
  /** Subscribe to frontmost-application changes. */
  | { cmd: 'watch' }
  | { cmd: 'permissions' }
  /** The app's open windows on this desktop, for the user to pick one (D-048). */
  | { cmd: 'windows'; appKey: string }
  /**
   * Move the app's window onto this rectangle and raise it. `title` is the window
   * this widget used last time and `avoid` the ones other widgets have claimed —
   * both only steer the choice when the app has several windows (D-045).
   */
  | {
      cmd: 'place';
      appKey: string;
      rect: Rect;
      title?: string;
      avoid?: string[];
      /** False while it is only following its widget, so it stays where it is in the stack. */
      raise?: boolean;
    }
  /** Position only — a window following its widget across the canvas. */
  | { cmd: 'move'; appKey: string; rect: Rect }
  /**
   * Bring the app's window back to the front, on top of Focus Desk.
   * `activate: false` only reorders it — the app does not take the keyboard, so
   * this can be done every time the desk comes forward without throwing the user
   * into another application.
   */
  | { cmd: 'raise'; appKey: string; activate?: boolean }
  /**
   * Hide every application except Focus Desk and the ones in `keep`. Focus Desk
   * sits below its own app windows, which also puts it below unrelated ones.
   */
  | { cmd: 'hideOthers'; keep: string[] }
  /** Bring one hidden application back, leaving the rest as they are. */
  | { cmd: 'unhide'; appKey: string }
  /** Everything back — the windows have left their slots. */
  | { cmd: 'unhideAll' }
  /**
   * Move the window off the screen keeping its size — the widget is off the
   * canvas and the window is expected back. `place` brings it out again.
   */
  | { cmd: 'aside'; appKey: string }
  /** Put the window back where it was before the first `place`. */
  | { cmd: 'restore'; appKey: string };

/** An application hidden to keep the space visible, named so it can be asked for back. */
export interface HiddenApp {
  appKey: string;
  name: string;
}

/** One open window, as far as accessibility can describe it without a title bar. */
export interface AppWindow {
  /** Null for a window that reports no title — it cannot be bound to. */
  title: string | null;
  width: number;
  height: number;
  minimized: boolean;
}

export interface AppWindows {
  running: boolean;
  windows: AppWindow[];
  /**
   * Windows on another desktop or in fullscreen. Accessibility cannot see them
   * at all, and their titles would need Screen Recording, so all that can be
   * said is how many there are — the user has to bring them over (D-048).
   */
  elsewhere: number;
}

export type HelperEvent =
  | ({ ev: 'apps' } & AppCatalog)
  | ({ ev: 'windows'; appKey: string } & AppWindows)
  | { ev: 'frontmost'; appKey: string | null }
  /** A placed window has ended up somewhere Focus Desk did not put it. */
  | { ev: 'window'; appKey: string; rect: Rect }
  /** A placed app has quit; there is no window left to keep track of. */
  | { ev: 'gone'; appKey: string }
  | { ev: 'permissions'; accessibility: boolean }
  /**
   * Every application currently held hidden. The whole set each time, not what
   * changed: a delta could only be reported once, since nothing was ever
   * un-hidden and the next call had nothing left to hide.
   */
  | { ev: 'hidden'; apps: HiddenApp[] }
  /** Where the window actually landed, and whether it accepted a size at all. */
  | { ev: 'placed'; appKey: string; resizable: boolean; title: string | null; rect: Rect }
  | { ev: 'error'; cmd: string; reason: string };

export interface Permissions {
  accessibility: boolean;
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
  /**
   * `resizable` is false when the app owns its size and only its position moved;
   * `title` names the window that was chosen, which the widget keeps so it can
   * ask for the same one next time.
   */
  | { ok: true; resizable: boolean; title: string | null; rect: Rect }
  | { ok: false; reason: PlaceFailure };
