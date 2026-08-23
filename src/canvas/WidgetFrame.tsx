import React, { useRef } from 'react';
import { LogOut, Maximize2, Minimize2, X } from 'lucide-react';
import { getCamera, useSpaceStore, useWidget } from '../stores/spaceStore';
import { Rect, useUiStore } from '../stores/uiStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

export const HEADER_HEIGHT = 40;
// How far a widget's content may be magnified by dragging the frame. Below 1 it
// shrinks with the frame, so a widget pulled small stays whole instead of clipping.
const MIN_CONTENT_SCALE = 0.5;
const MAX_CONTENT_SCALE = 3;
// Above every other widget, below the app's own chrome.
const MAXIMIZED_Z = 9000;

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
 * `fullRect` (set only while maximised) overrides that box with one covering the
 * whole canvas. The widget is not moved in the tree, so its content — a browser
 * widget's live page included — survives the change. Its `scale` undoes the
 * camera zoom so the maximised widget is drawn 1:1 with the screen.
 */
export const WidgetFrame: React.FC<{ id: string; fullRect?: Rect & { scale: number } }> = ({
  id,
  fullRect,
}) => {
  const widget = useWidget(id);
  // An app widget with its real window on it needs a way to send that window back
  // out: the window covers the widget, so nothing in the body can be clicked.
  const isAppOpen = useUiStore((s) => s.openAppIds.includes(id)) && widget.type === 'app';
  const isSelected = useUiStore((s) => s.selectedIds.includes(id));
  const isAltHeld = useUiStore((s) => s.isAltHeld);
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number; mode: 'move' | 'resize' } | null>(
    null
  );

  const entry = WIDGET_REGISTRY[widget.type];
  const Body = entry.Component;

  const box = fullRect ?? widget;
  const bodyHeight = box.height - HEADER_HEIGHT;
  const contentScale =
    // A browser and a web app show a real page; an app widget is only a label for
    // a real window. All three lay themselves out, so magnifying them just blurs
    // them.
    widget.type === 'browser' || widget.type === 'app' || widget.type === 'webapp'
      ? 1
      : Math.min(
          MAX_CONTENT_SCALE,
          Math.max(MIN_CONTENT_SCALE, box.width / entry.defaultSize.width)
        );

  const startGesture = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (fullRect) return; // A maximised widget has nowhere to be dragged to.
    if (e.shiftKey) return; // ⇧-drag is the canvas drawing a selection band.
    e.stopPropagation();
    e.preventDefault();
    drag.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY, mode };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;

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
      }
    } else {
      resizeWidget(id, current.width + dx, current.height + dy);
    }
    gesture.lastX = e.clientX;
    gesture.lastY = e.clientY;
  };

  const endGesture = (e: React.PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return (
    <div
      /* no-drag: a widget sitting under the window's top drag strip must move
         itself when its header is dragged, not the whole window (App.tsx). */
      className={`widget-glass no-drag absolute rounded-2xl overflow-hidden ${
        isAltHeld ? 'alt-pick' : ''
      } ${isSelected ? 'widget-selected' : ''}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: fullRect ? MAXIMIZED_Z : widget.z,
        ...(fullRect && {
          transform: `scale(${fullRect.scale})`,
          transformOrigin: 'top left',
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
        className={`widget-header group h-10 flex items-center px-3 gap-2 select-none ${
          fullRect ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        onDoubleClick={() => useUiStore.getState().toggleMaximized(id)}
        onPointerDown={(e) => startGesture(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <entry.icon size={14} style={{ color: 'var(--ink-soft)' }} />
        <span className="text-xs tracking-wide" style={{ color: 'var(--ink)' }}>
          {entry.label}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          {fullRect && (
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
          <HeaderButton
            onClick={() => useUiStore.getState().toggleMaximized(id)}
            label={fullRect ? 'Restore' : 'Fill the canvas'}
          >
            {fullRect ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </HeaderButton>
          <HeaderButton
            onClick={() => useSpaceStore.getState().removeWidget(id)}
            label="Remove"
            danger
          >
            <X size={14} />
          </HeaderButton>
        </div>
      </div>

      {/* Dragging a widget bigger magnifies what is inside it rather than handing
          the same content more room: a memo at twice the size is meant to be twice
          as readable. The browser is the exception — a real page lays itself out
          again for the space it is given, and scaling it would fight that. */}
      <div className="w-full overflow-hidden" style={{ height: bodyHeight }}>
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

      {!fullRect && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onPointerDown={(e) => startGesture(e, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
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
