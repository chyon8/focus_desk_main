import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { WIDGET_DRAG_TYPE, WidgetDragPayload } from '../app/WidgetPalette';
import { useSpaceStore } from '../stores/spaceStore';
import { canvasArea, SIDEBAR_WIDTH, useUiStore } from '../stores/uiStore';
import { screenToWorld } from './camera';
import { useCameraControls } from './useCameraControls';
import { useCameraMotion } from './useCameraMotion';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { WidgetFrame } from './WidgetFrame';

export const Canvas: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const camera = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera);
  // A shallow-compared list of ids: each frame subscribes to its own widget, so
  // moving one widget re-renders only that frame.
  const ids = useSpaceStore(
    useShallow((s) => Object.keys(s.spaces[s.activeSpaceId]?.widgets ?? {}))
  );
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const maximizedId = useUiStore((s) => s.maximizedWidgetId);
  const { isSpaceHeld, isPanning } = useCameraControls(viewportRef);
  const isCameraMoving = useCameraMotion(camera ?? { x: 0, y: 0, zoom: 1 });
  useKeyboardShortcuts();

  // Only used while a widget is maximised, but the canvas has to re-measure when
  // the window changes size.
  const [, redraw] = useState(0);
  useEffect(() => {
    const onResize = () => redraw((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!camera) return null;

  // A widget dragged out of the sidebar palette lands where it was let go, so the
  // pointer has to be read in world units.
  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(WIDGET_DRAG_TYPE);
    const box = viewportRef.current?.getBoundingClientRect();
    if (!raw || !box) return;
    e.preventDefault();
    const { type, data } = JSON.parse(raw) as WidgetDragPayload;
    const at = screenToWorld(camera, { x: e.clientX - box.left, y: e.clientY - box.top });
    useSpaceStore.getState().addWidget(type, data, at);
  };

  // The rect that covers the visible canvas, minus the strip the floating chrome
  // sits in — otherwise the sidebar toggle and the focus pill land on the
  // maximised widget's own toolbar. Handing this to a widget blows it up in place,
  // with no reparenting, so a browser widget keeps its page.
  //
  // Its origin is in world units (it lives in the scaled container) but its size
  // is in screen pixels, undone by `scale` on the frame itself: a maximised
  // widget has to be 1:1 with the screen, or its header and buttons shrink with
  // the camera until "Restore" is too small to find.
  const area = canvasArea();
  const fullRect = {
    x: camera.x,
    y: camera.y + area.y / camera.zoom,
    width: area.width,
    height: area.height,
    scale: 1 / camera.zoom,
  };

  return (
    // Inset by the sidebar so widgets never slide underneath it and become
    // unreachable. The world container's origin is this element's top-left.
    <div
      ref={viewportRef}
      className="absolute top-0 bottom-0 right-0 overflow-hidden transition-[left] duration-300"
      style={{
        left: isSidebarOpen ? SIDEBAR_WIDTH : 0,
        cursor: isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default',
      }}
      onDragOver={(e) => {
        // Only palette drags: a file dropped on a widget is that widget's business.
        if (!e.dataTransfer.types.includes(WIDGET_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={onDrop}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`,
          // Only while moving: a permanently promoted layer never repaints, so
          // zooming in scales a bitmap of the text rather than redrawing it.
          willChange: isCameraMoving ? 'transform' : 'auto',
        }}
      >
        {ids.map((id) => (
          <WidgetFrame key={id} id={id} fullRect={id === maximizedId ? fullRect : undefined} />
        ))}
      </div>
    </div>
  );
};
