import React, { useEffect, useRef, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { WIDGET_DRAG_TYPE, WidgetDragPayload } from '../app/WidgetPalette';
import { useSpaceStore } from '../stores/spaceStore';
import { canvasArea, SIDEBAR_WIDTH, useUiStore } from '../stores/uiStore';
import { screenToWorld } from './camera';
import { addDroppedContent, addDroppedFiles, SUPPORTED_DROPS } from './fileDrop';
import { useCameraControls } from './useCameraControls';
import { useCameraMotion } from './useCameraMotion';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { WidgetFrame } from './WidgetFrame';

/** What a drag from outside the app can carry that the canvas knows what to do with. */
const CONTENT_TYPES = ['text/uri-list', 'text/html', 'text/plain'];

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
  // Rubber band in screen pixels, live only while dragging the background.
  // `additive` is a ⇧-drag: what it touches joins the selection instead of
  // replacing it.
  const [marquee, setMarquee] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    additive: boolean;
  } | null>(null);
  /** Files dropped that the app has no way to show. */
  const [refused, setRefused] = useState<string[] | null>(null);
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
    const box = viewportRef.current?.getBoundingClientRect();
    if (!box) return;
    const at = screenToWorld(camera, { x: e.clientX - box.left, y: e.clientY - box.top });

    const raw = e.dataTransfer.getData(WIDGET_DRAG_TYPE);
    if (raw) {
      e.preventDefault();
      const { type, data } = JSON.parse(raw) as WidgetDragPayload;
      useSpaceStore.getState().addWidget(type, data, at);
      return;
    }

    // Files from the Finder. The list has to be copied out now: the transfer is
    // emptied as soon as this handler returns, and the first file is read async.
    const files = [...e.dataTransfer.files];
    if (files.length > 0) {
      e.preventDefault();
      void addDroppedFiles(files, at).then((rejected) => {
        setRefused(rejected.length ? rejected : null);
      });
      return;
    }

    // A picture, a link or a passage of text dragged out of a page (D-081). The
    // same reading has to happen now, for the same reason.
    const content = new DataTransfer();
    for (const type of CONTENT_TYPES) {
      const value = e.dataTransfer.getData(type);
      if (value) content.setData(type, value);
    }
    if (content.types.length === 0) return;
    e.preventDefault();
    void addDroppedContent(content, at);
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

  const pointIn = (e: React.PointerEvent) => {
    const box = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  // Dragging bare canvas draws a band and picks up everything it touches; a plain
  // click on bare canvas is a band of no size, which drops the selection. ⇧ adds
  // to the selection and can start over a widget, where a plain drag moves it.
  const onPointerDown = (e: React.PointerEvent) => {
    // Space-drag is a pan; it must not drop the selection on the way past.
    if (e.button !== 0 || isSpaceHeld) return;
    // ⇧ bands from anywhere, widgets included: the frames let the event through.
    if (!e.shiftKey && e.target !== e.currentTarget) return;
    const point = pointIn(e);
    setMarquee({ x0: point.x, y0: point.y, x1: point.x, y1: point.y, additive: e.shiftKey });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Double-clicking bare canvas opens the palette right there, so adding a widget
  // no longer means a round trip to the sidebar (D-063).
  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const box = viewportRef.current!.getBoundingClientRect();
    const local = { x: e.clientX - box.left, y: e.clientY - box.top };
    useUiStore
      .getState()
      .openQuickAdd({ x: e.clientX, y: e.clientY }, screenToWorld(camera, local));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!marquee) return;
    // Same reason as the widget frame's: a release this element never saw would
    // otherwise leave the band being drawn by a bare hover.
    if (e.buttons === 0) {
      setMarquee(null);
      return;
    }
    const point = pointIn(e);
    setMarquee({ ...marquee, x1: point.x, y1: point.y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!marquee) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setMarquee(null);

    const a = screenToWorld(camera, { x: marquee.x0, y: marquee.y0 });
    const b = screenToWorld(camera, { x: marquee.x1, y: marquee.y1 });
    const band = {
      left: Math.min(a.x, b.x),
      right: Math.max(a.x, b.x),
      top: Math.min(a.y, b.y),
      bottom: Math.max(a.y, b.y),
    };
    const widgets = useSpaceStore.getState().spaces[useSpaceStore.getState().activeSpaceId].widgets;
    const hits = Object.values(widgets)
      .filter(
        (w) =>
          w.x < band.right &&
          w.x + w.width > band.left &&
          w.y < band.bottom &&
          w.y + w.height > band.top
      )
      .map((w) => w.id);
    const ui = useUiStore.getState();
    ui.setSelection(marquee.additive ? [...new Set([...ui.selectedIds, ...hits])] : hits);
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
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={() => setMarquee(null)}
      onDragOver={(e) => {
        // Palette drags and files. A file dropped on a widget is that widget's
        // business — this only fires for what lands on the canvas itself.
        const { types } = e.dataTransfer;
        const takeable =
          types.includes(WIDGET_DRAG_TYPE) ||
          types.includes('Files') ||
          CONTENT_TYPES.some((type) => types.includes(type));
        if (!takeable) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={onDrop}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`,
          // Marks that must stay the same size on screen divide by this — the
          // container transform shrinks everything inside it, and a 3px ring at
          // 40% zoom is a hairline. Set here so widgets do not each have to
          // subscribe to the camera.
          ['--zoom' as string]: camera.zoom,
          // Only while moving: a permanently promoted layer never repaints, so
          // zooming in scales a bitmap of the text rather than redrawing it.
          willChange: isCameraMoving ? 'transform' : 'auto',
        }}
      >
        {ids.map((id) => (
          <WidgetFrame key={id} id={id} fullRect={id === maximizedId ? fullRect : undefined} />
        ))}
      </div>

      {marquee && (
        <div
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
            border: '1px solid var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
          }}
        />
      )}

      {/* A dropped file that goes nowhere looks like a bug, so this says what
          happened where the eye already is — the middle of the canvas, not a
          strip along the bottom that gets missed. */}
      {refused && (
        <div
          onClick={() => setRefused(null)}
          className="glass-panel absolute left-1/2 top-1/2 z-[94] w-[26rem] max-w-[80%] -translate-x-1/2 -translate-y-1/2 p-5 rounded-2xl shadow-2xl text-center cursor-default"
        >
          <FileQuestion size={26} className="t-faint mx-auto mb-3" />
          <p className="t-ink text-sm font-medium mb-1">Not supported yet</p>
          <p className="t-faint text-xs leading-relaxed break-all">
            {refused.length === 1 ? refused[0] : `${refused.length} files`}
          </p>
          <p className="t-faint mt-3 text-[11px] leading-relaxed">
            Focus Desk can show {SUPPORTED_DROPS}.
            <br />
            Word, Excel, PowerPoint and Keynote are not in yet.
          </p>
          <button
            onClick={() => setRefused(null)}
            className="chrome-button-on mt-4 px-4 py-1.5 rounded-lg text-xs font-medium"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};
