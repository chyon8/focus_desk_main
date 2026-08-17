import React, { useRef } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { getCamera, useSpaceStore, useWidget } from '../stores/spaceStore';
import { Rect, useUiStore } from '../stores/uiStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

const HEADER_HEIGHT = 40;
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
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number; mode: 'move' | 'resize' } | null>(
    null
  );

  const entry = WIDGET_REGISTRY[widget.type];
  const Body = entry.Component;

  const box = fullRect ?? widget;

  const startGesture = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (fullRect) return; // A maximised widget has nowhere to be dragged to.
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
      moveWidget(id, current.x + dx, current.y + dy);
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
      className="widget-glass no-drag absolute rounded-2xl overflow-hidden"
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
      onPointerDownCapture={() => useSpaceStore.getState().bringToFront(id)}
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

      <div className="w-full" style={{ height: box.height - HEADER_HEIGHT }}>
        <Body id={id} />
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
