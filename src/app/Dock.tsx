import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightLeft,
  Circle,
  Columns3,
  Copy,
  Layers,
  LayoutGrid,
  Minus,
  MoreHorizontal,
  PanelTop,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { autoColumns } from '../canvas/layout';
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
      danger ? 'hover:!text-red-400' : ''
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

/** How the picked widgets get laid out. */
const ArrangeMenu: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const columnsForAuto = useSpaceStore((s) => {
    const widgets = Object.values(s.spaces[s.activeSpaceId]?.widgets ?? {});
    return widgets.length ? autoColumns(widgets, canvasArea()) : 1;
  });
  const run = (mode: 'grid' | 'focus' | 'cascade', columns?: number) => {
    useSpaceStore.getState().arrangeWidgets(mode, columns);
    onDone();
  };

  return (
    <>
      <div className="fixed inset-0 z-[89]" onClick={onDone} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="glass-panel absolute bottom-full right-0 mb-3 z-[90] w-52 p-2 rounded-surface"
      >
        <div className="t-soft px-2 pt-1 pb-2 text-micro font-semibold uppercase tracking-[0.14em]">
          Columns
        </div>

        <button
          onClick={() => run('grid')}
          className="row w-full flex items-center gap-3 px-2 py-2 rounded-control"
        >
          <span
            className="grid gap-[2px] w-6"
            style={{ gridTemplateColumns: `repeat(${columnsForAuto}, 1fr)` }}
          >
            {Array.from({ length: columnsForAuto * 2 }, (_, i) => (
              <span key={i} className="h-[4px] rounded-[1px] bg-current opacity-60" />
            ))}
          </span>
          <span className="flex-1 text-left text-ui font-medium">Auto</span>
          <span className="t-soft text-micro">{columnsForAuto} wide</span>
        </button>

        <div className="grid grid-cols-5 gap-1 px-1 pt-1">
          {COLUMN_CHOICES.map((columns) => (
            <button
              key={columns}
              onClick={() => run('grid', columns)}
              title={`${columns} column${columns > 1 ? 's' : ''}`}
              className="chrome-button h-8 flex items-center justify-center rounded-control text-ui font-medium font-mono tabular-nums"
            >
              {columns}
            </button>
          ))}
        </div>

        <div className="bg-hair my-1 h-px" />

        <button
          onClick={() => run('focus')}
          className="row w-full flex items-center gap-3 px-2 py-2 rounded-control"
        >
          <PanelTop size={15} />
          <span className="flex-1 text-left text-ui font-medium">Focus</span>
          <span className="t-soft text-micro">Last two big</span>
        </button>
        <button
          onClick={() => run('cascade')}
          className="row w-full flex items-center gap-3 px-2 py-2 rounded-control"
        >
          <Layers size={15} />
          <span className="flex-1 text-left text-ui font-medium">Cascade</span>
          <span className="t-soft text-micro">Overlapping</span>
        </button>
      </motion.div>
    </>
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

/** Everything that acts on a selection but is not Arrange. */
const MoreMenu: React.FC<{ selectedIds: string[]; onDone: () => void }> = ({
  selectedIds,
  onDone,
}) => {
  const isMoveMenuOpen = useUiStore((s) => s.isMoveMenuOpen);
  const [isColourOpen, setIsColourOpen] = useState(false);
  const store = () => useSpaceStore.getState();

  const Row: React.FC<{
    icon: React.ReactNode;
    label: string;
    hint?: string;
    danger?: boolean;
    on?: boolean;
    onClick: () => void;
  }> = ({ icon, label, hint, danger, on, onClick }) => (
    <button
      onClick={onClick}
      className={`row w-full flex items-center gap-3 px-2 py-2 rounded-control ${
        danger ? 'hover:!text-red-400' : ''
      } ${on ? 'row-on' : ''}`}
    >
      {icon}
      <span className="flex-1 text-left text-ui font-medium">{label}</span>
      {hint && <span className="t-soft text-micro">{hint}</span>}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[88]" onClick={onDone} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="glass-panel absolute bottom-full left-1/2 mb-3 -translate-x-1/2 z-[90] w-56 p-2 rounded-surface"
      >
        <div className="relative">
          <Row
            icon={<ArrowRightLeft size={15} />}
            label="Move to space"
            on={isMoveMenuOpen}
            onClick={() => {
              const ui = useUiStore.getState();
              if (ui.isMoveMenuOpen) ui.closeMoveMenu();
              else ui.openMoveMenu();
            }}
          />
          <AnimatePresence>
            {isMoveMenuOpen && <MoveMenu selectedIds={selectedIds} />}
          </AnimatePresence>
        </div>
        <Row
          icon={<Columns3 size={15} />}
          label="Put in a column"
          onClick={() => {
            store().groupIntoColumn(selectedIds);
            onDone();
          }}
        />
        <div className="relative">
          <Row
            icon={<Circle size={15} />}
            label="Colour mark"
            on={isColourOpen}
            onClick={() => setIsColourOpen((o) => !o)}
          />
          <AnimatePresence>
            {isColourOpen && (
              <ColourMenu selectedIds={selectedIds} onDone={() => setIsColourOpen(false)} />
            )}
          </AnimatePresence>
        </div>
        <Row
          icon={<Copy size={15} />}
          label="Duplicate"
          hint="⌘D"
          onClick={() => {
            store().duplicateWidgets(selectedIds);
            onDone();
          }}
        />
        <div className="bg-hair my-1 h-px" />
        <Row
          icon={<Trash2 size={15} />}
          label="Close them"
          danger
          onClick={() => {
            store().removeWidgets(selectedIds);
            onDone();
          }}
        />
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const count = selectedIds.length;

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
              title="Arrange (G, or ⌥G inside a page)"
              data-first-step="tidy"
              className="btn-primary flex items-center gap-1.5 px-2.5 h-8 rounded-control text-meta"
            >
              <LayoutGrid size={15} />
              Arrange
            </button>
            <AnimatePresence>
              {isArrangeOpen && <ArrangeMenu onDone={() => setIsArrangeOpen(false)} />}
            </AnimatePresence>
          </div>

          <div className="relative shrink-0">
            <Btn label="More" on={isMoreOpen} onClick={() => setIsMoreOpen((o) => !o)}>
              <MoreHorizontal size={15} />
            </Btn>
            <AnimatePresence>
              {isMoreOpen && (
                <MoreMenu selectedIds={selectedIds} onDone={() => setIsMoreOpen(false)} />
              )}
            </AnimatePresence>
          </div>

          <Btn label="Drop the selection (Esc)" onClick={useUiStore.getState().clearSelection}>
            <X size={15} />
          </Btn>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** The zoom and framing, in the rail. They belong to the canvas, not a selection. */
export const CanvasTools: React.FC = () => {
  const zoom = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera.zoom ?? 1);
  return (
    <>
      <button
        onClick={() => zoomBy(STEP)}
        title="Zoom in"
        aria-label="Zoom in"
        className="rail-tool"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={useSpaceStore.getState().fitToWidgets}
        title={`${Math.round(zoom * 100)}% - frame every widget (F)`}
        aria-label="Frame every widget"
        className="rail-tool text-micro font-mono tabular-nums"
      >
        {Math.round(zoom * 100)}
      </button>
      <button
        onClick={() => zoomBy(1 / STEP)}
        title="Zoom out"
        aria-label="Zoom out"
        className="rail-tool"
      >
        <Minus size={16} />
      </button>
    </>
  );
};
