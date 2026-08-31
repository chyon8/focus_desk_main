import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Chrome, LayoutGrid, Plus } from 'lucide-react';
import type { Camera } from '../canvas/camera';
import { arrange, fitCamera, type ArrangeMode, type Box } from '../canvas/layout';
import { WIDGET_DEFS } from '../widgets/defs';
import { assetUrl } from '../spaces/backgrounds';
import { OPEN_TABS, spacesFrom, windowChoices, type WindowChoice } from '../spaces/chromeImport';
import { newSpace, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { useWebAppStore } from '../stores/webappStore';
import { WEB_APP_PRESETS, hostOf, normalizeUrl, type WebAppGroup } from '../webapps/presets';
import type { TodoItem, WebAppIcon } from '../spaces/types';
import { ParticleLayer } from '../themes/ParticleLayer';
import { greetingForHour, roomsForHour, type Room } from './rooms';

/**
 * A preset or a site the user typed in. Their own entries have no icon: the real
 * favicon arrives on the first page load, and a placeholder emoji would be taken
 * for a choice they made and never replaced.
 */
type Pickable = { name: string; url: string; icon: WebAppIcon | null; group: WebAppGroup };

/**
 * The first run (D-097).
 *
 * Seen once, and it decides whether the app is opened a second time. It is a
 * layer over the real app rather than a screen of its own: picking a room sets
 * the space's actual theme, so the scene behind these words is the scene the
 * user is about to work in. Nothing here is a picture of the product.
 *
 * Four questions, and all four answers stay on screen afterwards — the room, the
 * kind of work, the tools, the name. An answer that disappears makes the whole
 * thing a form, and nobody grows attached to a form.
 */

type Step = 'room' | 'work' | 'fill' | 'chrome' | 'tools' | 'name';

/** What this space is for: orders the tools, and picks the last question's example. */
interface Work {
  id: string;
  label: string;
  groups: WebAppGroup[];
  example: string;
}

const WORKS: Work[] = [
  { id: 'design', label: 'Design', groups: ['Design', 'AI', 'Work'], example: 'Client rebrand' },
  { id: 'code', label: 'Code', groups: ['Work', 'AI', 'Chat'], example: 'Sprint 14' },
  { id: 'write', label: 'Write', groups: ['Work', 'AI', 'Chat'], example: 'Chapter 3' },
  { id: 'study', label: 'Study', groups: ['Work', 'AI', 'Video'], example: 'Thesis, chapter 2' },
  { id: 'market', label: 'Market', groups: ['Work', 'Video', 'AI'], example: 'Q4 campaign' },
  { id: 'video', label: 'Make video', groups: ['Video', 'AI', 'Design'], example: 'Episode 12' },
];

const ANY_WORK: Work = { id: 'any', label: '', groups: [], example: "Today's work" };

/** Kept because who this app turned out to be for is not yet known. */
const WORK_KEY = 'work-v1';

/** Milliseconds between one widget landing and the next. */
const LAND_MS = 110;

/**
 * Walking into the room.
 *
 *   0ms    the picked card's rectangle brightens to the room's settled look and
 *          starts opening outwards
 *   140ms  the rooms not picked and the question are gone
 *   290ms  the next question starts fading in
 *   520ms  the opening has reached the edges
 *   760ms  the opened copy has faded into the room under it, which by then is
 *          the same picture at the same brightness
 *
 * The room is already on screen when the click happens — hovering a card puts it
 * there full-bleed — so nothing is loaded, moved or resized here. What opens is
 * a window in the dark layer over it, from the card's rectangle outwards. The
 * picture behind that window never changes size or crop, which is what lets this
 * run at 460ms instead of a second.
 *
 * It was 980ms with an ease that spent its first 150ms almost still: measured,
 * the card was 321px wide at the click and 343px 128ms later. That reads as the
 * app not having heard the click. The ease here does most of the distance in the
 * first third.
 */
const REVEAL_MS = 520;
const CARDS_LEAVE_MS = 140;

/** The next question. Early, over a room that is still opening. */
const NEXT_STEP_MS = 150;

/** The opened copy fading into the settled room beneath it. */
const REVEAL_FADE_MS = 240;

/**
 * How heavy the dark layer is while the rooms are being browsed, and once one is
 * picked. Browsing keeps the thumbnails the brightest thing on screen; picking
 * lifts it, because the room is what the choice was for.
 */
const SCRIM_BROWSING = 0.84;
const SCRIM_SETTLED = 0.4;

/** Every room is one gradient at different strengths, so it can be tweened. */
const SCRIM =
  'linear-gradient(to bottom, rgba(6,5,10,0.86), rgba(6,5,10,0.6) 45%, rgba(6,5,10,0.9))';

/**
 * A pool of shade where the words are.
 *
 * Once a room is picked the layer over it lifts almost all the way — the room is
 * the point — so the contrast the text needs is put under the text rather than
 * over the whole picture. Without it the sub-line and the quiet link disappear
 * into a bright sky.
 */
const POOL =
  'radial-gradient(ellipse 78% 58% at 46% 50%, rgba(6,5,10,0.7) 0%, rgba(6,5,10,0.42) 46%, transparent 78%)';

/**
 * What a room looks like once it has been walked into: the dark layer most of
 * the way up, and the shade under the words.
 *
 * The window that opens on a pick carries this, so it opens straight onto the
 * finished screen. Opening onto a bare photograph instead — which it did —
 * means the shade has to arrive afterwards, and the room dims by a third the
 * moment it is finished arriving.
 */
const Settled: React.FC = () => (
  <>
    <div className="absolute inset-0" style={{ backgroundImage: SCRIM, opacity: SCRIM_SETTLED }} />
    <div className="absolute inset-0" style={{ background: POOL }} />
  </>
);

/** The answer goes into a document, so it must not be able to be markup. */
function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** The presets by group, with the groups this kind of work reaches for first. */
function byGroup(work: Work | null): [string, Pickable[]][] {
  const groups = new Map<string, Pickable[]>();
  for (const preset of WEB_APP_PRESETS) {
    groups.set(preset.group, [...(groups.get(preset.group) ?? []), preset]);
  }
  const wanted: string[] = work?.groups ?? [];
  const entries = [...groups];
  return [
    ...wanted.flatMap((g) => entries.filter(([name]) => name === g)),
    ...entries.filter(([name]) => !wanted.includes(name)),
  ];
}

/**
 * The first tasks in a new space.
 *
 * An empty list is a dead widget on day one, and generic advice is worse. These
 * are the ordinary first moves of the work the user just said they do, plain
 * enough to be overwritten in a second — which is the point: the widget is
 * already working, and editing it is easier than starting it.
 */
const FIRST_TASKS: Record<string, string[]> = {
  design: ['Collect references', 'First pass', 'Send for feedback'],
  code: ['Read the issue', 'First pass', 'Open a pull request'],
  write: ['Outline', 'Draft', 'Read it back tomorrow'],
  study: ['Read the chapter', 'Take notes', 'Test yourself'],
  market: ['Write the brief', 'Draft the copy', 'Schedule it'],
  video: ['Script', 'Rough cut', 'Watch it once through'],
};

function firstTasks(work: Work | null): TodoItem[] {
  const texts = FIRST_TASKS[work?.id ?? ''] ?? ['First thing', 'Then this', 'Later'];
  return texts.map((text) => ({ id: crypto.randomUUID(), text, done: false }));
}

/** The note a space opens with: the user's own answer, and a place under it. */
function firstNote(name: string, work: Work | null) {
  const heading = name || (work ? `${work.label} — today` : 'Today');
  return (
    `<h2>${escapeHtml(heading)}</h2>` +
    `<p>What has to be true by the end of today?</p>` +
    `<p></p>`
  );
}

/** What a widget will be, before it exists: enough to lay the grid out first. */
interface Planned {
  type: 'webapp' | 'memo' | 'todo' | 'browser';
  data: Record<string, unknown>;
}

/**
 * Puts the planned widgets on the canvas, one at a time, at the places they will
 * keep.
 *
 * The whole grid is worked out first and the camera is set once. Arranging after
 * every widget — which is what this did at first — re-flows the ones already
 * down and moves the camera with them, so the desk twitches instead of filling
 * up. Nothing moves twice here: each widget appears where it belongs, and the
 * only motion left is the slow push out at the end.
 *
 * `mode` is `focus` for the Chrome path: an even grid would make the tabs the
 * user was reading the same size as the ones they were not.
 */
function layOut(planned: Planned[], spaceName: string, mode: ArrangeMode = 'grid') {
  const store = useSpaceStore.getState();
  const area = canvasArea();

  const boxes: Box[] = planned.map((item, i) => ({
    id: String(i),
    x: 0,
    y: 0,
    ...WIDGET_DEFS[item.type].defaultSize,
  }));
  const places = arrange(boxes, area, mode);
  const laid = boxes.map(
    (box) => places[box.id] ?? { x: box.x, y: box.y, width: box.width, height: box.height }
  );

  // Framed from the start, a little closer than the finish, so the pull-out at
  // the end is a breath rather than a journey.
  const fit = fitCamera(laid.map((p, i) => ({ id: String(i), ...p })), area);
  if (fit) {
    store.setCamera({
      zoom: fit.zoom * 1.22,
      x: fit.x + area.width * 0.09 / fit.zoom,
      y: fit.y + area.height * 0.09 / fit.zoom,
    });
  }

  let i = 0;
  const made: string[] = [];
  const next = () => {
    if (i < planned.length) {
      const item = planned[i];
      const place = laid[i];
      i++;
      const id = useSpaceStore.getState().addWidget(item.type, item.data);
      useSpaceStore.getState().moveWidget(id, place.x, place.y);
      useSpaceStore.getState().resizeWidget(id, place.width, place.height);
      made.push(id);
      setTimeout(next, LAND_MS);
      return;
    }
    // In the order planned rather than the order added: the tabs the user was
    // reading come first, the memo and the todo they have never touched come
    // last. Without this the memo is the newest widget in the space, so a focus
    // arrange hands the biggest tile to an empty note.
    useSpaceStore.getState().orderWidgets(made);
    if (fit) pullOut(fit, spaceName);
  };
  setTimeout(next, 380);
}

/**
 * Eases the camera out to the frame everything sits in.
 *
 * The point of the app is that a project is in front of you all at once, and no
 * sentence says that as well as watching it come into view. Nobody is asked to
 * pinch anything — the gesture is named afterwards, once they have seen it.
 */
function pullOut(target: Camera, spaceName: string) {
  const store = useSpaceStore.getState();
  const from = store.spaces[store.activeSpaceId]?.camera;
  if (!from) return;
  const DURATION = 1100;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    const eased = 1 - Math.pow(1 - t, 3);
    store.setCamera({
      zoom: from.zoom + (target.zoom - from.zoom) * eased,
      x: from.x + (target.x - from.x) * eased,
      y: from.y + (target.y - from.y) * eased,
    });
    if (t < 1) requestAnimationFrame(step);
    else
      /**
       * The desk is theirs, and here are the two keys.
       *
       * Not a tour: a tour makes somebody click through moves they have no
       * reason for yet. This says the desk is ready and names the keys beside
       * one they can already see. It does not time out — a line teaching a
       * shortcut that disappears after six seconds only reaches whoever happened
       * to be looking at it — and it goes the moment they tidy up, because by
       * then it has said everything it had to say.
       */
      useUiStore
        .getState()
        .showNotice(
          `“${spaceName}” is yours — make yourself at home. G tidies up, F fits it on screen.`,
          undefined,
          true
        );
  };
  requestAnimationFrame(step);
}

/** A heading and the line under it. Left-aligned, like everything on this screen. */
const Title: React.FC<{ children: React.ReactNode; sub?: React.ReactNode }> = ({
  children,
  sub,
}) => (
  <div className="mb-7">
    <h1
      className="text-[36px] font-semibold leading-[1.08] tracking-[-0.03em]"
      style={{ color: '#fff' }}
    >
      {children}
    </h1>
    {sub && (
      <p
        className="mt-2.5 text-[13.5px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.72)' }}
      >
        {sub}
      </p>
    )}
  </div>
);

/** The button that ends a step. The only filled thing on the screen. */
const Go: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : { y: -2 }}
    whileTap={disabled ? undefined : { scale: 0.99 }}
    className="px-6 py-2.5 rounded-full text-[13px] font-semibold"
    style={
      disabled
        ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }
        : { background: '#fff', color: '#14121a', boxShadow: '0 10px 26px -10px rgba(0,0,0,0.8)' }
    }
  >
    {children}
  </motion.button>
);

/** The quiet way sideways. Never hidden, never loud. */
const Quiet: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className="text-[12.5px] transition-colors"
    style={{ color: 'rgba(255,255,255,0.4)' }}
    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.82)')}
    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
  >
    {children}
  </button>
);

/**
 * A room's scene: its wallpaper or gradient, the theme's light, and its weather.
 *
 * The same component draws a card and the full-bleed preview behind the grid, so
 * hovering a card really is a look into that room rather than a different
 * picture of it. `drift` is the slow push a still photograph needs to stop
 * reading as a screenshot — cards only. The full-bleed one is still, because the
 * app's own `SceneLayer` is still: a drifting copy is at some other scale than
 * the real backdrop, and handing over between them jumps.
 *
 * `weather` is off for the copy that opens on a pick, which sits directly over
 * another copy of the same room that already has it.
 */
const RoomScene: React.FC<{ room: Room; drift?: boolean; weather?: boolean }> = ({
  room,
  drift,
  weather = true,
}) => {
  const { scene, atmosphere, particles } = room.theme;
  const wallpaper = room.background ?? (scene.kind === 'image' ? scene.src : null);
  const background: React.CSSProperties = wallpaper
    ? {
        backgroundImage: `url(${assetUrl(wallpaper)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : scene.kind === 'gradient'
      ? { backgroundImage: scene.value }
      : scene.kind === 'color'
        ? { backgroundColor: scene.value }
        : {};

  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={background}
        animate={drift ? { scale: [1, 1.09, 1] } : undefined}
        transition={drift ? { duration: 26, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />
      {atmosphere.glow && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle ${atmosphere.glow.radius * 90}% at ${
              atmosphere.glow.x * 100
            }% ${atmosphere.glow.y * 100}%, ${atmosphere.glow.color} 0%, transparent 70%)`,
          }}
        />
      )}
      {/* The weather goes over the photograph too. Without it four of the six
          rooms are stills, and a grid of stills is a wallpaper picker. */}
      {particles && weather && (
        <div className="absolute inset-0">
          <ParticleLayer kind={particles.kind} density={particles.density} />
        </div>
      )}
    </>
  );
};

/** One room in the grid. Hovering it shows the room behind the whole screen. */
const RoomCard: React.FC<{
  room: Room;
  delay: number;
  /** The room that suits the hour takes two cells, which also fills the grid. */
  wide?: boolean;
  /**
   * Another room has been picked, so this one leaves. Without it the rest of the
   * grid sits on top of the room the user has just walked into — four thumbnails
   * of rooms not chosen floating over it.
   */
  leaving?: boolean;
  /** This is the one that was picked: the full-screen copy is already over it. */
  picked?: boolean;
  onPick: (from: DOMRect) => void;
  onHover: (room: Room) => void;
}> = ({ room, delay, wide, leaving, picked, onPick, onHover }) => {
  // One room is a light one, where a white label on a white scrim disappears.
  const light = room.theme.mood === 'light';
  return (
    <motion.button
      onClick={(e) => onPick(e.currentTarget.getBoundingClientRect())}
      // No matching leave. Moving from one card to the next fires the leave before
      // the enter, so clearing the backdrop there flashed the empty screen
      // between every pair of rooms. The last room looked into stays.
      onHoverStart={() => onHover(room)}
      initial={{ opacity: 0, y: 16 }}
      animate={
        picked
          ? { opacity: 0 }
          : leaving
            ? { opacity: 0, scale: 0.96 }
            : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        picked
          ? // No fade: the window that opens starts on exactly this rectangle, so
            // anything left underneath is a second image of the same card.
            { duration: 0 }
          : leaving
            ? // All at once, and quickly. Staggering them held the grid on screen
              // for most of a second over a room the user had already chosen.
              { duration: CARDS_LEAVE_MS / 1000, ease: 'easeIn' }
            : { delay, duration: 0.45, ease: 'easeOut' }
      }
      whileHover={leaving || picked ? undefined : { y: -6 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative overflow-hidden rounded-[18px] text-left ${
        wide ? 'col-span-2 aspect-[8/3]' : 'aspect-[4/3]'
      }`}
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 18px 40px -18px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
      <RoomScene room={room} drift />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background: light
            ? 'linear-gradient(to top, rgba(255,255,255,0.75), transparent)'
            : 'linear-gradient(to top, rgba(6,5,10,0.7), transparent)',
        }}
      />
      <span
        className="absolute bottom-3 left-3.5 text-[13px] font-medium"
        style={{ color: light ? '#1a1720' : '#fff' }}
      >
        {room.name}
      </span>
    </motion.button>
  );
};

/**
 * The two letters that stand for a site.
 *
 * The last word rather than the first: five of the presets begin with "Google",
 * and a grid of identical G's names nothing. Two letters rather than one for the
 * same reason — Docs and Drive are both D.
 */
function mark(name: string) {
  const words = name.trim().split(/\s+/);
  const word = words[words.length - 1] ?? name;
  return word.slice(0, 2);
}

/** A preset in the grid. Letters, uniform — an emoji per site reads as clip art. */
const Tile: React.FC<{ preset: Pickable; on: boolean; onClick: () => void }> = ({
  preset,
  on,
  onClick,
}) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.12 }}
    title={preset.url}
    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
    style={
      on
        ? { background: '#fff' }
        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
    }
  >
    <span
      className="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-[9.5px] font-semibold uppercase tracking-tight"
      style={
        on
          ? { background: 'rgba(20,18,26,0.12)', color: '#14121a' }
          : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }
      }
    >
      {mark(preset.name)}
    </span>
    <span
      className="text-[12px] truncate"
      style={{ color: on ? '#14121a' : 'rgba(255,255,255,0.82)' }}
    >
      {preset.name}
    </span>
  </motion.button>
);

export const Onboarding: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState<Step>('room');
  const hour = useMemo(() => new Date().getHours(), []);
  const rooms = useMemo(() => roomsForHour(hour), [hour]);
  const [room, setRoom] = useState<Room | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [choices, setChoices] = useState<WindowChoice[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState<Pickable[]>([]);
  const [ownUrl, setOwnUrl] = useState('');
  const [answer, setAnswer] = useState('');
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /**
   * The room shown full-bleed while browsing. It is not cleared when the pointer
   * leaves a card: moving from one card to the next fires the leave before the
   * enter, and clearing it there flashed the empty backdrop between every pair
   * of rooms.
   */
  const [peek, setPeek] = useState<Room | null>(null);
  /** The room being walked into, and the card's rectangle the window opens from. */
  const [entering, setEntering] = useState<{ room: Room; from: DOMRect } | null>(null);
  /** Flipped a frame after `entering`, so the closed rectangle is painted first. */
  const [opened, setOpened] = useState(false);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.4 });

  /** The room behind everything: the one picked, or the one under the pointer. */
  const shown = room ?? peek;

  /**
   * Picking a room sets the real theme, so the scene behind the next question is
   * already the one being chosen.
   *
   * The sound starts here and not on hover. A browser will not play anything
   * until the page has been clicked, and on this screen the first click is this
   * one — so a hover preview would be silent every time it mattered.
   */
  const takeRoom = (chosen: Room, from: DOMRect) => {
    // The peek is left alone: it is already this room, full-bleed, and it is what
    // the opening window opens onto.
    setEntering({ room: chosen, from });
    requestAnimationFrame(() => requestAnimationFrame(() => setOpened(true)));
    useSpaceStore
      .getState()
      .setRoom(
        chosen.theme.id,
        chosen.background ? { type: 'IMAGE', value: chosen.background } : null,
        chosen.ambience
      );
    setRoom(chosen);
    // While the window is still opening. The question is what the user came for;
    // waiting for the animation to finish before asking it is the animation
    // charging rent.
    setTimeout(() => setStep('work'), NEXT_STEP_MS);
    setTimeout(() => setEntering(null), REVEAL_MS + REVEAL_FADE_MS);
  };

  const takeWork = (chosen: Work) => {
    setWork(chosen);
    if (chosen.id !== 'any') void window.store?.set(WORK_KEY, chosen.id);
    setStep('fill');
  };

  const readChrome = async () => {
    setReading(true);
    const result = await window.chromeImport?.tabs();
    setReading(false);
    if (!result?.ok) {
      setNote(
        result?.reason === 'denied'
          ? 'macOS did not allow that. Pick your tools instead — it takes a minute.'
          : 'Chrome could not be read. Pick your tools instead.'
      );
      setStep('tools');
      return;
    }
    const found = windowChoices(result.windows);
    if (found.length === 0) {
      setNote('No Chrome windows are open. Pick your tools instead.');
      setStep('tools');
      return;
    }
    setChoices(found);
    setTicked(new Set(found.map((c) => c.id)));
    setNames(Object.fromEntries(found.map((c) => [c.id, c.name])));
    setStep('chrome');
  };

  const chosen = choices
    .filter((c) => ticked.has(c.id))
    .map((c) => ({ ...c, name: names[c.id] ?? c.name }));

  /**
   * Finishes: names the space, then builds it on the canvas once this screen has
   * gone. The Chrome path arrives here having already named its spaces, so it
   * skips the question rather than overwriting the names the user chose.
   */
  const finish = () => {
    const store = useSpaceStore.getState();
    const name = answer.trim();
    const space = store.spaces[store.activeSpaceId];
    if (!space) {
      onDone();
      return;
    }
    if (name) store.renameSpace(space.id, name);
    onDone();

    const planned: Planned[] = [];
    for (const url of picked) {
      const preset = [...(WEB_APP_PRESETS as Pickable[]), ...own].find((p) => p.url === url);
      if (!preset) continue;
      const app = useWebAppStore
        .getState()
        .save({ name: preset.name, url: preset.url, icon: preset.icon });
      planned.push({
        type: 'webapp',
        data: {
          appId: app.id,
          name: app.name,
          icon: app.icon,
          homeUrl: app.url,
          url: app.url,
          // Closed, like an imported tab: six tiles are a workspace, six loading
          // pages are a stall.
          open: false,
        },
      });
    }
    // Somewhere to write and something to do. Without these a first space reads
    // as a folder of links, and both carry the user's own answers rather than
    // sample text nobody asked for.
    planned.push({ type: 'memo', data: { content: firstNote(name, work) } });
    planned.push({ type: 'todo', data: { items: firstTasks(work), theme: 'LIGHT' } });

    layOut(planned, name || space.name);
  };

  /** A new space wearing the room the user picked, rather than the default one. */
  const roomSpace = (name: string) => {
    const doc = newSpace(name);
    if (!room) return doc;
    return {
      ...doc,
      themeId: room.theme.id,
      background: room.background ? { type: 'IMAGE' as const, value: room.background } : null,
      ambience: room.ambience,
    };
  };

  /**
   * Finishes the Chrome path.
   *
   * The blank space the onboarding started in becomes the first window's space
   * rather than being left beside the imported ones with nothing in it. Only
   * that first space is laid out a widget at a time, since it is the one on
   * screen; the others are saved whole.
   */
  const takeChrome = () => {
    const store = useSpaceStore.getState();
    const space = store.spaces[store.activeSpaceId];
    const [first, ...rest] = chosen;
    if (!space || !first) {
      finish();
      return;
    }

    store.renameSpace(space.id, first.name);
    if (rest.length > 0) {
      store.addSpaces(spacesFrom(rest, roomSpace, canvasArea()));
      // addSpaces makes its first document active; the user is watching this one.
      store.setActiveSpace(space.id);
    }
    onDone();

    const extras: Planned[] = [
      // No space name: on this path it is a domain, and "youtube.com" is not
      // what anybody would write at the top of a page.
      { type: 'memo', data: { content: firstNote('', work) } },
      { type: 'todo', data: { items: firstTasks(work), theme: 'LIGHT' } },
    ];
    const planned: Planned[] = [
      ...first.tabs.map((tab, i) => ({
        type: 'browser' as const,
        data: { url: tab.url, title: tab.title, open: i < OPEN_TABS },
      })),
      ...extras,
    ];
    // The mosaic, so the two tabs the user was reading come back big and the
    // whole desk still fits the screen.
    layOut(planned, first.name, 'focus');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[200] overflow-y-auto"
      onPointerMove={(e) =>
        setCursor({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
      }
    >
      {/* Before any room has been looked at. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 0%, #16131f 0%, #0b0910 55%, #070609 100%)',
        }}
      />

      {/* Every room, mounted from the start, one of them visible.
          Mounted rather than swapped in on hover for two reasons. The wallpapers
          decode once, at the size they are shown, so the first hover is not the
          slow one. And switching is one opacity each way instead of a mount, so
          there is no moment where two photographs are half visible over each
          other — which is what 450ms of crossfade between rooms looked like:
          measured 0.64 of one over 0.36 of the other for half a second. */}
      {rooms.map((r) => (
        <div
          key={r.id}
          className="absolute inset-0 overflow-hidden"
          style={{
            opacity: shown?.id === r.id ? 1 : 0,
            transition: 'opacity 170ms linear',
          }}
        >
          <RoomScene room={r} weather={shown?.id === r.id} />
        </div>
      ))}

      {/* The dark layer the words are read against. It lifts most of the way once
          a room is picked: the room is the reward for picking it, and at the
          weight this carried while browsing the picked room came out darker than
          the grid of thumbnails it replaced. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: SCRIM,
          opacity: room ? SCRIM_SETTLED : shown ? SCRIM_BROWSING : 0,
          transition: `opacity ${room ? REVEAL_MS : 170}ms ease-out`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: POOL,
          opacity: room ? 1 : 0,
          // The same length as the window opening, so the two agree at the end
          // of it and handing over between them changes nothing.
          transition: `opacity ${REVEAL_MS}ms ease-out`,
        }}
      />

      {/* A light that follows the pointer. A flat dark rectangle reads as a
          blank; the same rectangle with something answering the hand reads as a
          surface. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 38vmax at ${cursor.x * 100}% ${
            cursor.y * 100
          }%, rgba(255,255,255,0.055), transparent 70%)`,
        }}
      />

      {/* Picking a room opens a window in the dark layer, from the rectangle of
          the card that was clicked out to the edges of the screen.

          A window rather than a card that grows. The room behind it is already
          full-bleed and already the right one, so this copy is the same picture
          at the same size and crop from the first frame to the last — only the
          shape it is seen through changes. Nothing is resized, so the picture
          never re-crops or slides, and nothing is laid out again per frame.

          The previous version animated top, left, width and height on a
          screen-sized element with a `cover` background: every frame was a fresh
          layout and a fresh crop of a 730KB photograph, and the picture slid
          about inside the growing rectangle.

          Over the cards, so the rooms not chosen cannot show through the part of
          the window that has already opened. */}
      <AnimatePresence>
        {entering && (
          <motion.div
            key={entering.room.id}
            className="fixed inset-0 z-[203] overflow-hidden pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: REVEAL_FADE_MS / 1000 } }}
            style={{
              clipPath: opened
                ? 'inset(0px 0px 0px 0px round 0px)'
                : `inset(${entering.from.top}px ${window.innerWidth - entering.from.right}px ${
                    window.innerHeight - entering.from.bottom
                  }px ${entering.from.left}px round 18px)`,
              // Moves on the first frame and keeps moving. An ease that spends its
              // last two thirds almost still is the same complaint as one that
              // spends its first two thirds almost still, arriving from the other
              // side: the motion is over in 150ms and the rest is a wait.
              transition: `clip-path ${REVEAL_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
              willChange: 'clip-path',
            }}
          >
            <RoomScene room={entering.room} weather={false} />
            <Settled />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Above the opening window, so the next question is readable while the
          room is still opening behind it. */}
      <div className="relative z-[204] min-h-full flex items-center justify-center px-10 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            // `mode="wait"` runs these one after the other, so the exit is what
            // the next question waits on. Short for that reason.
            exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
            transition={{ duration: 0.28 }}
            className="w-full max-w-[62rem]"
          >
            {step === 'room' && (
              <>
                {/* The question goes with the grid: it is answered the moment a
                    card is clicked, and reading it over the room is odd. */}
                <motion.div
                  animate={{ opacity: entering ? 0 : 1, y: entering ? -8 : 0 }}
                  transition={{ duration: CARDS_LEAVE_MS / 1000, ease: 'easeIn' }}
                >
                  <Title sub="A space is somewhere you are. This one is yours — change it any time.">
                    {greetingForHour(hour)} Where do you want to work?
                  </Title>
                </motion.div>
                <div className="grid grid-cols-3 gap-3.5">
                  {rooms.map((r, i) => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      wide={i === 0}
                      delay={0.05 * i}
                      leaving={!!entering && entering.room.id !== r.id}
                      picked={entering?.room.id === r.id}
                      onPick={(from) => takeRoom(r, from)}
                      onHover={setPeek}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 'work' && (
              <>
                <Title sub="So the first thing you see is the kind of thing you use.">
                  What happens in {room?.name ?? 'this room'}?
                </Title>
                <div className="flex flex-wrap gap-2">
                  {WORKS.map((w) => (
                    <motion.button
                      key={w.id}
                      onClick={() => takeWork(w)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 rounded-full text-[13px]"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.88)',
                      }}
                    >
                      {w.label}
                    </motion.button>
                  ))}
                </div>
                <div className="mt-8">
                  <Quiet onClick={() => takeWork(ANY_WORK)}>A bit of everything</Quiet>
                </div>
              </>
            )}

            {step === 'fill' && (
              <>
                <Title sub="Nothing is closed and nothing is moved — only addresses and titles are read.">
                  Let’s put something on the desk.
                </Title>
                <div className="grid grid-cols-2 gap-3 max-w-[34rem]">
                  <motion.button
                    onClick={() => void readChrome()}
                    disabled={reading}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left disabled:opacity-60"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    <Chrome size={22} style={{ color: '#fff' }} />
                    <span className="text-[13.5px] font-medium" style={{ color: '#fff' }}>
                      {reading ? 'Reading Chrome…' : 'Bring in my Chrome tabs'}
                    </span>
                    <span
                      className="text-[11.5px] leading-snug"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      Each window becomes a space of its own.
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={() => setStep('tools')}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    <LayoutGrid size={22} style={{ color: '#fff' }} />
                    <span className="text-[13.5px] font-medium" style={{ color: '#fff' }}>
                      Pick the tools I use
                    </span>
                    <span
                      className="text-[11.5px] leading-snug"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      Tap a few and they stand in this room.
                    </span>
                  </motion.button>
                </div>
              </>
            )}

            {step === 'chrome' && (
              <>
                <Title
                  sub={
                    choices.length === 1
                      ? 'It becomes a space. Your tabs stay in Chrome.'
                      : 'Each becomes a space. Your tabs stay in Chrome.'
                  }
                >
                  {choices.length === 1
                    ? 'One Chrome window is open.'
                    : `${choices.length} Chrome windows are open.`}
                </Title>

                <div className="space-y-1.5 max-h-[42vh] overflow-y-auto max-w-[34rem]">
                  {choices.map((choice) => {
                    const on = ticked.has(choice.id);
                    return (
                      <div
                        key={choice.id}
                        className={`flex flex-col gap-1.5 p-3.5 rounded-2xl transition-opacity ${
                          on ? '' : 'opacity-40'
                        }`}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setTicked((was) => {
                                const next = new Set(was);
                                if (!next.delete(choice.id)) next.add(choice.id);
                                return next;
                              })
                            }
                            className="w-[18px] h-[18px] shrink-0 rounded-md border flex items-center justify-center"
                            style={
                              on
                                ? { background: '#fff', borderColor: '#fff', color: '#14121a' }
                                : { borderColor: 'rgba(255,255,255,0.3)', color: 'transparent' }
                            }
                          >
                            <Check size={11} />
                          </button>
                          <input
                            value={names[choice.id] ?? choice.name}
                            onChange={(e) =>
                              setNames((was) => ({ ...was, [choice.id]: e.target.value }))
                            }
                            disabled={!on}
                            className="flex-1 min-w-0 bg-transparent text-[13px] font-medium outline-none"
                            style={{ color: '#fff' }}
                          />
                          <span
                            className="shrink-0 text-[11px] tabular-nums"
                            style={{ color: 'rgba(255,255,255,0.45)' }}
                          >
                            {choice.tabs.length} tabs
                          </span>
                        </div>
                        <div
                          className="pl-[30px] text-[11px] truncate"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {choice.tabs
                            .slice(0, 5)
                            .map((t) => hostOf(t.url))
                            .join(' · ')}
                          {choice.tabs.length > 5 && ' …'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-5 mt-7">
                  <Go onClick={takeChrome} disabled={chosen.length === 0}>
                    {chosen.length === 1 ? 'Bring in 1 space' : `Bring in ${chosen.length} spaces`}
                  </Go>
                  <Quiet onClick={() => setStep('tools')}>Pick my tools instead</Quiet>
                </div>
              </>
            )}

            {step === 'tools' && (
              <>
                <Title sub={note ?? 'They stand in this room, each signed in on its own.'}>
                  What do you work in?
                </Title>

                {/* Faded at the edges, so a row cut off by the scroll box reads
                    as more to come rather than as a broken layout. */}
                <div
                  className="max-h-[42vh] overflow-y-auto -mx-1 px-1"
                  style={{
                    maskImage:
                      'linear-gradient(to bottom, transparent, #000 12px, #000 calc(100% - 20px), transparent)',
                  }}
                >
                  {(own.length ? ([['Yours', own]] as [string, Pickable[]][]) : [])
                    .concat(byGroup(work))
                    .map(([group, presets]) => (
                      <div key={group} className="mb-4">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-2"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {group}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {presets.map((preset) => (
                            <Tile
                              key={preset.url}
                              preset={preset}
                              on={picked.includes(preset.url)}
                              onClick={() =>
                                setPicked((was) =>
                                  was.includes(preset.url)
                                    ? was.filter((u) => u !== preset.url)
                                    : [...was, preset.url]
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const url = normalizeUrl(ownUrl);
                    if (!url || [...(WEB_APP_PRESETS as Pickable[]), ...own].some((p) => p.url === url)) {
                      setOwnUrl('');
                      return;
                    }
                    setOwn((was) => [...was, { name: hostOf(url), url, icon: null, group: 'Work' }]);
                    setPicked((was) => [...was, url]);
                    setOwnUrl('');
                  }}
                  className="flex items-center gap-2 mt-2 px-3.5 py-2 rounded-xl max-w-[34rem]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Plus size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    value={ownUrl}
                    onChange={(e) => setOwnUrl(e.target.value)}
                    placeholder="Something else you use — paste its address"
                    className="flex-1 min-w-0 bg-transparent text-[12px] outline-none placeholder:opacity-40"
                    style={{ color: '#fff' }}
                  />
                </form>

                <div className="mt-7">
                  <Go onClick={() => setStep('name')} disabled={picked.length === 0}>
                    {picked.length === 0 ? 'Tap a few to start' : `Put ${picked.length} on the desk`}
                  </Go>
                </div>
              </>
            )}

            {step === 'name' && (
              <>
                <Title sub="It becomes the name of this space. You can change it later.">
                  What are you working on?
                </Title>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    finish();
                  }}
                  className="flex items-center gap-2 p-2 pl-5 rounded-2xl max-w-[30rem]"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  <input
                    autoFocus
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={(work ?? ANY_WORK).example}
                    className="flex-1 min-w-0 bg-transparent text-[16px] outline-none placeholder:opacity-35"
                    style={{ color: '#fff' }}
                  />
                  <button
                    type="submit"
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl"
                    style={{ background: '#fff', color: '#14121a' }}
                  >
                    <ArrowRight size={15} />
                  </button>
                </form>

                <div className="flex items-center gap-5 mt-7">
                  <Quiet onClick={finish}>Skip</Quiet>
                  {/* What this app is for happens on the second opening, not this
                      one. Saying so is part of making it happen. */}
                  <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Tomorrow you’ll open this exactly as you left it.
                  </span>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
