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

export type HelperCmd =
  | { cmd: 'list' }
  | { cmd: 'launch'; appKey: string }
  /** Subscribe to frontmost-application changes. */
  | { cmd: 'watch' };

export type HelperEvent =
  | { ev: 'apps'; apps: AppInfo[] }
  | { ev: 'frontmost'; appKey: string | null }
  | { ev: 'error'; cmd: string; reason: string };
