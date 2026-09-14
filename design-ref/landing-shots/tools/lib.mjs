// Shared helpers: the demo profile path and a small CDP client for the demo window.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PROFILE = path.join(os.homedir(), 'Library/Application Support/focus-desk-demo');
export const PORT = process.env.CDP_PORT ?? '9337';
export const PAGE_PREFIX = process.env.PAGE_PREFIX ?? 'http://localhost:3007';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function todayKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function connect() {
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };
  const raw = (method, params = {}, sessionId) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  const { targetInfos } = await raw('Target.getTargets');
  const page = targetInfos.find((t) => t.type === 'page' && t.url.startsWith(PAGE_PREFIX));
  if (!page) {
    throw new Error(`app page not found: ${targetInfos.map((t) => `${t.type} ${t.url}`).join(' | ')}`);
  }
  const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const send = (method, params = {}) => raw(method, params, sessionId);

  /** Runs an expression in the app page. Async expressions are retried: CDP can drop an awaited promise. */
  const evaluate = async (expression, { tries = 4 } = {}) => {
    let last;
    for (let i = 0; i < tries; i += 1) {
      try {
        const { result, exceptionDetails } = await send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (exceptionDetails) {
          throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        }
        return result.value;
      } catch (error) {
        last = error;
        if (!/Promise was collected/.test(error.message)) throw error;
        await wait(400);
      }
    }
    throw last;
  };

  /** Puts the app's stores on `window.__fd` so later calls can be plain synchronous expressions. */
  const stores = async () => {
    const ready = await evaluate('!!window.__fd');
    if (ready) return;
    await evaluate(`Promise.all([
      import('/src/stores/spaceStore.ts'),
      import('/src/stores/spaceTimeStore.ts'),
    ]).then(([space, time]) => { window.__fd = { ...space, ...time }; return true; })`);
  };

  return { send, raw, evaluate, stores, targetInfos, close: () => ws.close() };
}

/** Screenshot of the whole 1440×900 window at `scale`, or of `clip` (CSS px). */
export async function capture(cdp, out, { scale = 2, clip } = {}) {
  // Park the pointer in the bottom-right corner so no widget shows its hover header.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1439, y: 899 });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: scale,
    mobile: false,
  });
  await wait(1500);
  const params = { format: 'png', captureBeyondViewport: false };
  if (clip) params.clip = { ...clip, scale: 1 };
  const { data } = await cdp.send('Page.captureScreenshot', params);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  await cdp.send('Emulation.clearDeviceMetricsOverride', {});
}
