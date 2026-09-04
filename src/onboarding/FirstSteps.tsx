import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { canvasArea, useUiStore } from "../stores/uiStore";

/**
 * The two moves the app never shows on screen: bringing a widget out of the
 * canvas, and tidying up. Taught once, after the first run, by pointing at the
 * place each one happens rather than by naming it in a line at the bottom of the
 * window — a line has to be matched to the screen by the reader, and the widget
 * palette that used to stand for the first move is gone from the sidebar.
 *
 * It points and waits. Nothing is blocked, nothing is clicked for the user, and
 * the pointer goes straight through to the canvas underneath — the ring is the
 * spot to double-click, not a picture of one.
 */

/** Room for the ring itself, kept clear of the edges of the view. */
const MARGIN = 80;
/** How long the last word stays before it fades on its own. */
const DONE_MS = 2600;

type Point = { x: number; y: number };

/**
 * A spot where a double-click really does open the palette: the canvas takes one
 * only when nothing is under the pointer, so the test is what `elementFromPoint`
 * hands back, not how far the widgets are. Nothing, when the space is covered.
 */
function clearSpot(): Point | null {
  const area = canvasArea();
  const viewport = document.querySelector("[data-canvas-viewport]");
  if (!viewport) return null;
  const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const near = (p: Point) => Math.hypot(p.x - centre.x, p.y - centre.y);

  let best: Point | null = null;
  for (let y = area.y + MARGIN; y < area.y + area.height - MARGIN; y += 20) {
    for (let x = area.x + MARGIN; x < area.x + area.width - MARGIN; x += 20) {
      const p = { x, y };
      if (document.elementFromPoint(x, y) !== viewport) continue;
      if (!best || near(p) < near(best)) best = p;
    }
  }
  return best;
}

/** Where the Arrange button is, so the second step can circle the real one. */
function arrangeSpot(): Point | null {
  const el = document.querySelector('[data-first-step="tidy"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
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

/** Two dots: which move this is, and that there are only two of them. */
const Dots: React.FC<{ index: number }> = ({ index }) => (
  <span className="flex items-center gap-1">
    {[0, 1].map((i) => (
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
  const [at, setAt] = useState<Point | null>(null);

  // Worked out when the step starts, and again if the window changes shape: the
  // ring points at a place on the screen, and the screen can move under it.
  useEffect(() => {
    if (!step || step === "done") {
      setAt(null);
      return;
    }
    const find = () => setAt(step === "add" ? clearSpot() : arrangeSpot());
    find();
    window.addEventListener("resize", find);
    return () => window.removeEventListener("resize", find);
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
  const ringSize = step === "add" ? 96 : 64;
  const below = at ? at.y < window.innerHeight / 2 : true;
  const CARD_WIDTH = 300;
  // The placing is on this wrapper rather than on the card: the card's own
  // transform belongs to the animation, and a second one would overwrite it.
  const place: React.CSSProperties =
    at && step !== "done"
      ? {
          left: Math.min(
            Math.max(at.x - CARD_WIDTH / 2, 12),
            window.innerWidth - CARD_WIDTH - 12,
          ),
          top: below ? at.y + ringSize / 2 + 18 : undefined,
          bottom: below
            ? undefined
            : window.innerHeight - (at.y - ringSize / 2 - 18),
        }
      : { left: "50%", bottom: 80, marginLeft: -CARD_WIDTH / 2 };

  return (
    <div className="fixed inset-0 z-[92] pointer-events-none">
      <AnimatePresence>
        {at && step !== "done" && <Ring key={step} at={at} size={ringSize} />}
      </AnimatePresence>

      <div className="absolute" style={{ ...place, width: CARD_WIDTH }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-panel px-4 py-3 rounded-2xl shadow-2xl"
          >
            {step === "add" && (
              <>
                <p className="t-ink text-[13px] font-medium mb-1">
                  “{spaceName}” is yours.
                </p>
                <p className="t-soft text-xs leading-relaxed">
                  Double-click the ring — that is how anything comes out onto
                  the desk.
                </p>
              </>
            )}

            {step === "tidy" && (
              <>
                <p className="t-ink text-[13px] font-medium mb-1">One more.</p>
                <p className="t-soft text-xs leading-relaxed">
                  Press <Key>G</Key> to tidy the desk up, or click Arrange.
                </p>
              </>
            )}

            {step === "done" && (
              <p className="t-ink text-[13px] flex items-center gap-2">
                <Check size={14} className="t-accent" />
                That is the whole of it.{" "}
                <span className="t-soft">
                  <Key>F</Key> fits everything on screen.
                </span>
              </p>
            )}

            {step !== "done" && (
              <div className="flex items-center justify-between mt-2.5">
                <Dots index={step === "add" ? 0 : 1} />
                <button
                  onClick={() => useUiStore.getState().endFirstSteps()}
                  className="t-faint hover:t-ink pointer-events-auto flex items-center gap-1 text-[11px] px-1.5 h-6 rounded-md"
                >
                  <X size={11} />
                  Skip
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
