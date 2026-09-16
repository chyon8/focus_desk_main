import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightLeft,
  Check,
  Circle,
  Columns3,
  Copy,
  Kanban,
  LayoutDashboard,
  LayoutGrid,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { ArrangeMode } from '../canvas/layout';
import { MAX_ZOOM, zoomCameraAt } from '../canvas/camera';
import { getMinZoom, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, RAIL_WIDTH, useUiStore } from '../stores/uiStore';
import { WIDGET_COLORS, WIDGET_COLOR_NAMES } from '../widgets/widgetColors';
import { MoveMenu } from './MoveMenu';

const COLUMN_CHOICES = [1, 2, 3, 4, 5];
/** One press of + or -. The wheel uses its own, finer step. */
const STEP = 1.2;

const Btn: React.FC<{
  label: string;
  on?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, on, danger, disabled, onClick, children }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={on}
    disabled={disabled}
    className={`chrome-button flex items-center gap-1.5 px-2 h-8 rounded-control text-meta font-medium disabled:opacity-40 ${
      danger ? 't-danger' : ''
    } ${on ? 'row-on' : ''}`}
  >
    {children}
  </button>
);

const Sep = () => <span className="bg-hair self-stretch my-1 w-px" />;

/** Zooms about the middle of the canvas, which is what the eye is on. */
function zoomBy(factor: number) {
  const store = useSpaceStore.getState();
  const camera = store.spaces[store.activeSpaceId]?.camera;
  if (!camera) return;
  const area = canvasArea();
  const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const next = Math.min(MAX_ZOOM, Math.max(getMinZoom(), camera.zoom * factor));
  store.setCamera(zoomCameraAt(camera, centre, next));
}

/** What each arrange is called, and the icon that stands for it on the buttons. */
const MODES: Record<ArrangeMode, { name: string; note: string; Icon: typeof LayoutGrid }> = {
  grid: { name: 'Grid', note: 'Rows line up', Icon: LayoutGrid },
  stack: { name: 'Stack', note: 'Even columns, in order', Icon: Kanban },
  masonry: { name: 'Masonry', note: 'Packed by height', Icon: LayoutDashboard },
};

/**
 * The arrange this space was given last: what G repeats, and what the buttons
 * show. Nothing yet means the Auto grid, as it did before.
 */
function useCurrentArrange() {
  return useSpaceStore((s) => s.spaces[s.activeSpaceId]?.arrange) ?? { mode: 'grid' as const };
}

function arrangeLabel(mode: ArrangeMode) {
  return `Arrange: ${MODES[mode].name} (G, or ⌥G inside a page)`;
}

/**
 * How the widgets get laid out. `className` places it: above the dock button, or
 * beside the rail button.
 */
const ArrangeMenu: React.FC<{ className: string; onDone: () => void }> = ({
  className,
  onDone,
}) => {
  const current = useCurrentArrange();
  const run = (mode: ArrangeMode, columns?: number) => {
    useSpaceStore.getState().arrangeWidgets(mode, columns);
    onDone();
  };

  // Auto saves no count, so G works the count out again for whatever is on the
  // desk then. A number is kept until another is picked.
  const counts: { columns?: number; label: string; title: string }[] = [
    { label: 'Auto', title: 'Pick the count each time' },
    ...COLUMN_CHOICES.map((columns) => ({
      columns,
      label: String(columns),
      title: `${columns} column${columns > 1 ? 's' : ''}`,
    })),
  ];

  return (
    <>
      <div className="fixed inset-0 z-[89]" onClick={onDone} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={`glass-panel absolute z-[90] w-56 p-2 rounded-surface ${className}`}
      >
        {(Object.keys(MODES) as ArrangeMode[]).map((mode) => {
          const { name, note, Icon } = MODES[mode];
          return (
            <button
              key={mode}
              onClick={() => run(mode)}
              aria-pressed={current.mode === mode}
              className="row w-full flex items-center gap-3 px-2 py-2 rounded-control"
            >
              <Icon size={15} />
              <span className="flex-1 flex items-center gap-1.5 text-left text-ui font-medium">
                {name}
                {current.mode === mode && <Check size={12} className="t-soft" />}
              </span>
              <span className="t-soft text-micro">{note}</span>
            </button>
          );
        })}

        <div className="bg-hair my-1 h-px" />
        <div className="t-soft px-2 pt-1 pb-2 text-micro font-semibold uppercase tracking-[0.14em]">
          Columns
        </div>
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 px-1 pb-1">
          {counts.map(({ columns, label, title }) => (
            <button
              key={label}
              onClick={() => run(current.mode, columns)}
              title={title}
              aria-pressed={current.columns === columns}
              className={`chrome-button h-8 px-2 flex items-center justify-center rounded-control text-ui font-medium tabular-nums ${
                columns ? 'font-mono' : ''
              } ${current.columns === columns ? 'row-on' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};

/**
 * The arrange button in the rail, above the zoom. The dock's one only shows while
 * something is selected, so without this the whole desk could be arranged with G
 * and nothing else. It sits with the zoom because both act on the whole canvas,
 * but not inside the zoom's menu: that one is the view, and this moves widgets.
 */
export const ArrangeTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { mode } = useCurrentArrange();
  const { Icon } = MODES[mode];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        title={arrangeLabel(mode)}
        aria-label={arrangeLabel(mode)}
        aria-pressed={isOpen}
        className={`rail-tool ${isOpen ? 'rail-tool-on' : ''}`}
      >
        <Icon size={18} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <ArrangeMenu className="bottom-0 left-full ml-3" onDone={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

/** A mark says which widgets are one job. */
const ColourMenu: React.FC<{ selectedIds: string[]; onDone: () => void }> = ({
  selectedIds,
  onDone,
}) => {
  const set = (colour: string | null) => {
    useSpaceStore.getState().colorWidgets(selectedIds, colour);
    onDone();
  };
  return (
    <>
      <div className="fixed inset-0 z-[89]" onClick={onDone} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="glass-panel absolute bottom-full left-1/2 mb-3 -translate-x-1/2 z-[90] p-2 rounded-surface"
      >
        <div className="flex items-center gap-1.5">
          {WIDGET_COLOR_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => set(name)}
              title={name}
              style={{ '--mark': WIDGET_COLORS[name] } as React.CSSProperties}
              className="mark-swatch w-7 h-7 rounded-control active:scale-90 transition-transform"
            />
          ))}
          <button
            onClick={() => set(null)}
            title="No mark"
            className="chrome-button w-7 h-7 flex items-center justify-center rounded-control"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

/**
 * One place for everything that acts on the canvas: the zoom, the framing, and
 * what to do with whatever is picked out. It used to be three - the sidebar's
 * tool grid, the selection bar, and the widget header - so the answer to "where
 * is that control" depended on what was selected.
 *
 * The dock is centred on the canvas rather than the window, so the rail does not
 * push it off-centre.
 */
export const Dock: React.FC = () => {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const isRailOpen = useUiStore((s) => s.isSidebarOpen);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);
  const [isArrangeOpen, setIsArrangeOpen] = useState(false);
  const [isColourOpen, setIsColourOpen] = useState(false);
  const isMoveMenuOpen = useUiStore((s) => s.isMoveMenuOpen);
  const count = selectedIds.length;
  const arrangeMode = useCurrentArrange().mode;
  const ArrangeIcon = MODES[arrangeMode].Icon;

  return (
    <AnimatePresence>
      {count > 0 && !isMaximized && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          /* The first run lights this whole plate rather than the Arrange button
             alone: the button opens a menu above itself, and a hole cut to the
             button would leave that menu in the dark. */
          data-first-step-area="tidy"
          className="glass-panel fixed bottom-4 z-[96] flex items-center gap-1 p-1.5 rounded-surface"
          style={{
            left: `calc(50% + ${(isRailOpen ? RAIL_WIDTH : 0) / 2}px)`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="t-soft shrink-0 px-2 text-ui whitespace-nowrap">{count} selected</span>

          <div className="relative shrink-0">
            <button
              onClick={() => setIsArrangeOpen((o) => !o)}
              title={arrangeLabel(arrangeMode)}
              data-first-step="tidy"
              className="btn-primary flex items-center gap-1.5 px-2.5 h-8 rounded-control text-meta"
            >
              <ArrangeIcon size={15} />
              Arrange
            </button>
            <AnimatePresence>
              {isArrangeOpen && (
                <ArrangeMenu
                  className="bottom-full right-0 mb-3"
                  onDone={() => setIsArrangeOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* 선택에 거는 동작은 한 줄에 다 편다. ⋯ 하나로 접으면 무엇을 할 수 있는지
              열어봐야 알고, 색·정렬처럼 여러 개에 연달아 거는 것이 매번 두 번 클릭이 된다. */}
          <div className="relative shrink-0">
            <Btn
              label="Move to another space"
              on={isMoveMenuOpen}
              onClick={() => {
                const ui = useUiStore.getState();
                if (ui.isMoveMenuOpen) ui.closeMoveMenu();
                else ui.openMoveMenu();
              }}
            >
              <ArrowRightLeft size={15} />
            </Btn>
            <AnimatePresence>
              {isMoveMenuOpen && <MoveMenu selectedIds={selectedIds} />}
            </AnimatePresence>
          </div>

          <Btn
            label="Put them in a column"
            onClick={() => useSpaceStore.getState().groupIntoColumn(selectedIds)}
          >
            <Columns3 size={15} />
          </Btn>

          <div className="relative shrink-0">
            <Btn label="Colour mark" on={isColourOpen} onClick={() => setIsColourOpen((o) => !o)}>
              <Circle size={15} />
            </Btn>
            <AnimatePresence>
              {isColourOpen && (
                <ColourMenu selectedIds={selectedIds} onDone={() => setIsColourOpen(false)} />
              )}
            </AnimatePresence>
          </div>

          <Btn
            label="Duplicate (⌘D)"
            onClick={() => useSpaceStore.getState().duplicateWidgets(selectedIds)}
          >
            <Copy size={15} />
          </Btn>

          <Btn
            label="Close them"
            danger
            onClick={() => useSpaceStore.getState().removeWidgets(selectedIds)}
          >
            <Trash2 size={15} />
          </Btn>

          <div className="bg-hair mx-0.5 h-5 w-px shrink-0" />

          <Btn label="Drop the selection (Esc)" onClick={useUiStore.getState().clearSelection}>
            <X size={15} />
          </Btn>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** The zoom and framing controls live behind one view button in the rail. */
export const CanvasTools: React.FC = () => {
  const zoom = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera.zoom ?? 1);
  const [isOpen, setIsOpen] = useState(false);
  const percent = Math.round(zoom * 100);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        title={`View: ${percent}%`}
        aria-label="View controls"
        aria-pressed={isOpen}
        className="rail-tool text-micro font-mono tabular-nums"
      >
        {percent}
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[89]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="glass-panel absolute bottom-0 left-full z-[90] ml-3 w-44 p-2 rounded-surface"
            >
              <div className="t-soft px-2 pt-1 pb-2 text-micro font-semibold uppercase tracking-[0.14em]">
                View
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => zoomBy(1 / STEP)}
                  title="Zoom out"
                  className="chrome-button h-8 flex items-center justify-center rounded-control"
                >
                  <Minus size={15} />
                </button>
                <span className="flex items-center justify-center text-meta font-mono tabular-nums">
                  {percent}%
                </span>
                <button
                  onClick={() => zoomBy(STEP)}
                  title="Zoom in"
                  className="chrome-button h-8 flex items-center justify-center rounded-control"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                onClick={() => {
                  useSpaceStore.getState().fitToWidgets();
                  setIsOpen(false);
                }}
                className="row mt-1 w-full flex items-center justify-between px-2 py-2 rounded-control text-left text-ui"
              >
                Frame every widget <span className="t-soft">F</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
