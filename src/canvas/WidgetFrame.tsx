import React, { useRef, useState } from 'react';
import { Copy, LogOut, Maximize2, Palette, PanelLeft, Volume2, X } from 'lucide-react';
import { hostOf } from '../widgets/browserAddress';
import { getCamera, useSpaceStore, useWidget } from '../stores/spaceStore';
import { screenToWorld } from './camera';
import type { BrowserData, ColumnData } from '../spaces/types';
import { canvasArea, Rect, useUiStore } from '../stores/uiStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { colorOf } from '../widgets/widgetColors';

export const HEADER_HEIGHT = 40;
// How far a widget's content may be magnified by dragging the frame. Below 1 it
// shrinks with the frame, so a widget pulled small stays whole instead of clipping.
const MIN_CONTENT_SCALE = 0.5;
const MAX_CONTENT_SCALE = 3;
// Above every other widget, below the app's own chrome.
const MAXIMIZED_Z = 9000;
/** A card opened where it stands: above the canvas, below a maximised widget. */
export const PEEK_Z = 8000;
// macOS draws the window buttons at 10,10, which is inside a maximised widget's
// header. The header's icon and title step aside for them — unless the sidebar
// is open, in which case it is holding that corner and the widget starts to its
// right.
const TRAFFIC_LIGHTS_WIDTH = 78;

/**
 * The column slot the pointer is over, in world units.
 *
 * The world container starts at the canvas area's left edge and at the top of
 * the window, so that is what the pointer is measured from. Shared by the live
 * indicator and the drop itself — two readings would eventually disagree, and a
 * line that lies about where the thing lands is worse than no line.
 */
export function pointedColumn(id: string, e: { clientX: number; clientY: number }) {
  const area = canvasArea();
  const at = screenToWorld(getCamera(), { x: e.clientX - area.x, y: e.clientY });
  return useSpaceStore.getState().columnSlotAt(id, at);
}

/** 28px hit area: the old 12px icons were both hard to see and hard to hit. */
const HeaderButton: React.FC<{
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, danger, onClick, children }) => (
  <button
    title={label}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={onClick}
    className={`chrome-button w-7 h-7 flex items-center justify-center rounded-md ${
      danger ? 'hover:!text-red-300' : ''
    }`}
  >
    {children}
  </button>
);

/**
 * A widget box positioned in world coordinates. It lives inside the scaled world
 * container, so its own CSS px are world units — screen drag deltas must be
 * divided by the camera zoom.
 *
 * `overlay` overrides that box with one the canvas worked out in screen pixels:
 * the whole canvas for a maximised widget, a panel beside its column for a card
 * opened where it stands. Either way the widget is not moved in the tree, so its
 * content — a browser widget's live page included — survives the change, and the
 * `scale` undoes the camera zoom so the result is drawn 1:1 with the screen.
 */
export type FrameOverlay = Rect & { scale: number; kind: 'full' | 'peek' };

export const WidgetFrame: React.FC<{ id: string; overlay?: FrameOverlay }> = ({
  id,
  overlay,
}) => {
  const widget = useWidget(id);
  // An app widget with its real window on it needs a way to send that window back
  // out: the window covers the widget, so nothing in the body can be clicked.
  const isAppOpen = useUiStore((s) => s.openAppIds.includes(id)) && widget.type === 'app';
  const isSelected = useUiStore((s) => s.selectedIds.includes(id));
  const isLastActive = useUiStore((s) => s.lastActiveId === id);
  const isAltHeld = useUiStore((s) => s.isAltHeld);
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  // Only for the sound button this header grows while maximised. A boolean, so
  // moving a slider does not re-render every frame on the canvas.
  const isAmbiencePlaying = useSpaceStore((s) => {
    const a = s.spaces[s.activeSpaceId]?.ambience;
    return !!a && a.rain + a.fire + a.cafe > 0;
  });
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number; mode: 'move' | 'resize' } | null>(
    null
  );
  /** A column's header turns into a name field on a double-click, and back on the way out. */
  const [isNaming, setIsNaming] = useState(false);
  /** Maximised. The other overlay — a peek — is a panel, and keeps an ordinary header. */
  const isFull = overlay?.kind === 'full';
  /** This column is where the widget being dragged would land. */
  const isDropTarget = useUiStore((s) => s.dropTarget?.columnId === id);
  /**
   * This widget is being dragged, and it is over a column. A dragged widget is
   * brought to the front, so it covers the very column it is being dropped into
   * — the ring and the line were both drawn underneath it and neither could be
   * seen. Fading it is also the answer to "what happens if I let go here".
   */
  const isOverColumn = useUiStore((s) => s.draggingWidgetId === id && s.dropTarget !== null);

  const entry = WIDGET_REGISTRY[widget.type];
  const Body = entry.Component;

  const mark = colorOf(widget.color);
  const isMarked = !!mark && !isFull;

  // A browser widget's header shows the page it is on. Open three of them and the
  // registry's fixed "Browser" label with a globe makes all three look the same.
  const page = widget.type === 'browser' ? (widget.data as Partial<BrowserData>) : null;
  const columnTitle =
    widget.type === 'column' ? (widget.data as Partial<ColumnData>).title : undefined;
  const label =
    columnTitle || (page && (page.title || (page.url && hostOf(page.url)))) || entry.label;

  const box = overlay ?? widget;
  const bodyHeight = box.height - HEADER_HEIGHT;
  const contentScale =
    // A browser and a web app show a real page; an app widget is only a label for
    // a real window. All three lay themselves out, so magnifying them just blurs
    // them.
    widget.type === 'browser' ||
    widget.type === 'app' ||
    widget.type === 'webapp' ||
    // A column's rows are a fixed height that its own box is measured from —
    // magnifying the body would leave the cards a different size from the space
    // the column reserved for them.
    widget.type === 'column'
      ? 1
      : Math.min(
          MAX_CONTENT_SCALE,
          Math.max(MIN_CONTENT_SCALE, box.width / entry.defaultSize.width)
        );

  const startGesture = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (overlay) return; // A widget drawn over the canvas has nowhere to be dragged to.
    if (e.shiftKey) return; // ⇧-drag is the canvas drawing a selection band.
    e.stopPropagation();
    e.preventDefault();
    drag.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY, mode };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    // No button down means the drag ended somewhere this element never heard
    // about: a mouse keeps the same pointer id for every gesture, so a `pointerup`
    // that went astray leaves this one armed and the *next hover* moves the
    // widget — it jumps and chases the cursor without anything being pressed.
    // A pointerup goes astray whenever pointer capture is lost mid-drag: the page
    // inside a browser widget takes the release, or the window goes to the
    // background with the button still down.
    if (e.buttons === 0) {
      drag.current = null;
      return;
    }

    const { zoom } = getCamera();
    const dx = (e.clientX - gesture.lastX) / zoom;
    const dy = (e.clientY - gesture.lastY) / zoom;
    const { moveWidget, resizeWidget, spaces, activeSpaceId } = useSpaceStore.getState();
    const current = spaces[activeSpaceId].widgets[id];

    if (gesture.mode === 'move') {
      // Dragging one of a picked-out group moves the whole group with it.
      const { selectedIds } = useUiStore.getState();
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        useSpaceStore.getState().moveWidgets(selectedIds, dx, dy);
      } else {
        moveWidget(id, current.x + dx, current.y + dy);
        // Say where it would land the whole way, not only once it is let go. A
        // drop that is only decided at the end is a drop the user has to guess
        // at, and guessing wrong means dragging the widget back out again.
        useUiStore.getState().setDraggingWidget(id);
        useUiStore.getState().setDropTarget(pointedColumn(id, e));
      }
    } else {
      resizeWidget(id, current.width + dx, current.height + dy);
    }
    gesture.lastX = e.clientX;
    gesture.lastY = e.clientY;
  };

  const endGesture = (e: React.PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    const el = e.currentTarget as HTMLElement;
    // Releasing a capture that is already gone throws.
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    const wasMove = drag.current.mode === 'move';
    drag.current = null;

    // Where it was let go decides whether it joins a column — the same answer the
    // line under the pointer has been showing all the way through the drag.
    if (wasMove && widget.type !== 'column') {
      const target = pointedColumn(id, e);
      if (target) useSpaceStore.getState().dropIntoColumnAt(id, target.columnId, target.index);
    }
    useUiStore.getState().setDropTarget(null);
    useUiStore.getState().setDraggingWidget(null);
  };

  /** Capture taken away — by a guest page, or by the window losing focus. */
  const onLostCapture = () => {
    drag.current = null;
    useUiStore.getState().setDropTarget(null);
    useUiStore.getState().setDraggingWidget(null);
  };

  return (
    <div
      /* no-drag: a widget sitting under the window's top drag strip must move
         itself when its header is dragged, not the whole window (App.tsx). */
      className={`widget-glass no-drag absolute rounded-2xl overflow-hidden ${
        isMarked ? 'widget-marked' : ''
      } ${isAltHeld ? 'alt-pick' : ''} ${isSelected ? 'widget-selected' : ''} ${
        isDropTarget ? 'widget-drop-target' : ''
      } ${isOverColumn ? 'opacity-40' : ''} ${
        isLastActive && !overlay ? 'widget-last-active' : ''
      }`}
      style={{
        // On the frame, so the header inside it reads the same value.
        ...(isMarked && ({ '--mark': mark } as React.CSSProperties)),
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: overlay ? (isFull ? MAXIMIZED_Z : PEEK_Z) : widget.z,
        ...(overlay && {
          transform: `scale(${overlay.scale})`,
          transformOrigin: 'top left',
          // A panel floating over the canvas has to read as lifted off it, or it
          // is just another widget that happens to be in front.
          boxShadow: isFull ? undefined : '0 24px 60px rgba(0, 0, 0, 0.45)',
        }),
      }}
      onPointerDownCapture={(e) => {
        if (e.shiftKey) return; // Let the canvas band-select over this widget.
        // ⌥-click anywhere on a widget picks it out instead of using it. (Inside a
        // browser widget's page the click never reaches here — its header does.)
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          useUiStore.getState().toggleSelected(id);
          return;
        }
        useSpaceStore.getState().bringToFront(id);
      }}
      /* A picking click must not also press what is under it — ⌥-clicking an app
         widget used to launch the app. */
      onClickCapture={(e) => {
        if (e.altKey || e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div
        /* Not a window drag region while maximised, even though it is where the
           titlebar would be: macOS takes the double-click on one for its own
           zoom, and this header's double-click is how the widget is restored. */
        className={`widget-header group h-10 flex items-center px-3 gap-2 select-none ${
          isMarked ? 'widget-header-marked' : ''
        } ${overlay ? '' : 'cursor-grab active:cursor-grabbing'}`}
        style={isFull && !isSidebarOpen ? { paddingLeft: TRAFFIC_LIGHTS_WIDTH } : undefined}
        /* A column has nothing a full screen would show more of — it is a list
           of cards, and a screen-wide list of 300px cards is the same list with
           a field of empty space beside it. Its header double-click renames it
           instead, which is the thing anyone actually wants from a list header. */
        onDoubleClick={() =>
          widget.type === 'column'
            ? setIsNaming(true)
            : useUiStore.getState().toggleMaximized(id)
        }
        onPointerDown={(e) => startGesture(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onLostPointerCapture={onLostCapture}
      >
        {/* Maximised, this header is the app's top bar: it covers the strip the
            floating buttons sit in, so they move in here. Their panels stay
            where they are and hang under it (AmbienceDock, ThemePicker). */}
        {isFull && !isSidebarOpen && (
          <HeaderButton onClick={() => useUiStore.getState().setSidebarOpen(true)} label="Spaces">
            <PanelLeft size={14} />
          </HeaderButton>
        )}
        {/* A column's name is edited here rather than in its body: a title strip
            under this header was a second row of chrome saying the same thing.
            The count sits beside it, and the rest of the header still drags. */}
        {widget.type === 'column' ? (
          <>
            {/* A header is a handle first: an input sitting in one swallows the
                press and the column cannot be dragged at all. Double-click to
                rename, which is how a name is changed everywhere else. */}
            {isNaming ? (
              <input
                autoFocus
                value={columnTitle ?? ''}
                onChange={(e) =>
                  useSpaceStore.getState().updateWidgetData(id, { title: e.target.value })
                }
                onBlur={() => setIsNaming(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Untitled"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-xs tracking-wide outline-none placeholder:opacity-40"
                style={{ color: 'var(--ink)' }}
              />
            ) : (
              <span
                title="Double-click to rename"
                className="min-w-0 flex-1 truncate text-xs tracking-wide"
                style={{ color: columnTitle ? 'var(--ink)' : 'var(--ink-soft)' }}
              >
                {columnTitle || 'Untitled'}
              </span>
            )}
            <span className="t-faint shrink-0 text-[10px]">
              {(widget.data as unknown as ColumnData).children.length}
            </span>
          </>
        ) : page?.favicon ? (
          <img
            src={page.favicon}
            alt=""
            draggable={false}
            className="shrink-0 w-3.5 h-3.5 rounded-sm object-contain"
          />
        ) : (
          <entry.icon size={14} className="shrink-0" style={{ color: 'var(--ink-soft)' }} />
        )}
        {/* The header narrows to 140px, so a page title has to cut off. The full
            one stays reachable as a tooltip. */}
        {widget.type !== 'column' && (
          <span
            className="text-xs tracking-wide truncate min-w-0"
            title={label}
            style={{ color: 'var(--ink)' }}
          >
            {label}
          </span>
        )}

        <div className="ml-auto shrink-0 flex items-center gap-0.5">
          {isFull && (
            <>
              <HeaderButton
                onClick={() => useUiStore.getState().toggleDock('ambience')}
                label="Ambience"
              >
                <Volume2
                  size={14}
                  style={isAmbiencePlaying ? { color: 'var(--accent)' } : undefined}
                />
              </HeaderButton>
              <HeaderButton onClick={() => useUiStore.getState().toggleDock('theme')} label="Theme">
                <Palette size={14} />
              </HeaderButton>
            </>
          )}
          {isFull && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => useUiStore.getState().clearMaximized()}
              className="chrome-button mr-1 px-2 h-7 rounded-md text-[11px]"
            >
              Esc to restore
            </button>
          )}
          {isAppOpen && (
            <HeaderButton
              onClick={() => useUiStore.getState().closeApp(id)}
              label="Send the window back to its own size"
            >
              <LogOut size={14} />
            </HeaderButton>
          )}
          {/* Only two buttons, and one of them only on hover. A header can be as
              narrow as 140px, where four of them fill the whole bar and get
              pressed by accident. The two that are gone have other ways in:
              double-clicking the header fills the canvas, and moving to another
              space is on the selection bar. */}
          {!overlay && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center">
              <HeaderButton
                onClick={() => useSpaceStore.getState().duplicateWidgets([id])}
                label="Duplicate (⌘D)"
              >
                <Copy size={13} />
              </HeaderButton>
            </div>
          )}
          {/* A peek is a look at a card. Taking the card out of the column is a
              drag, so the only button here is the one a look can turn into —
              filling the screen with it. */}
          {overlay && !isFull && (
            <HeaderButton
              onClick={() => useUiStore.getState().toggleMaximized(id)}
              label="Fill the screen"
            >
              <Maximize2 size={13} />
            </HeaderButton>
          )}
          {/* ✕ closes the panel rather than the card: a look at something must not
              be able to throw it away, and the card is still in its column. */}
          {overlay && !isFull ? (
            <HeaderButton onClick={() => useUiStore.getState().closePeek()} label="Close">
              <X size={14} />
            </HeaderButton>
          ) : (
            <HeaderButton
              onClick={() => useSpaceStore.getState().removeWidget(id)}
              label="Remove"
              danger
            >
              <X size={14} />
            </HeaderButton>
          )}
        </div>
      </div>

      {/* Dragging a widget bigger magnifies what is inside it rather than handing
          the same content more room: a memo at twice the size is meant to be twice
          as readable. The browser is the exception — a real page lays itself out
          again for the space it is given, and scaling it would fight that. */}
      {/* Working in a widget marks it as where you were; grabbing its header to
          move it does not. A browser widget's page swallows the click, so it
          reports itself instead (BrowserWidget). */}
      <div
        className="w-full overflow-hidden"
        style={{ height: bodyHeight }}
        onPointerDownCapture={() => useUiStore.getState().noteActive(id)}
      >
        <div
          style={{
            width: box.width / contentScale,
            height: bodyHeight / contentScale,
            transform: contentScale === 1 ? undefined : `scale(${contentScale})`,
            transformOrigin: 'top left',
          }}
        >
          <Body id={id} />
        </div>
      </div>

      {!overlay && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onPointerDown={(e) => startGesture(e, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onLostPointerCapture={onLostCapture}
        >
          <div
            className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2"
            style={{ borderColor: 'var(--ink-soft)' }}
          />
        </div>
      )}
    </div>
  );
};
