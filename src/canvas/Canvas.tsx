import React, { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSpaceStore } from '../stores/spaceStore';
import { SIDEBAR_WIDTH, useUiStore } from '../stores/uiStore';
import { useCameraControls } from './useCameraControls';
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
  const { isSpaceHeld, isPanning } = useCameraControls(viewportRef);
  useKeyboardShortcuts();

  if (!camera) return null;

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
    >
      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`,
        }}
      >
        {ids.map((id) => (
          <WidgetFrame key={id} id={id} />
        ))}
      </div>
    </div>
  );
};
