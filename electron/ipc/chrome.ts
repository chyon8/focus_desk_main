import { execFile } from 'node:child_process';
import { ipcMain, shell } from 'electron';

/**
 * Reading the tabs open in Chrome, for the import that fills a new profile.
 *
 * Read-only on purpose, and the onboarding screen says so: nothing here closes a
 * tab or moves one. Losing tabs is the fear this feature has to answer, and the
 * only way to answer it is to not touch them.
 */

/** A user with many windows open should not wait on a hung Chrome. */
const TIMEOUT_MS = 10_000;

/**
 * Control characters as separators. A tab's title is arbitrary text and can hold
 * quotes, newlines and tabs, but not these — so the output splits cleanly without
 * escaping anything.
 */
const RECORD = '\x1e';
const FIELD = '\x1f';

/**
 * `is running` is a property, so it answers without launching Chrome. A plain
 * `tell` would start it, and an app that opens Chrome to ask about Chrome is not
 * what the user pressed.
 */
const SCRIPT = `
if application "Google Chrome" is not running then return ""
set fieldSep to (character id 31)
set recordSep to (character id 30)
tell application "Google Chrome"
  set out to ""
  repeat with w in windows
    repeat with t in tabs of w
      set out to out & (id of w) & fieldSep & (URL of t) & fieldSep & (title of t) & recordSep
    end repeat
  end repeat
  return out
end tell
`;

export interface ChromeTab {
  url: string;
  title: string;
}

export interface ChromeWindow {
  id: string;
  tabs: ChromeTab[];
}

export type ChromeTabsResult =
  /** Chrome answered. No windows means it is not running, or has none open. */
  | { ok: true; windows: ChromeWindow[] }
  /**
   * macOS refused. Once refused it will not ask again, so the caller has to send
   * the user to System Settings rather than retry (D-096).
   */
  | { ok: false; reason: 'denied' }
  | { ok: false; reason: 'failed'; message: string };

/** The AppleScript error for a refused or not-yet-granted automation prompt. */
const NOT_AUTHORISED = /-1743|Not authori[sz]ed/i;

/** Groups the flat `window id / url / title` lines back into windows, in order. */
export function parseTabs(stdout: string): ChromeWindow[] {
  const windows: ChromeWindow[] = [];
  const byId = new Map<string, ChromeWindow>();
  for (const record of stdout.split(RECORD)) {
    if (!record.trim()) continue;
    const [id, url, ...rest] = record.split(FIELD);
    // A title holding the separator would split into extra pieces; it cannot, but
    // joining back costs nothing and keeps a surprise from truncating a title.
    const title = rest.join(FIELD);
    if (!id || !url) continue;
    let window = byId.get(id);
    if (!window) {
      window = { id, tabs: [] };
      byId.set(id, window);
      windows.push(window);
    }
    window.tabs.push({ url, title });
  }
  return windows;
}

function runScript(): Promise<ChromeTabsResult> {
  return new Promise((resolve) => {
    execFile(
      'osascript',
      ['-e', SCRIPT],
      { timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr || error.message;
          resolve(
            NOT_AUTHORISED.test(message)
              ? { ok: false, reason: 'denied' }
              : { ok: false, reason: 'failed', message }
          );
          return;
        }
        resolve({ ok: true, windows: parseTabs(stdout) });
      }
    );
  });
}

export function registerChromeIpc() {
  /**
   * The Automation pane, for a refusal. macOS asks once and then remembers the
   * "no", so the only way back is the user switching it on by hand.
   */
  ipcMain.handle('chrome:show-automation-settings', () =>
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'
    )
  );

  ipcMain.handle('chrome:tabs', async (): Promise<ChromeTabsResult> => {
    if (process.platform !== 'darwin') return { ok: true, windows: [] };
    return runScript();
  });
}
