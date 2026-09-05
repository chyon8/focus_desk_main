/**
 * The page the first run's third move is practised on.
 *
 * Taking something off a page and leaving it on the desk is the move with the
 * highest value and the lowest chance of being found — nothing on screen says
 * the right-click menu has it. Every other move can be shown on the user's own
 * desk; this one needs a page with a picture and a paragraph in it, and on the
 * tools path every page is still a closed tile. So the tour brings its own, and
 * takes it away again when the move is made.
 *
 * A `data:` address rather than a file: it is the same in development and in a
 * packaged build, and there is no path to resolve. The picture is inline for the
 * same reason — the main process decodes `data:` images when one is sent to the
 * canvas, so this behaves exactly like a picture on a real page.
 */

/** Drawn rather than photographed: no licence, a few hundred bytes, any size. */
const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6b17a"/><stop offset="1" stop-color="#e07a5f"/>
    </linearGradient>
  </defs>
  <rect width="320" height="200" fill="url(#sky)"/>
  <circle cx="228" cy="62" r="26" fill="#fff3e0" opacity="0.9"/>
  <path d="M0 152 L74 96 L128 138 L196 74 L260 122 L320 88 L320 200 L0 200 Z" fill="#7a4a3a" opacity="0.55"/>
  <path d="M0 176 L88 128 L158 166 L232 118 L320 158 L320 200 L0 200 Z" fill="#3d2a26"/>
</svg>`;

const PICTURE_SRC = `data:image/svg+xml;base64,${btoa(PICTURE)}`;

const HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>A page like any other</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 40px 44px;
    font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #2a2622; background: #faf7f2;
  }
  h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: -0.02em; }
  .kicker { margin: 0 0 24px; font-size: 12px; letter-spacing: 0.12em;
            text-transform: uppercase; color: #a08d78; }
  img { display: block; width: 100%; max-width: 420px; border-radius: 12px; margin-bottom: 22px; }
  p { max-width: 46em; margin: 0 0 14px; }
  strong { color: #b4522f; }
</style></head>
<body>
  <p class="kicker">Sample page</p>
  <h1>Anything here can come out.</h1>
  <img src="${PICTURE_SRC}" alt="">
  <p><strong>Both work.</strong> Right-click the picture and choose “Send image to
  the canvas”, and it becomes a photo on the desk. Or select any of this text,
  right-click, choose “Send text to the canvas”, and it becomes a note.</p>
  <p>Either one is a copy that is yours — it survives the site changing, or asking
  you to sign in again. Do one and this page goes away.</p>
</body></html>`;

export const SAMPLE_PAGE_URL = `data:text/html;charset=utf-8;base64,${btoa(
  unescape(encodeURIComponent(HTML))
)}`;
