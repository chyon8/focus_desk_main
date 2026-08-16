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

export function registerImagesIpc() {
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
