import React, { useRef } from 'react';
import { Maximize2, Minimize2, PictureInPicture2, X } from 'lucide-react';
import { getCamera, useSpaceStore, useWidget } from '../stores/spaceStore';
import { Rect, useUiStore } from '../stores/uiStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

const HEADER_HEIGHT = 32;
// Above every other widget, below the app's own chrome.
const MAXIMIZED_Z = 9000;

/**
 * A widget box positioned in world coordinates. It lives inside the scaled world
 * container, so its own CSS px are world units — screen drag deltas must be
 * divided by the camera zoom.
 *
 * `fullRect` (set only while maximised) overrides that box with one covering the
 * whole canvas. The widget is not moved in the tree, so its content — a browser
 * widget's live page included — survives the change.
 */
export const WidgetFrame: React.FC<{ id: string; fullRect?: Rect }> = ({ id, fullRect }) => {
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
      className="absolute rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-2xl overflow-hidden"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: fullRect ? MAXIMIZED_Z : widget.z,
      }}
      onPointerDownCapture={() => useSpaceStore.getState().bringToFront(id)}
    >
      <div
        className={`group h-8 flex items-center px-3 gap-2 bg-white/10 border-b border-white/10 select-none ${
          fullRect ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        onDoubleClick={() => useUiStore.getState().toggleMaximized(id)}
        onPointerDown={(e) => startGesture(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <entry.icon size={12} className="text-white/50" />
        <span className="text-xs text-white/70">{entry.label}</span>

        <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => useUiStore.getState().toggleMaximized(id)}
            title={fullRect ? 'Restore (Esc)' : 'Fill the canvas'}
            className="p-1 rounded text-white/50 hover:text-white transition-colors"
          >
            {fullRect ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => useUiStore.getState().enterMini(id)}
            title="Float on top"
            className="p-1 rounded text-white/50 hover:text-white transition-colors"
          >
            <PictureInPicture2 size={12} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => useSpaceStore.getState().removeWidget(id)}
            title="Remove"
            className="p-1 -mr-1 rounded text-white/50 hover:text-red-300 transition-colors"
          >
            <X size={12} />
          </button>
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
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/40" />
        </div>
      )}
    </div>
  );
};
