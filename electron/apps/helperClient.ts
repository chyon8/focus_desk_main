import { app } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { HelperCmd, HelperEvent } from './protocol';

const RESTART_DELAY_MS = 2_000;
/** A binary that never starts is a build problem, not a hiccup — stop trying. */
const MAX_RESTARTS = 5;

export interface HelperClient {
  send: (cmd: HelperCmd) => void;
  /** Returns an unsubscribe function. */
  on: (handler: (event: HelperEvent) => void) => () => void;
  stop: () => void;
}

/**
 * The binary macOS grants Accessibility to — not the app bundle, since this is
 * the process that asks. Worth showing the user when the permission has to be
 * added by hand.
 */
export function helperPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'focusdesk-helper')
    : path.join(__dirname, '../resources/focusdesk-helper');
}

/**
 * Runs the native helper as a child process and talks JSON Lines to it.
 *
 * A separate process rather than a native module: it cannot take the app down
 * with it, and a crash costs a respawn instead of a restart. If the binary is
 * missing or this is not macOS, every command is a no-op and the app runs
 * without app widgets rather than failing to start.
 */
export function createHelper(): HelperClient {
  const handlers = new Set<(event: HelperEvent) => void>();
  let child: ChildProcess | null = null;
  let stopped = false;
  let restarts = 0;
  let buffer = '';
  // Replayed after a respawn; without it the frontmost feed dies with the child.
  let watching = false;

  const emit = (event: HelperEvent) => {
    for (const handler of handlers) handler(event);
  };

  const retry = () => {
    child = null;
    if (stopped || restarts >= MAX_RESTARTS) return;
    restarts++;
    setTimeout(start, RESTART_DELAY_MS);
  };

  function start() {
    if (stopped || process.platform !== 'darwin') return;

    child = spawn(helperPath(), { stdio: ['pipe', 'pipe', 'pipe'] });

    child.on('spawn', () => {
      restarts = 0;
      if (watching) send({ cmd: 'watch' });
    });
    child.on('error', retry);
    child.on('exit', retry);

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      buffer += chunk;
      let breakAt = buffer.indexOf('\n');
      while (breakAt !== -1) {
        const line = buffer.slice(0, breakAt);
        buffer = buffer.slice(breakAt + 1);
        if (line) {
          try {
            emit(JSON.parse(line) as HelperEvent);
          } catch {
            // A half-written or malformed line is not worth taking the feed down.
          }
        }
        breakAt = buffer.indexOf('\n');
      }
    });
  }

  function send(cmd: HelperCmd) {
    if (cmd.cmd === 'watch') watching = true;
    child?.stdin?.write(`${JSON.stringify(cmd)}\n`);
  }

  start();

  return {
    send,
    on: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    stop: () => {
      stopped = true;
      child?.kill();
      child = null;
    },
  };
}
