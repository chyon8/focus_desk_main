import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useSpaceStore } from "../stores/spaceStore";
import { canvasArea, useUiStore } from "../stores/uiStore";
import { SAMPLE_PAGE_URL } from "./samplePage";

/**
 * The three moves the app never shows on screen: bringing a widget out of the
 * canvas, tidying up, and taking something off a page. Taught once, after the
 * first run, by pointing at the place each one happens rather than by naming it
 * in a line at the bottom of the window — a line has to be matched to the screen
 * by the reader, and the widget palette that used to stand for the first move is
 * gone from the sidebar.
 *
 * The third has nowhere of the user's own to happen — on the tools path every
 * page is still a closed tile — so the tour puts down a sample page, and takes
 * it away again once something has come off it.
 *
 * The rest of the screen is dimmed and takes no clicks while a step is waiting,
 * and the ring is a real hole in that layer: the one place the pointer still
 * reaches is the place the move happens. Two things are never taken away — the
 * keyboard, since G is the second move, and Skip, since a tour nobody can leave
 * is worse than no tour.
 *
 * With no spot to point at — a space with no bare canvas left, or a closed
 * sidebar — nothing is dimmed and nothing is blocked. A dark screen with no hole
 * in it is a trap.
 */

/** Marks everything this file draws, so measuring the screen can look past it. */
const LAYER_ATTR = "data-first-steps";
/**
 * How far in from the edges of the view the ring may sit. A tidied desk leaves
 * its bare canvas as a border around the widgets as much as as gaps between
 * them, so this cannot be wide or there is nowhere left to point.
 */
const MARGIN = 36;
/** The ring, per step. The first is a patch of bare canvas, the second a button. */
/** The ring for the second move, which circles a button of a known size. */
const TIDY_RING = 64;
/** How long the congratulation stays before it goes on its own. */
const DONE_MS = 7000;
/**
 * What the lit circle for the first move may measure, in the order they are
 * tried. Everything inside it takes clicks, so it has to be over bare canvas end
 * to end — and on a tidied desk the widest bare circle is not always a wide one.
 */
const HOLE_RADII = [60, 46, 34, 26];
/** When to look at the screen again after a step starts, in ms. */
const SETTLE_MS = [420, 1000];
/** Eight points around a circle, as fractions of its radius. */
const RIM = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => ({
  dx: Math.cos((deg * Math.PI) / 180),
  dy: Math.sin((deg * Math.PI) / 180),
}));
/** Dark enough to say "here", light enough that the desk underneath is still theirs. */
const SCRIM = 0.45;

type Point = { x: number; y: number };

/**
 * The lit patch. A circle for the first move, which points at a bare spot on the
 * canvas; the sidebar's own rectangle for the second, because the Arrange button
 * opens a menu above itself and a hole cut to the button leaves that menu dark.
 */
type Hole =
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number };

/**
 * A spot where a double-click really does open the palette: the canvas takes one
 * only when nothing is under the pointer, so the test is what `elementFromPoint`
 * hands back, not how far the widgets are. Nothing, when the space is covered.
 */
function clearSpot(): { at: Point; r: number | null } | null {
  const area = canvasArea();
  const viewport = document.querySelector("[data-canvas-viewport]");
  if (!viewport) return null;
  const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const near = (p: Point) => Math.hypot(p.x - centre.x, p.y - centre.y);

  // Everything this layer draws is skipped, the dark one above all: it covers
  // the whole window, so asking what is on top would answer "the scrim" at every
  // point and the spot it is cut around would be lost on the next resize.
  const topmost = (x: number, y: number) =>
    document
      .elementsFromPoint(x, y)
      .find((el) => !el.closest(`[${LAYER_ATTR}]`)) ?? null;

  // The whole lit circle has to be bare, not only its middle: every point inside
  // it takes clicks, so a widget reaching into it gets double-clicked instead of
  // the canvas — and a double-click on a widget header fills the screen with it.
  const clear = (p: Point, r: number) =>
    topmost(p.x, p.y) === viewport &&
    RIM.every(({ dx, dy }) => topmost(p.x + dx * r, p.y + dy * r) === viewport);

  // Biggest first, then smaller. A tidied desk leaves gaps rather than fields,
  // and a ring the gap cannot hold is a ring pointing at a widget.
  for (const r of HOLE_RADII) {
    let best: Point | null = null;
    for (let y = area.y + MARGIN; y < area.y + area.height - MARGIN; y += 10) {
      for (let x = area.x + MARGIN; x < area.x + area.width - MARGIN; x += 10) {
        const p = { x, y };
        if ((!best || near(p) < near(best)) && clear(p, r)) best = p;
      }
    }
    if (best) return { at: best, r };
  }

  // No circle this desk can hold. The ring still goes on the best bare point it
  // has, and nothing is dimmed — a hole that is not bare end to end would send
  // the double-click to a widget header, which fills the screen with it.
  let bare: Point | null = null;
  for (let y = area.y + MARGIN; y < area.y + area.height - MARGIN; y += 10) {
    for (let x = area.x + MARGIN; x < area.x + area.width - MARGIN; x += 10) {
      const p = { x, y };
      if ((!bare || near(p) < near(bare)) && topmost(x, y) === viewport) bare = p;
    }
  }
  return bare && { at: bare, r: null };
}

/** Where the Arrange button is, so the second step can circle the real one. */
function arrangeSpot(): Point | null {
  const el = document.querySelector('[data-first-step="tidy"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Everything but one circle, darkened and deaf to the pointer.
 *
 * One element does both jobs: `clip-path` takes the circle out of the shape, and
 * a clipped-away region is not hit-tested either — so the click that lands in the
 * hole goes to whatever is under it, the canvas or the Arrange button, while
 * every click outside stops here.
 */
const Spotlight: React.FC<{ hole: Hole; size: { w: number; h: number } }> = ({ hole, size }) => (
  <motion.div
    className="absolute inset-0 pointer-events-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35 }}
    style={{
      background: `rgba(0, 0, 0, ${SCRIM})`,
      clipPath: `path(evenodd, "M0 0 H${size.w} V${size.h} H0 Z ${holePath(hole)}")`,
    }}
  />
);

/** The shape cut out of the dark layer, wound backwards so `evenodd` empties it. */
function holePath(hole: Hole): string {
  if (hole.kind === "circle") {
    const { x, y, r } = hole;
    return `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  const { x, y, w, h, r } = hole;
  return (
    `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
    `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
    `H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
    `V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

/** The patch lit for the first move: whatever circle the desk had room for. */
function circleAt(spot: { at: Point; r: number | null }): Hole | null {
  return spot.r === null
    ? null
    : { kind: "circle", x: spot.at.x, y: spot.at.y, r: spot.r };
}

/**
 * The patch lit for the second: the whole sidebar. Null when it is not open, and
 * then nothing is dimmed — the ring still points at Arrange, and G still works.
 */
function sidebarHole(): Hole | null {
  const el = document.querySelector('[data-first-step-area="tidy"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { kind: "rect", x: r.left, y: r.top, w: r.width, h: r.height, r: 16 };
}

/**
 * The patch lit for the third: the sample page itself. No ring on this one — the
 * target is a whole page, and a circle drawn on it would be pointing at a spot
 * that does not matter.
 */
function widgetHole(id: string): Hole | null {
  const el = document.querySelector(`[data-widget-id="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
  return {
    kind: "rect",
    x: r.left - 8,
    y: r.top - 8,
    w: r.width + 16,
    h: r.height + 16,
    r: 18,
  };
}

/** The ring: a still circle with one going out of it, so it reads as a place to aim at. */
const Ring: React.FC<{ at: Point; size: number }> = ({ at, size }) => (
  <div className="absolute" style={{ left: at.x, top: at.y }}>
    <motion.span
      className="block absolute rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        border: "2px solid color-mix(in srgb, var(--accent) 70%, transparent)",
        background: "color-mix(in srgb, var(--accent) 10%, transparent)",
      }}
      animate={{ opacity: [0.85, 0.5, 0.85] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="block absolute rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        border: "2px solid color-mix(in srgb, var(--accent) 55%, transparent)",
      }}
      animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
    />
  </div>
);

/**
 * A short burst of paper out of the tick, once, when the last move is made.
 *
 * Drawn rather than pulled in: twenty divs on their own transforms cost nothing
 * next to a library, and the burst has to be small — the desk behind it is the
 * thing being handed over, and a screen of falling confetti covers it up.
 */
const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.22;
  const reach = 78 + (i % 5) * 26;
  return {
    id: i,
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach - 26, // biased upwards, the way thrown paper goes
    spin: (i % 2 ? 1 : -1) * (160 + (i % 4) * 90),
    delay: (i % 6) * 0.022,
    color: ["var(--accent)", "#f6b17a", "#7fb5a5", "#e8dcc8"][i % 4],
    tall: i % 3 === 0,
  };
});

const Confetti: React.FC = () => (
  <div className="absolute left-1/2 top-0 pointer-events-none" aria-hidden>
    {CONFETTI.map((bit) => (
      <motion.span
        key={bit.id}
        className="block absolute rounded-[1px]"
        style={{
          width: bit.tall ? 4 : 7,
          height: bit.tall ? 10 : 4,
          background: bit.color,
        }}
        initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
        animate={{
          x: bit.x,
          // Up and then a little down: it is thrown, not sprayed.
          y: [0, bit.y, bit.y + 34],
          opacity: [0, 1, 0],
          rotate: bit.spin,
          scale: 1,
        }}
        transition={{
          duration: 1.15,
          delay: bit.delay,
          ease: [0.15, 0.7, 0.3, 1],
          times: [0, 0.55, 1],
        }}
      />
    ))}
  </div>
);

/** A key as it is drawn on a keyboard, so the letter reads as something to press. */
const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd
    className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md text-[11px] font-semibold"
    style={{
      background: "color-mix(in srgb, var(--accent) 22%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
      color: "var(--accent)",
    }}
  >
    {children}
  </kbd>
);

/** Three dots: which move this is, and that there are only three of them. */
const Dots: React.FC<{ index: number }> = ({ index }) => (
  <span className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background:
            i <= index
              ? "var(--accent)"
              : "color-mix(in srgb, var(--ink) 22%, transparent)",
        }}
      />
    ))}
  </span>
);

export const FirstSteps: React.FC = () => {
  const step = useUiStore((s) => s.firstStep);
  const spaceName = useUiStore((s) => s.firstStepSpace);
  // The widget palette the first move opens. It sits above this layer and takes
  // the keyboard, so dimming behind it says nothing and the hole is under a
  // panel nobody can click through.
  const picking = useUiStore((s) => !!s.quickAdd);
  const sampleId = useUiStore((s) => s.firstStepSampleId);
  const [at, setAt] = useState<Point | null>(null);
  /** The ring's diameter: the lit circle, less the room kept around it. */
  const [ringSize, setRingSize] = useState(TIDY_RING);
  const [hole, setHole] = useState<Hole | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Worked out when the step starts, and again if the window changes shape: the
  // ring points at a place on the screen, and the screen can move under it. The
  // size goes with it — the dark layer is cut to the window it covers.
  useEffect(() => {
    if (!step || step === "done") {
      setAt(null);
      setHole(null);
      return;
    }
    const find = () => {
      if (step === "drag") {
        setAt(null);
        setHole(sampleId ? widgetHole(sampleId) : null);
      } else if (step === "add") {
        const spot = clearSpot();
        setAt(spot?.at ?? null);
        setHole(spot && circleAt(spot));
        setRingSize(spot?.r ? (spot.r - 12) * 2 : TIDY_RING);
      } else {
        const point = arrangeSpot();
        setAt(point);
        setHole(point && sidebarHole());
        setRingSize(TIDY_RING);
      }
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    // Measured more than once. A step begins the moment the move before it is
    // made, and at that moment things are still moving — widgets are landing one
    // by one, the sample page is animating in — so the first reading is of a
    // screen that is about to change. Reading a settled screen is what decides
    // whether there is anywhere to point at at all.
    find();
    const settle = SETTLE_MS.map((ms) => setTimeout(find, ms));
    window.addEventListener("resize", find);
    return () => {
      settle.forEach(clearTimeout);
      window.removeEventListener("resize", find);
    };
  }, [step, sampleId]);

  useEffect(() => {
    if (step !== "drag") return;
    const id = useSpaceStore
      .getState()
      .addWidget("browser", { url: SAMPLE_PAGE_URL, title: "Sample page" });
    useUiStore.getState().setFirstStepSample(id);
    return () => {
      // Whatever the user took off it stays; the page it came off does not. Also
      // runs when the tour is skipped, so Skip leaves nothing behind either.
      useSpaceStore.getState().removeWidget(id);
      useUiStore.getState().setFirstStepSample(null);
    };
  }, [step]);

  useEffect(() => {
    if (step !== "done") return;
    const timer = setTimeout(
      () => useUiStore.getState().endFirstSteps(),
      DONE_MS,
    );
    return () => clearTimeout(timer);
  }, [step]);

  if (!step) return null;

  // Above the ring when it is low on the screen, below it when it is high, so the
  // card never covers the spot it is pointing at. With no ring — a space with no
  // bare canvas left — it sits where every other message in the app sits.
  // Three moves now, and the last one's target is a page rather than a point.
  const two = step === "add" || step === "tidy";
  const below = at ? at.y < window.innerHeight / 2 : true;
  // The last card is a different kind of thing — a line about the desk rather
  // than an instruction beside a ring — so it is wider and sits in the middle.
  const CARD_WIDTH = step === "done" ? 380 : 300;
  // The placing is on this wrapper rather than on the card: the card's own
  // transform belongs to the animation, and a second one would overwrite it.
  const place: React.CSSProperties =
    step === "drag"
      ? // Under the sample page, or over it when the page reaches the bottom of
        // the window. Never on it: the picture to right-click is on it.
        hole?.kind === "rect"
        ? {
            left: Math.min(
              Math.max(hole.x + hole.w / 2 - CARD_WIDTH / 2, 12),
              window.innerWidth - CARD_WIDTH - 12,
            ),
            ...(hole.y + hole.h + 130 < window.innerHeight
              ? { top: hole.y + hole.h + 16 }
              : { bottom: window.innerHeight - hole.y + 16 }),
          }
        : { left: "50%", bottom: 72, marginLeft: -CARD_WIDTH / 2 }
      : at && step !== "done"
      ? hole?.kind === "rect"
        ? // Beside the lit panel, not over it: the Arrange button opens its menu
          // upwards, which is exactly where a card above the ring would sit.
          {
            left: hole.x + hole.w + 20,
            top: Math.min(at.y - 40, window.innerHeight - 160),
          }
        : {
            left: Math.min(
              Math.max(at.x - CARD_WIDTH / 2, 12),
              window.innerWidth - CARD_WIDTH - 12,
            ),
            top: below ? at.y + ringSize / 2 + 18 : undefined,
            bottom: below
              ? undefined
              : window.innerHeight - (at.y - ringSize / 2 - 18),
          }
      : { left: "50%", top: "38%", marginLeft: -CARD_WIDTH / 2 };

  return (
    <div {...{ [LAYER_ATTR]: "" }} className="fixed inset-0 z-[92] pointer-events-none">
      {/* Only with somewhere to point. Dimming the screen without cutting the
          hole would leave the user in the dark with nothing to click. */}
      <AnimatePresence>
        {hole && step !== "done" && !picking && (
          <Spotlight key="scrim" hole={hole} size={size} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {at && two && <Ring key={step} at={at} size={ringSize} />}
      </AnimatePresence>

      <div className="absolute" style={{ ...place, width: CARD_WIDTH }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, scale: step === "done" ? 0.9 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={
              step === "done"
                ? { type: "spring", stiffness: 320, damping: 20 }
                : { duration: 0.22 }
            }
            className={`glass-panel rounded-2xl shadow-2xl ${
              step === "done" ? "px-6 py-6" : "px-4 py-3"
            }`}
          >
            {step === "add" && (
              <>
                <p className="t-ink text-[13px] font-medium mb-1">
                  Three moves, then the desk is yours.
                </p>
                <p className="t-soft text-xs leading-relaxed">
                  Double-click the ring — that is how anything comes out onto
                  the desk.
                </p>
              </>
            )}

            {step === "tidy" && (
              <>
                <p className="t-ink text-[13px] font-medium mb-1">Two of three.</p>
                <p className="t-soft text-xs leading-relaxed">
                  Press <Key>G</Key> to tidy the desk up, or click Arrange.
                </p>
              </>
            )}

            {step === "drag" && (
              <>
                <p className="t-ink text-[13px] font-medium mb-1">
                  Last one — take something off this page.
                </p>
                <p className="t-soft text-xs leading-relaxed">
                  Right-click the picture — or select some of the text and
                  right-click that. Either one becomes a widget on the desk.
                </p>
              </>
            )}

            {/* The end of it, and the only place the desk is handed over. The
                two keys are named rather than asked for: a key is worth more
                tomorrow than a button is worth now. */}
            {step === "done" && (
              <div className="relative text-center px-2 pt-1 pb-2">
                <Confetti />
                <motion.span
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent) 22%, transparent)",
                    boxShadow:
                      "0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 14 }}
                >
                  <Check size={28} className="t-accent" strokeWidth={2.5} />
                </motion.span>
                <p className="t-ink text-[22px] font-semibold leading-tight tracking-[-0.02em] mb-1.5">
                  That’s everything.
                </p>
                <p className="t-ink text-[15px] font-medium mb-1">
                  “{spaceName}” is yours.
                </p>
                <p className="t-soft text-xs leading-relaxed">
                  Make yourself at home. <Key>K</Key> finds anything.
                </p>
                <button
                  onClick={() => useUiStore.getState().endFirstSteps()}
                  className="pointer-events-auto mt-4 px-5 h-9 rounded-lg text-[13px] font-semibold"
                  /* Filled rather than tinted: it is the one button on the one
                     card that is a handover. The ink is fixed dark because every
                     room theme's accent is a light one (#ffb27a · #7fc8d8 ·
                     #a8b8e8 · #b07d4a), and there is no token for text on top
                     of the accent. */
                  style={{ background: "var(--accent)", color: "#17151b" }}
                >
                  Start
                </button>
              </div>
            )}

            {step !== "done" && (
              <div className="flex items-center justify-between mt-2.5">
                <Dots index={step === "add" ? 0 : step === "tidy" ? 1 : 2} />
                <button
                  onClick={() => useUiStore.getState().endFirstSteps()}
                  className="t-faint hover:t-ink pointer-events-auto flex items-center gap-1 text-[11px] px-2 h-6 rounded-md"
                >
                  <X size={11} />
                  Skip the tour
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
