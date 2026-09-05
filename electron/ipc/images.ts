import { app, ipcMain, nativeImage, net, protocol, session } from 'electron';
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

/** What a downloaded image is filed as, since a URL often has no extension. */
const EXT_FOR_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

/** Writes an image into the images directory under its content hash. */
function store(data: Buffer, ext: string) {
  // Content hash as the name: re-adding the same picture reuses one file.
  const name = `${crypto.createHash('sha1').update(data).digest('hex').slice(0, 16)}${ext}`;
  const target = path.join(imagesDir(), name);
  if (!fs.existsSync(target)) fs.writeFileSync(target, data);
  return `${IMAGE_SCHEME}://local/${name}`;
}

/** A favicon fetch that cannot hold a card waiting. */
const FAVICON_TIMEOUT_MS = 4000;

/** An icon and the colour to tint its card with. */
export interface Favicon {
  url: string;
  /**
   * `r, g, b` — the average of the icon's opaque pixels, ready for `rgb()`.
   *
   * Absent when the bytes could not be decoded here. `.ico` is the case that
   * matters: `nativeImage` does not read it, but the renderer's `<img>` does, so
   * the icon is still worth keeping — a card wearing the real logo with no tint
   * beats a letter in a grey box. Gmail and Google Calendar serve only `.ico`.
   */
  color?: string;
}

/**
 * The colour a card takes from its icon.
 *
 * Not a plain average: a logo drawn on a dark rounded square averages to that
 * square, and Figma — whose mark is four bright colours on near-black — came out
 * the colour of the background it was meant to stand out from. Each pixel is
 * weighted by how colourful it is, so the marks win over their backing.
 *
 * A logo with no colour in it at all — GitHub's is one flat black shape — has
 * nothing to weight, so it falls back to the flat average and gets the grey it
 * honestly is.
 *
 * Transparent pixels never count, or every logo on a clear background drifts
 * towards the same grey. Decoded here rather than in the page because the icon
 * is served over a custom scheme, which taints a canvas and makes the pixels
 * unreadable there.
 */
function averageColour(data: Buffer): string | null {
  const image = nativeImage.createFromBuffer(data);
  if (image.isEmpty()) return null;
  // BGRA, one row after another.
  const pixels = image.toBitmap();

  let flatR = 0;
  let flatG = 0;
  let flatB = 0;
  let seen = 0;
  let keenR = 0;
  let keenG = 0;
  let keenB = 0;
  let keenness = 0;

  // Every fourth pixel: a 512-square icon is a quarter of a million of them, and
  // an average does not get truer for looking at all of them.
  for (let i = 0; i < pixels.length; i += 16) {
    if (pixels[i + 3] < 128) continue;
    const b = pixels[i];
    const g = pixels[i + 1];
    const r = pixels[i + 2];
    flatR += r;
    flatG += g;
    flatB += b;
    seen++;
    // How far this pixel is from grey, which is what "colourful" means here.
    const colour = Math.max(r, g, b) - Math.min(r, g, b);
    keenR += r * colour;
    keenG += g * colour;
    keenB += b * colour;
    keenness += colour;
  }
  if (seen === 0) return null;

  // A whole icon this close to grey has no colour to find; the flat average is
  // the truthful answer rather than whatever the few odd pixels say.
  if (keenness > seen * 12) {
    return `${Math.round(keenR / keenness)}, ${Math.round(keenG / keenness)}, ${Math.round(
      keenB / keenness
    )}`;
  }
  return `${Math.round(flatR / seen)}, ${Math.round(flatG / seen)}, ${Math.round(flatB / seen)}`;
}

async function fetchImage(url: string): Promise<Favicon | null> {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS) });
  if (!response.ok) return null;
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!type.startsWith('image/')) return null;
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0) return null;
  // The colour is what this process can work out; the picture is kept either way.
  const colour = averageColour(data);
  return { url: store(data, EXT_FOR_TYPE[type] ?? '.png'), color: colour ?? undefined };
}

/** The largest square a `sizes` attribute claims, or 0 when it claims none. */
function sizeOf(tag: string): number {
  const sizes = tag.match(/sizes\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  return Math.max(0, ...[...sizes.matchAll(/(\d+)x\d+/gi)].map((m) => Number(m[1])));
}

/**
 * The icons a page declares, largest first, as absolute URLs.
 *
 * Preferred over `/favicon.ico` because that file is usually 32 pixels across
 * and a card draws its logo at 64 on a display with two device pixels to each
 * one, where an upscaled icon is the sort of blur the download was to avoid. An
 * apple-touch-icon counts: it carries no `sizes` but is 180 by convention.
 *
 * Only the head is read — the markup is scanned with a regular expression, and
 * a `rel="icon"` never appears below it.
 */
function declaredIcons(html: string, origin: string): string[] {
  const found: { url: string; size: number }[] = [];
  for (const tag of html.slice(0, 60_000).match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/rel\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    const touch = /\bapple-touch-icon\b/i.test(rel);
    if (!touch && !/\bicon\b/i.test(rel)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      found.push({ url: new URL(href, origin).href, size: sizeOf(tag) || (touch ? 180 : 0) });
    } catch {
      // A relative href that will not resolve: try the next link.
    }
  }
  return found.sort((a, b) => b.size - a.size).map((icon) => icon.url);
}

/**
 * The real icon for a site, downloaded once and kept.
 *
 * Chrome's tab list comes over AppleScript, which cannot report favicons, so an
 * imported tab that has never been loaded has nothing to show but its first
 * letter — a whole space of grey boxes. These are fetched from the sites
 * themselves rather than through an icon service: the list of sites somebody has
 * open is the last thing this app should be handing to a third party.
 */
async function download(host: string): Promise<Favicon | null> {
  const origin = `https://${host}`;
  try {
    const page = await net.fetch(origin, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS) });
    if (page.ok) {
      // Two at most: a page can declare a dozen, and the rest are the same
      // picture at sizes no card needs.
      for (const url of declaredIcons(await page.text(), origin).slice(0, 2)) {
        const icon = await fetchImage(url);
        if (icon) return icon;
      }
    }
  } catch {
    // Unreachable, or not HTML. The conventional path may still hold an icon.
  }
  try {
    return await fetchImage(`${origin}/favicon.ico`);
  } catch {
    return null;
  }
}

/**
 * One download per host for as long as the app runs.
 *
 * Every closed card asks for its own icon, and a space of twelve YouTube tabs is
 * twelve cards on one host. The promise is cached rather than the result, so the
 * twelve that mount together share one request. A host that came back with
 * nothing is dropped again: it may have been offline, and the next card to ask
 * should find out rather than inherit the answer.
 */
const inFlight = new Map<string, Promise<Favicon | null>>();

function faviconFor(host: string): Promise<Favicon | null> {
  const known = inFlight.get(host);
  if (known) return known;
  const wanted = download(host).then((icon) => {
    if (!icon) inFlight.delete(host);
    return icon;
  });
  inFlight.set(host, wanted);
  return wanted;
}

/**
 * The picture a page offers for a link preview. `og:image` is what nearly every
 * site sets for the card other apps draw when the link is pasted; Twitter's tag
 * is the fallback a few sites set instead.
 *
 * The whole head is read, not the first stretch of it. Measured 2026-09-01: a
 * YouTube watch page is 1.1MB with a 682KB head, and its `og:image` sits past
 * the scripts near the end of it — capping the scan at 60KB found three meta
 * tags and none of them was this one. Only the head, because these tags never
 * appear below it and the body is where the weight is.
 */
function declaredPreview(head: string, base: string): string | null {
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (
      tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] ?? ''
    ).toLowerCase();
    if (key !== 'og:image' && key !== 'twitter:image' && key !== 'twitter:image:src') continue;
    const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      return new URL(content, base).href;
    } catch {
      // A relative address that will not resolve: keep looking.
    }
  }
  return null;
}

/** The line a page offers about itself, for the card to carry under its title. */
function declaredDescription(head: string): string | null {
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (
      tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] ?? ''
    ).toLowerCase();
    if (key !== 'og:description' && key !== 'description' && key !== 'twitter:description') continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) {
      // Entities and newlines, since this lands straight in a card.
      return content
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
    }
  }
  return null;
}

/** What a page says about itself for a link preview: its picture, filed locally, and its line of description. */
export interface Preview {
  image: string | null;
  description: string | null;
}

/** No colour is taken from the picture — a photograph has no logo colour to find, and averaging a full-size one is work for nothing. */
async function downloadPreview(url: string): Promise<Preview | null> {
  try {
    const page = await net.fetch(url, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS) });
    if (!page.ok) return null;
    const head = (await page.text()).split(/<\/head>/i)[0];
    const description = declaredDescription(head);
    const found = declaredPreview(head, url);
    if (!found) return description ? { image: null, description } : null;

    const response = await net.fetch(found, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS) });
    if (!response.ok) return { image: null, description };
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!type.startsWith('image/')) return { image: null, description };
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0) return { image: null, description };
    return { image: store(data, EXT_FOR_TYPE[type] ?? '.jpg'), description };
  } catch {
    return null;
  }
}

/**
 * One request per address while the app runs, for the same reason the icons have
 * one per host: a card asks as it mounts, and a space full of them mounts at
 * once. Unlike an icon this is per address — every page has its own picture.
 */
const previewsInFlight = new Map<string, Promise<Preview | null>>();

function previewFor(url: string): Promise<Preview | null> {
  const known = previewsInFlight.get(url);
  if (known) return known;
  const wanted = downloadPreview(url).then((preview) => {
    if (!preview) previewsInFlight.delete(url);
    return preview;
  });
  previewsInFlight.set(url, wanted);
  return wanted;
}

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

  // Hosts, not URLs: one icon per site, so twelve tabs on one site cost one
  // fetch. A host with no icon comes back null and its card keeps its letter.
  ipcMain.handle('images:favicons', async (_event, hosts: string[]) => {
    const unique = [...new Set(hosts)].filter((host) => /^[a-z0-9.-]+$/i.test(host));
    const found = await Promise.all(unique.map((host) => faviconFor(host)));
    return Object.fromEntries(unique.map((host, i) => [host, found[i]]));
  });

  // Addresses, not hosts: the preview picture belongs to the page, not the site.
  ipcMain.handle('images:previews', async (_event, urls: string[]) => {
    const unique = [...new Set(urls)].filter((url) => /^https?:\/\//.test(url));
    const found = await Promise.all(unique.map((url) => previewFor(url)));
    return Object.fromEntries(unique.map((url, i) => [url, found[i]]));
  });

  protocol.handle(IMAGE_SCHEME, (request) => {
    // Only ever serve out of the images directory, whatever the URL claims.
    const name = path.basename(decodeURIComponent(new URL(request.url).pathname));
    return net.fetch(`file://${path.join(imagesDir(), name)}`);
  });

  /**
   * A picture the app has only an address for — one sent out of a page (D-081).
   * Fetched through the space's own session, so an image behind a login is the
   * one the user is actually looking at rather than a 403.
   */
  ipcMain.handle('images:from-url', async (_event, url: string, partition: string) => {
    // A picture written into the page rather than fetched. Sent to the canvas
    // like any other, so it is decoded here instead of being refused: `fetch`
    // does not take a `data:` address, and a page that inlines its images would
    // otherwise report that the picture could not be saved.
    const inline = url.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
    if (inline) {
      const data = Buffer.from(inline[2], 'base64');
      return data.length ? store(data, EXT_FOR_TYPE[inline[1].toLowerCase()] ?? '.png') : null;
    }
    if (!/^https?:\/\//.test(url)) return null;
    try {
      const response = await session.fromPartition(partition).fetch(url);
      if (!response.ok) return null;
      const type = response.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) return null;
      const data = Buffer.from(await response.arrayBuffer());
      return store(data, EXT_FOR_TYPE[type.split(';')[0]] ?? '.png');
    } catch {
      return null;
    }
  });

  ipcMain.handle('images:save', (_event, buffer: ArrayBuffer, fileName: string) => {
    const data = Buffer.from(buffer);
    // Content hash as the name: re-adding the same picture reuses one file.
    return store(data, path.extname(fileName).toLowerCase() || '.png');
  });
}
