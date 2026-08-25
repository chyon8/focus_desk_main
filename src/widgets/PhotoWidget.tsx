import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { PhotoData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/** Same feel as the canvas pinch. */
const ZOOM_SENSITIVITY = 0.01;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * How far off centre the picture may sit, per axis, before its edge would show.
 *
 * The <img> always fills the frame, but `object-contain` paints inside it at the
 * picture's own shape — so the axis that fits with room to spare has nothing to
 * pan along, however far it is zoomed in.
 */
function panLimits(img: HTMLImageElement | null, frame: DOMRect | undefined, zoom: number) {
  if (!img?.naturalWidth || !frame?.width) return { x: 0, y: 0 };
  const fit = Math.min(frame.width / img.naturalWidth, frame.height / img.naturalHeight);
  const painted = { x: img.naturalWidth * fit * zoom, y: img.naturalHeight * fit * zoom };
  return {
    x: Math.max(0, painted.x - frame.width) / 2 / (zoom * frame.width),
    y: Math.max(0, painted.y - frame.height) / 2 / (zoom * frame.height),
  };
}

export const PhotoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<PhotoData>(id);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement>(null);

  const zoom = data.zoom ?? 1;
  const panX = data.panX ?? 0;
  const panY = data.panY ?? 0;

  // Images are copied into the app's own folder and referenced by URL, so a
  // space document never carries megabytes of base64.
  const store = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) update({ url, zoom: 1, panX: 0, panY: 0 });
  };

  // Pinch on the trackpad zooms the picture inside its frame; the widget keeps
  // the size it was given. A native listener, because it has to stop the event
  // reaching the canvas — which would otherwise zoom the whole space instead.
  useEffect(() => {
    const el = frame.current;
    if (!el || !data.url) return;

    const onWheel = (e: WheelEvent) => {
      // A pinch arrives as a wheel with ctrlKey; a plain two-finger scroll is
      // left to the canvas, so the space still pans over a photo.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const next = clamp(zoom * Math.exp(-e.deltaY * ZOOM_SENSITIVITY), MIN_ZOOM, MAX_ZOOM);
      const limit = panLimits(picture.current, el.getBoundingClientRect(), next);
      update({
        zoom: next,
        panX: clamp(panX, -limit.x, limit.x),
        panY: clamp(panY, -limit.y, limit.y),
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [data.url, zoom, panX, panY, update]);

  // Dragging a zoomed-in picture moves it under the frame. At 1 there is nothing
  // to move, so the drag stays with the widget and moves that instead.
  const onPointerDown = (e: React.PointerEvent) => {
    const box = frame.current?.getBoundingClientRect();
    if (zoom <= 1 || !box) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const start = { x: e.clientX, y: e.clientY, panX, panY };
    const limit = panLimits(picture.current, box, zoom);

    const onMove = (move: PointerEvent) => {
      update({
        panX: clamp(start.panX + (move.clientX - start.x) / box.width / zoom, -limit.x, limit.x),
        panY: clamp(start.panY + (move.clientY - start.y) / box.height / zoom, -limit.y, limit.y),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="photo-paper h-full w-full flex flex-col p-3"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const file = e.dataTransfer.files[0];
        if (file) void store(file);
      }}
    >
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onDoubleClick={() => update({ zoom: 1, panX: 0, panY: 0 })}
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-sm transition-all"
        style={{
          background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
          boxShadow: isDropTarget ? '0 0 0 2px var(--accent)' : undefined,
          cursor: data.url && zoom > 1 ? 'grab' : undefined,
        }}
      >
        {data.url ? (
          <img
            ref={picture}
            src={data.url}
            alt={data.caption}
            draggable={false}
            // `contain`, not `cover`: the frame is whatever size the widget was
            // dragged to, and cropping the picture to fill it meant a wide photo
            // in a tall widget showed a strip of its middle. The whole picture
            // fits the shape it is given; zoom is how you crop, on purpose.
            className="w-full h-full object-contain"
            style={{
              transform: `scale(${zoom}) translate(${panX * 100}%, ${panY * 100}%)`,
              transformOrigin: 'center',
            }}
          />
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="t-faint hover:opacity-70 flex flex-col items-center gap-2 transition-opacity"
          >
            <ImagePlus size={28} />
            <span className="text-xs">Drop or choose a photo</span>
          </button>
        )}
      </div>

      {/* Polaroid-style caption strip below the image. */}
      <input
        value={data.caption}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder={zoom > 1 ? 'Double-click the photo to reset the zoom' : 'Write a caption'}
        className="field mt-3 mb-1 shrink-0 !bg-transparent text-center text-sm outline-none"
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void store(file);
        }}
      />
    </div>
  );
};
