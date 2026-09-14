// 8–11. The first plan: the same desk, different story and room.
import { checklist } from './_util.mjs';
import { DESK_ZOOM, ONDO_DESK, desk } from './_desk.mjs';

const camera = { x: 0, y: 0, zoom: DESK_ZOOM };

// 8 = A: freelance designer, café rebrand, Rainy Attic.
const a = { id: 's08-ondo', name: 'Ondo', room: 'rainy-attic', camera, seconds: 8040, widgets: desk(ONDO_DESK) };

// 9 = B: developer, side project launch, Midnight Observatory.
const b = {
  id: 's09-launch',
  name: 'Launch',
  room: 'midnight-observatory',
  camera,
  seconds: 9360,
  widgets: desk({
    memo: '<h2>Launch, Tuesday</h2>' + checklist([['Rate limits on /api', true], ['Stripe webhooks', true], ['Status page', false]]),
    photo: { unsplash: 'tpGlGc_Le4c', caption: 'Desk, 1am' },
    page: 'https://github.com/vercel/next.js/pulls',
    pageZoom: 0.7,
    todos: [
      ['Fix the flaky login test', true],
      ['Write the changelog', false],
      ['Post on Hacker News at 9', false],
    ],
    apps: [
      ['GitHub', 'https://github.com'],
      ['Linear', 'https://linear.app'],
      ['Vercel', 'https://vercel.com'],
      ['ChatGPT', 'https://chatgpt.com'],
    ],
  }),
};

// 10 = C: writing and research, Summer Lake. No saved apps; the page moves right so the boat stays open.
const c = {
  id: 's10-essay',
  name: 'Essay',
  room: 'summer-lake',
  camera,
  seconds: 5400,
  widgets: desk(
    {
      memo:
        '<h2>Pressed flowers</h2><p>Redouté painted roses for an empress and still drew every thorn. The plates were a record before they were decoration.</p><p>Start with the herbarium in the attic. End at the lake.</p>',
      photo: { unsplash: 'weMoB6zAEvE', caption: 'Plate 12, Redouté' },
      page: 'https://www.are.na/company-place/2023-findings-landscape-and-art',
      todos: [
        ['Draft the opening, 400 words', true],
        ['Find the 1817 edition', false],
        ['Ask the archive for scans', false],
      ],
      apps: [],
    },
    {
      memo: [112, 44, 280, 340],
      photo: [112, 404, 280, 250],
      timer: [112, 674, 280, 196],
      page: [1000, 440, 416, 430],
      todo: [416, 650, 230, 220],
    }
  ),
};

// 11 = D: A's desk on Paper.
const d = { ...a, id: 's11-ondo-paper', room: 'paper', widgets: desk(ONDO_DESK) };

export default [a, b, c, d];
