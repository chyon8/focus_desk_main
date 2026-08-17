import { app, ipcMain, net, protocol } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const IMAGE_SCHEME = 'focusdesk-image';

function imagesDir() {
  const dir = path.join(app.getPath('userData'), 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Must run before app.whenReady(). */
export function registerImageProtocolScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_SCHEME, privileges: { secure: true, standard: true, supportFetchAPI: true } },
  ]);
}

const WALLPAPER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

export function registerImagesIpc() {
  // The wallpapers folder is a drop zone: whatever is in it shows up in the
  // picker, so adding a picture is copying a file — no code change.
  ipcMain.handle('images:wallpapers', () => {
    const dir = path.join(process.env.VITE_PUBLIC!, 'wallpapers');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => WALLPAPER_EXTS.has(path.extname(name).toLowerCase()))
      .sort()
      .map((name) => `/wallpapers/${name}`);
  });

  protocol.handle(IMAGE_SCHEME, (request) => {
    // Only ever serve out of the images directory, whatever the URL claims.
    const name = path.basename(decodeURIComponent(new URL(request.url).pathname));
    return net.fetch(`file://${path.join(imagesDir(), name)}`);
  });

  ipcMain.handle('images:save', (_event, buffer: ArrayBuffer, fileName: string) => {
    const data = Buffer.from(buffer);
    // Content hash as the name: re-adding the same picture reuses one file.
    const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
    const ext = path.extname(fileName).toLowerCase() || '.png';
    const name = `${hash}${ext}`;

    const target = path.join(imagesDir(), name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, data);

    return `${IMAGE_SCHEME}://local/${name}`;
  });
}
